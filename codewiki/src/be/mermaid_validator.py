"""
Mermaid Diagram Validator

Single source of truth for diagram validity: a long-running Mermaid.js 11
parser subprocess (the same stack the viewer uses). No regex / character-counting
heuristics — if ``mermaid.parse`` accepts the diagram, it's valid; if not,
it's not. The two non-parser checks left are categorical product policy:
empty input and forbidden diagram types (which Mermaid renders fine but our
viewer does not).
"""

import atexit
import json
import logging
import re
import shutil
import subprocess
import threading
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Error model — only states the real parser (or product policy) can produce.
# ---------------------------------------------------------------------------


class MermaidErrorType(Enum):
    PARSE_ERROR = "parse_error"                    # Real mermaid.parse failure
    EMPTY_DIAGRAM = "empty_diagram"                # No content at all
    FORBIDDEN_DIAGRAM_TYPE = "forbidden_diagram_type"  # Renders in Mermaid, not in our viewer
    PARSER_UNAVAILABLE = "parser_unavailable"      # Node/script missing


# Diagram types our viewer does not render. Categorical, not heuristic.
FORBIDDEN_DIAGRAM_TYPES: Tuple[str, ...] = (
    "sequenceDiagram",
    "classDiagram",
    "stateDiagram-v2",
    "stateDiagram",
    "erDiagram",
    "pie",
    "gantt",
    "journey",
    "gitGraph",
    "mindmap",
    "timeline",
    "quadrantChart",
    "requirementDiagram",
    "C4Context",
)


@dataclass
class MermaidError:
    error_type: MermaidErrorType
    message: str
    line_number: Optional[int] = None
    line_content: Optional[str] = None
    fix_suggestion: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error_type": self.error_type.value,
            "message": self.message,
            "line_number": self.line_number,
            "line_content": self.line_content,
            "fix_suggestion": self.fix_suggestion,
        }


@dataclass
class MermaidValidationResult:
    valid: bool
    errors: List[MermaidError] = field(default_factory=list)
    warnings: List[MermaidError] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "valid": self.valid,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "errors": [e.to_dict() for e in self.errors],
            "warnings": [w.to_dict() for w in self.warnings],
        }


# ---------------------------------------------------------------------------
# Long-running Mermaid.js parser subprocess
# ---------------------------------------------------------------------------


def _resolve_batch_script() -> Optional[Path]:
    """Locate ``scripts/parse_mermaid_batch.mjs`` next to the codewiki checkout."""
    here = Path(__file__).resolve()
    for i in range(min(8, len(here.parents))):
        cand = here.parents[i] / "scripts" / "parse_mermaid_batch.mjs"
        if cand.is_file():
            return cand
    return None


class MermaidJsParser:
    """Long-running Mermaid.js 11 parser subprocess (NDJSON over stdin/stdout).

    Same Mermaid 11.9.0 + happy-dom stack that the viewer uses, so ``parse()``
    is the only check that can ever disagree with what users actually see.
    Thread-safe — concurrent callers serialize on a single lock around the pipe.
    """

    def __init__(self) -> None:
        if not shutil.which("node"):
            raise RuntimeError(
                "Node.js is not on PATH; the Mermaid validator needs `node` to run mermaid.parse."
            )
        script = _resolve_batch_script()
        if not script:
            raise RuntimeError(
                "scripts/parse_mermaid_batch.mjs not found; cannot start the Mermaid.js parser."
            )
        self._script = script
        self._lock = threading.Lock()
        # ``stderr=DEVNULL`` so the subprocess never hands a pipe back to the
        # host — keeps Mermaid's noisy boot warnings out of pytest capture
        # and avoids dangling fds when the parent exits.
        self._proc: Optional[subprocess.Popen] = subprocess.Popen(
            ["node", str(self._script)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            bufsize=0,
            cwd=str(script.parent.parent),
        )
        ok, err = self.parse("__probe__", "flowchart TD\n    a-->b\n")
        if not ok:
            self._shutdown()
            raise RuntimeError(f"Mermaid.js probe parse failed: {err}")

    def _shutdown(self) -> None:
        proc = self._proc
        self._proc = None
        if proc is None:
            return
        try:
            if proc.stdin:
                proc.stdin.close()
        except Exception:
            pass
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
            try:
                proc.wait(timeout=5)
            except Exception:
                pass

    def __enter__(self) -> "MermaidJsParser":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self._shutdown()
        return None  # do not suppress exceptions

    def parse(self, diagram_id: str, diagram: str) -> Tuple[bool, Optional[str]]:
        """Return ``(True, None)`` on success, ``(False, error_message)`` on parse failure."""
        with self._lock:
            proc = self._proc
            if proc is None or proc.stdin is None or proc.stdout is None:
                raise RuntimeError("Mermaid parser subprocess is not running")
            payload = json.dumps({"id": diagram_id, "diagram": diagram}, ensure_ascii=False) + "\n"
            try:
                proc.stdin.write(payload.encode("utf-8"))
                proc.stdin.flush()
            except BrokenPipeError as e:
                raise RuntimeError("Mermaid parser stdin broken (process dead?)") from e

            line = proc.stdout.readline()
            if not line:
                raise RuntimeError("Mermaid parser returned no stdout (process exited?)")
            try:
                data = json.loads(line.decode("utf-8", errors="replace"))
            except json.JSONDecodeError as e:
                raise RuntimeError(f"Bad JSON from mermaid parser: {line[:400]!r}") from e
            if data.get("ok"):
                return True, None
            return False, data.get("error") or "parse failed"


# ---------------------------------------------------------------------------
# Shared parser singleton — survives until process exit.
# ---------------------------------------------------------------------------

_shared_parser: Optional[MermaidJsParser] = None
_shared_parser_error: Optional[Exception] = None
_shared_parser_lock = threading.Lock()


def get_shared_parser() -> MermaidJsParser:
    """Return the lazily-initialized module-level Mermaid.js parser.

    Raises ``RuntimeError`` if Node or the batch script is unavailable; the
    failure is cached so subsequent calls don't re-attempt the spawn.
    """
    global _shared_parser, _shared_parser_error
    if _shared_parser is not None:
        return _shared_parser
    if _shared_parser_error is not None:
        raise _shared_parser_error
    with _shared_parser_lock:
        if _shared_parser is not None:
            return _shared_parser
        if _shared_parser_error is not None:
            raise _shared_parser_error
        try:
            _shared_parser = MermaidJsParser()
        except RuntimeError as e:
            _shared_parser_error = e
            raise
    return _shared_parser


def shutdown_shared_parser() -> None:
    """Tear down the shared parser (mostly for tests / explicit cleanup)."""
    global _shared_parser, _shared_parser_error
    with _shared_parser_lock:
        if _shared_parser is not None:
            try:
                _shared_parser._shutdown()
            except Exception:
                pass
        _shared_parser = None
        _shared_parser_error = None


# Always reap the Node subprocess at interpreter exit so test runners and
# short-lived CLIs don't leave orphans hanging around.
atexit.register(shutdown_shared_parser)


# ---------------------------------------------------------------------------
# Public validation API — backed by the real parser only.
# ---------------------------------------------------------------------------


def _first_content_line(diagram: str) -> str:
    for line in diagram.splitlines():
        s = line.strip()
        if s and not s.startswith("%%"):
            return s
    return ""


def validate_mermaid(diagram: str, source_info: str = "") -> MermaidValidationResult:
    """Validate a single Mermaid diagram body using the real Mermaid.js 11 parser.

    The only non-parser checks are policy:
      * empty input → ``EMPTY_DIAGRAM``;
      * forbidden diagram types (``classDiagram``, ``sequenceDiagram``, …) →
        ``FORBIDDEN_DIAGRAM_TYPE`` warning. Mermaid renders these, but our viewer
        does not, so we report them even when ``mermaid.parse`` is happy.

    Everything else flows through ``mermaid.parse`` — the histogram only ever
    contains states the real parser produced.
    """
    result = MermaidValidationResult(valid=True)

    if not diagram or not diagram.strip():
        result.valid = False
        result.errors.append(MermaidError(
            error_type=MermaidErrorType.EMPTY_DIAGRAM,
            message="Empty diagram",
        ))
        return result

    first = _first_content_line(diagram)
    for ftype in FORBIDDEN_DIAGRAM_TYPES:
        if first.startswith(ftype):
            result.warnings.append(MermaidError(
                error_type=MermaidErrorType.FORBIDDEN_DIAGRAM_TYPE,
                message=(
                    f"Diagram type '{ftype}' is not rendered by the viewer "
                    "(use 'graph' or 'flowchart')"
                ),
                line_number=1,
                line_content=first[:80],
            ))
            break

    try:
        parser = get_shared_parser()
    except RuntimeError as e:
        result.valid = False
        result.errors.append(MermaidError(
            error_type=MermaidErrorType.PARSER_UNAVAILABLE,
            message=str(e),
        ))
        return result

    try:
        ok, err = parser.parse(source_info or "validate_mermaid", diagram)
    except RuntimeError as e:
        result.valid = False
        result.errors.append(MermaidError(
            error_type=MermaidErrorType.PARSER_UNAVAILABLE,
            message=str(e),
        ))
        return result

    if not ok:
        msg = (err or "mermaid.parse failed").strip()
        line_no: Optional[int] = None
        m = re.search(r"line\s+(\d+)", msg)
        if m:
            try:
                line_no = int(m.group(1))
            except ValueError:
                line_no = None
        result.valid = False
        result.errors.append(MermaidError(
            error_type=MermaidErrorType.PARSE_ERROR,
            message=msg,
            line_number=line_no,
        ))
    return result


def validate_markdown_mermaid(markdown: str, source_file: str = "") -> List[MermaidValidationResult]:
    """Validate every ```mermaid block in a markdown document."""
    results: List[MermaidValidationResult] = []
    pattern = re.compile(r"```mermaid\s*([\s\S]*?)```", re.IGNORECASE)
    for i, match in enumerate(pattern.finditer(markdown)):
        diagram = match.group(1).strip()
        results.append(validate_mermaid(diagram, f"{source_file}:diagram_{i+1}"))
    return results


def validate_module_tree_diagrams(tree_path: Path) -> Dict[str, MermaidValidationResult]:
    """Validate every Mermaid diagram embedded in a ``module_tree.json``."""
    results: Dict[str, MermaidValidationResult] = {}
    if not tree_path.exists():
        return results
    try:
        with open(tree_path) as f:
            tree = json.load(f)
    except json.JSONDecodeError as e:
        results["_parse_error"] = MermaidValidationResult(
            valid=False,
            errors=[MermaidError(
                error_type=MermaidErrorType.PARSE_ERROR,
                message=f"module_tree.json JSON parse error: {e}",
            )],
        )
        return results

    def walk(node_dict: Dict[str, Any], path: str = "") -> None:
        for name, node in node_dict.items():
            current_path = f"{path}/{name}" if path else name
            diagram = node.get("diagram") if isinstance(node, dict) else None
            if isinstance(diagram, dict) and "mermaid" in diagram:
                vr = validate_mermaid(diagram["mermaid"], current_path)
                if not vr.valid or vr.warnings:
                    results[current_path] = vr
            elif isinstance(diagram, str):
                vr = validate_mermaid(diagram, current_path)
                if not vr.valid or vr.warnings:
                    results[current_path] = vr
            children = node.get("children") if isinstance(node, dict) else None
            if isinstance(children, dict):
                walk(children, current_path)

    walk(tree)
    return results


def validate_docs_directory(docs_path: Path) -> Dict[str, Any]:
    """Validate every Mermaid diagram in a docs directory (tree + .md files)."""
    report: Dict[str, Any] = {
        "docs_path": str(docs_path),
        "total_diagrams": 0,
        "valid_diagrams": 0,
        "invalid_diagrams": 0,
        "total_errors": 0,
        "total_warnings": 0,
        "errors_by_type": {},
        "issues": [],
    }

    def absorb(source: str, vr: MermaidValidationResult) -> None:
        report["total_diagrams"] += 1
        if vr.valid:
            report["valid_diagrams"] += 1
        else:
            report["invalid_diagrams"] += 1
        for e in vr.errors:
            report["total_errors"] += 1
            t = e.error_type.value
            report["errors_by_type"][t] = report["errors_by_type"].get(t, 0) + 1
            report["issues"].append({"source": source, "severity": "error", **e.to_dict()})
        for w in vr.warnings:
            report["total_warnings"] += 1
            report["issues"].append({"source": source, "severity": "warning", **w.to_dict()})

    for path, vr in validate_module_tree_diagrams(docs_path / "module_tree.json").items():
        absorb(f"module_tree:{path}", vr)

    for md_file in docs_path.glob("*.md"):
        try:
            content = md_file.read_text()
        except Exception as e:
            report["issues"].append({
                "source": str(md_file),
                "severity": "error",
                "error_type": "file_read_error",
                "message": str(e),
            })
            continue
        for i, vr in enumerate(validate_markdown_mermaid(content, md_file.name)):
            absorb(f"{md_file.name}:diagram_{i+1}", vr)

    return report


# ---------------------------------------------------------------------------
# CLI: validate a docs directory.
# ---------------------------------------------------------------------------


if __name__ == "__main__":
    import sys

    logging.basicConfig(level=logging.INFO)

    if len(sys.argv) < 2:
        print("Usage: python mermaid_validator.py <docs_dir>")
        sys.exit(1)

    docs_path = Path(sys.argv[1])
    if not docs_path.exists():
        print(f"Error: Path not found: {docs_path}")
        sys.exit(1)

    report = validate_docs_directory(docs_path)

    print("\n" + "=" * 70)
    print("           MERMAID DIAGRAM VALIDATION REPORT (Mermaid.js 11.9)")
    print("=" * 70)
    print(f"Docs path: {report['docs_path']}")
    print(f"\nDiagrams checked: {report['total_diagrams']}")
    print(f"  Valid:   {report['valid_diagrams']}")
    print(f"  Invalid: {report['invalid_diagrams']}")
    print(f"\nErrors:   {report['total_errors']}")
    print(f"Warnings: {report['total_warnings']}")

    if report["errors_by_type"]:
        print("\nErrors by type:")
        for t, c in sorted(report["errors_by_type"].items(), key=lambda x: -x[1]):
            print(f"  {t}: {c}")

    if report["issues"]:
        print("\nIssues (first 20):")
        for issue in report["issues"][:20]:
            marker = "ERR " if issue["severity"] == "error" else "WARN"
            print(f"  [{marker}] [{issue['source']}] {issue.get('error_type', 'unknown')}")
            print(f"        {issue.get('message', '')}")
            if issue.get("line_number"):
                print(f"        line {issue['line_number']}")

    shutdown_shared_parser()
    sys.exit(1 if report["total_errors"] > 0 else 0)
