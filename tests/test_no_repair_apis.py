"""
Fail if removed diagram-repair APIs reappear, and enforce fresh minirepo gate evidence
when gated Codewiki sources change.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent

FORBIDDEN = [
    r"\brepair_diagram_ir\b",
    r"\bapply_diagram_ir_repairs\b",
    r"\bapply_diagram_ir_repairs_to_docs_dir\b",
    r"\b_write_diagram_json_back_to_md\b",
    r"\bensure_external_node\b",
    r"\brepairDiagramIR\b",
    r"\bpipeline-ir-repair\b",
]

SKIP_SCAN_DIRS = {"node_modules", ".git", "__pycache__", ".venv", "venv", "docs"}


def _iter_scan_files() -> list[Path]:
    out: list[Path] = []
    for base in (ROOT / "codewiki", ROOT / "demo"):
        if not base.is_dir():
            continue
        for p in base.rglob("*"):
            if not p.is_file():
                continue
            if any(part in SKIP_SCAN_DIRS for part in p.parts):
                continue
            if p.suffix not in {".py", ".js", ".html"}:
                continue
            out.append(p)
    return out


def test_no_forbidden_repair_symbols_in_source() -> None:
    offenders: list[str] = []
    for path in _iter_scan_files():
        text = path.read_text(encoding="utf-8", errors="replace")
        for pat in FORBIDDEN:
            if re.search(pat, text):
                offenders.append(f"{path.relative_to(ROOT)}: matches {pat}")
                break
    assert not offenders, "Forbidden repair-style APIs/strings:\n" + "\n".join(offenders[:50])


@pytest.mark.generation_gate
def test_gated_sources_have_fresh_minirepo_evidence() -> None:
    gated_sources = [
        ROOT / "codewiki" / "src" / "be" / "documentation_generator.py",
        ROOT / "codewiki" / "src" / "be" / "doc_file_sync.py",
        ROOT / "codewiki" / "src" / "be" / "prompt_template.py",
        ROOT / "codewiki" / "src" / "be" / "diagram_ir_validator.py",
        ROOT / "codewiki" / "src" / "be" / "agent_orchestrator.py",
    ]
    existing = [p for p in gated_sources if p.is_file()]
    assert existing, "GATED_SOURCES resolved empty"
    max_src_mtime = max(p.stat().st_mtime for p in existing)

    evidence_dir = ROOT / "tests" / "_evidence"
    logs = sorted(
        evidence_dir.glob("minirepo_*.log"),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    assert logs, (
        "No tests/_evidence/minirepo_*.log — run scripts/verify_generation.sh tests/fixtures/minirepo"
    )
    newest = logs[0]
    assert newest.stat().st_mtime >= max_src_mtime - 1.0, (
        f"{newest.name} is older than gated sources; re-run the minirepo gate after edits.\n"
        f"  newest log mtime={newest.stat().st_mtime}\n"
        f"  max gated mtime={max_src_mtime}"
    )
