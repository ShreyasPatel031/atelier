"""
Documentation File Sync Module
Agent 3 (Reliability) — Ensures all modules in ``module_tree.json`` have corresponding doc files

This module provides post-processing to fix the common issue where modules are
added to module_tree.json but no ``{module}.json`` file is generated. This happens because:
1. The LLM adds modules to the tree via generate_sub_module_documentation
2. But the sub-agent for small modules sometimes doesn't create the file

IMPORTANT: This module does NOT silently fix issues. It:
1. LOGS all issues found with ERROR level
2. MARKS auto-generated content with "_auto_generated" flag (when placeholders enabled)
3. CREATES a sync_issues.json report for later analysis
4. Optionally creates placeholder files when CODEWIKI_SYNC_ALLOW_PLACEHOLDER_MD=1 (default: off)

Pipeline philosophy (Stage 3 → Stage 4 catch → prompt → tests): see
``codewiki/docs/generation-quality-pipeline.md``.

Usage:
    from codewiki.src.be.doc_file_sync import sync_docs_with_tree, get_sync_report
    
    # After documentation generation
    result = run_full_sync(docs_dir)
    
    # Get detailed issue report
    issues = get_sync_report(docs_dir)
"""

import json
import logging
import os
import re
import time
from collections import Counter
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
from datetime import datetime
from dataclasses import dataclass, field, asdict
from enum import Enum

from codewiki.src.be.diagram_ir_validator import MODULE_TREE_OVERVIEW_KEY, drop_invalid_diagram_edges
from codewiki.src.config import OVERVIEW_FILENAME, module_doc_path
from codewiki.src.be.doc_schema import validate_module_doc

logger = logging.getLogger(__name__)

# Written by generate_minimal_module_doc_dict() when Stage 3 did not produce real docs for a tree leaf.
AUTO_GENERATED_PLACEHOLDER_MARKER = "AUTO_GENERATED_PLACEHOLDER"

# Default off: missing module doc files are reported only (no synthetic placeholder pages).
ALLOW_SYNC_PLACEHOLDER_MD = os.environ.get(
    "CODEWIKI_SYNC_ALLOW_PLACEHOLDER_MD", ""
).strip().lower() in ("1", "true", "yes")


class IssueType(Enum):
    """Types of sync issues found."""
    # File/structure issues
    MISSING_MD_FILE = "missing_md_file"
    MISSING_TITLE = "missing_title"
    MISSING_DESCRIPTION = "missing_description"
    MISSING_DIAGRAM = "missing_diagram"
    MISSING_OVERVIEW = "missing_overview"
    
    # JSON/parsing errors
    JSON_PARSE_ERROR = "json_parse_error"
    
    # LLM generation errors (from generation_tracker)
    LLM_RATE_LIMIT = "llm_rate_limit"
    LLM_CONTEXT_EXCEEDED = "llm_context_exceeded"
    LLM_TIMEOUT = "llm_timeout"
    LLM_API_ERROR = "llm_api_error"

    # Diagram IR (R2/R4) — values match issue_type prefix diagram_ir_<code>
    DIAGRAM_IR_G3_LIFT_INLINE_NODE = "diagram_ir_g3_lift_inline_node"
    DIAGRAM_IR_G3_DROP_NON_STRING_MEMBER = "diagram_ir_g3_drop_non_string_member"
    DIAGRAM_IR_G3_DROP_UNKNOWN_MEMBER = "diagram_ir_g3_drop_unknown_member"
    DIAGRAM_IR_G3_DROPPED_EMPTY_GROUP = "diagram_ir_g3_dropped_empty_group"
    DIAGRAM_IR_G2_INJECTED_EXTERNAL = "diagram_ir_g2_injected_external"
    DIAGRAM_IR_G2_ENDPOINT_IS_GROUP_ID = "diagram_ir_g2_endpoint_is_group_id"
    DIAGRAM_IR_G2_SKIP_EDGE_MISSING_ENDPOINT = "diagram_ir_g2_skip_edge_missing_endpoint"
    DIAGRAM_IR_R4_NODE_ID_COLLIDES_WITH_GROUP = "diagram_ir_r4_node_id_collides_with_group"
    DIAGRAM_IR_R4_SKIP_EDGE_MISSING_ENDPOINT = "diagram_ir_r4_skip_edge_missing_endpoint"
    DIAGRAM_IR_R4_EDGE_UNKNOWN_SOURCE = "diagram_ir_r4_edge_unknown_source"
    DIAGRAM_IR_R4_EDGE_UNKNOWN_TARGET = "diagram_ir_r4_edge_unknown_target"
    DIAGRAM_IR_R4_VALIDATE_FAILED = "diagram_ir_r4_validate_failed"
    DIAGRAM_IR_R4_EDGE_PLACEMENT_VIOLATIONS = "diagram_ir_r4_edge_placement_violations"
    DIAGRAM_IR_OVERVIEW_NO_DIAGRAM_JSON = "diagram_ir_overview_no_diagram_json"
    DIAGRAM_IR_OVERVIEW_MERMAID_PARSE_FAILED = "diagram_ir_overview_mermaid_parse_failed"
    # R1-style codes on overview Mermaid (details carry raw warning/reason)
    DIAGRAM_IR_R1_UNMATCHED_END = "diagram_ir_r1_unmatched_end"
    DIAGRAM_IR_R1_UNCLOSED_SUBGRAPH = "diagram_ir_r1_unclosed_subgraph"
    DIAGRAM_IR_R1_EMPTY_MERMAID = "diagram_ir_r1_empty_mermaid"
    DIAGRAM_IR_R1_TOO_MANY_UNSUPPORTED_LINES = "diagram_ir_r1_too_many_unsupported_lines"
    DIAGRAM_IR_SYNC_DROPPED_EDGES = "diagram_ir_sync_dropped_edges"


@dataclass
class SyncIssue:
    """A single sync issue found."""
    issue_type: str
    module_name: str
    module_path: str  # Full path in tree (e.g., "parent/child/leaf")
    severity: str  # "error" or "warning"
    details: Dict[str, Any] = field(default_factory=dict)
    auto_fixed: bool = False
    
    def to_dict(self):
        return asdict(self)


@dataclass
class SyncReport:
    """Complete sync report for a docs directory."""
    docs_dir: str
    timestamp: str
    total_modules: int = 0
    issues: List[SyncIssue] = field(default_factory=list)
    files_created: List[str] = field(default_factory=list)
    metadata_added: List[str] = field(default_factory=list)
    diagrams_added: List[str] = field(default_factory=list)
    # presync/postsync audits and diagram IR histograms (see run_full_sync)
    metrics: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def error_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "error")
    
    @property
    def warning_count(self) -> int:
        return sum(1 for i in self.issues if i.severity == "warning")
    
    @property
    def missing_files_count(self) -> int:
        return sum(1 for i in self.issues if i.issue_type == IssueType.MISSING_MD_FILE.value)
    
    @property
    def failure_rate(self) -> float:
        """Percentage of modules that failed to generate properly."""
        if self.total_modules == 0:
            return 0.0
        return (self.missing_files_count / self.total_modules) * 100
    
    @property
    def success_rate(self) -> float:
        """Percentage of modules that generated properly."""
        return 100.0 - self.failure_rate
    
    def add_issue(self, issue: SyncIssue):
        self.issues.append(issue)
        # Log immediately
        log_fn = logger.error if issue.severity == "error" else logger.warning
        log_fn(f"[SYNC_ISSUE] {issue.issue_type}: {issue.module_name} at {issue.module_path}")
        if issue.details:
            log_fn(f"[SYNC_ISSUE]   Details: {issue.details}")
    
    def to_dict(self):
        return {
            "docs_dir": self.docs_dir,
            "timestamp": self.timestamp,
            "summary": {
                "total_modules": self.total_modules,
                "missing_files": self.missing_files_count,
                "failure_rate_pct": round(self.failure_rate, 2),
                "success_rate_pct": round(self.success_rate, 2),
                "total_issues": len(self.issues),
                "errors": self.error_count,
                "warnings": self.warning_count,
                "files_created": len(self.files_created),
                "metadata_added": len(self.metadata_added),
                "diagrams_added": len(self.diagrams_added)
            },
            "metrics": self.metrics,
            "issues_by_type": self._group_by_type(),
            "issues": [i.to_dict() for i in self.issues],
            "files_created": self.files_created,
            "metadata_added": self.metadata_added,
            "diagrams_added": self.diagrams_added
        }
    
    def _group_by_type(self) -> Dict[str, int]:
        counts = {}
        for issue in self.issues:
            counts[issue.issue_type] = counts.get(issue.issue_type, 0) + 1
        return counts
    
    def save(self, path: str):
        with open(path, 'w') as f:
            json.dump(self.to_dict(), f, indent=2)
    
    def print_summary(self):
        print("\n" + "="*70)
        print("              DOCUMENTATION SYNC ISSUE REPORT")
        print("="*70)
        print(f"Docs dir: {self.docs_dir}")
        print(f"Timestamp: {self.timestamp}")
        
        # KEY METRICS - Failure Rate
        print(f"\n📊 FAILURE RATE: {self.failure_rate:.1f}% ({self.missing_files_count}/{self.total_modules} modules)")
        print(f"   Success rate: {self.success_rate:.1f}%")
        
        print(f"\nIssues found: {len(self.issues)} ({self.error_count} errors, {self.warning_count} warnings)")
        
        if self.issues:
            print("\nBy type:")
            for issue_type, count in self._group_by_type().items():
                print(f"  {issue_type}: {count}")
            
            print("\nTop issues:")
            for issue in self.issues[:10]:
                marker = "❌" if issue.severity == "error" else "⚠️"
                fixed = " [AUTO-FIXED]" if issue.auto_fixed else ""
                details = ""
                if issue.details.get("component_count") is not None:
                    details = f" (components={issue.details['component_count']}, depth={issue.details.get('depth', '?')})"
                print(f"  {marker} {issue.issue_type}: {issue.module_name}{details}{fixed}")
            
            if len(self.issues) > 10:
                print(f"  ... and {len(self.issues) - 10} more")
        
        print("\nAuto-fixes applied:")
        print(f"  Files created: {len(self.files_created)}")
        print(f"  Metadata added: {len(self.metadata_added)}")
        print(f"  Diagrams added: {len(self.diagrams_added)}")
        print("="*70)


# Global report for current sync
_current_report: Optional[SyncReport] = None

# Historical tracking file
HISTORY_FILE = "generation_history.json"


def load_history(base_dir: str = None) -> List[Dict]:
    """Load historical generation data."""
    if base_dir:
        history_path = Path(base_dir) / HISTORY_FILE
    else:
        history_path = Path(HISTORY_FILE)
    
    if history_path.exists():
        try:
            with open(history_path) as f:
                return json.load(f)
        except:
            return []
    return []


def save_to_history(report: SyncReport, repo_name: str, base_dir: str = None):
    """Save report to historical tracking."""
    history = load_history(base_dir)
    
    entry = {
        "timestamp": report.timestamp,
        "repo": repo_name,
        "total_modules": report.total_modules,
        "missing_files": report.missing_files_count,
        "failure_rate_pct": round(report.failure_rate, 2),
        "success_rate_pct": round(report.success_rate, 2),
        "errors": report.error_count,
        "warnings": report.warning_count,
        "issues_by_type": report._group_by_type()
    }
    
    history.append(entry)
    
    # Keep last 1000 entries
    if len(history) > 1000:
        history = history[-1000:]
    
    if base_dir:
        history_path = Path(base_dir) / HISTORY_FILE
    else:
        history_path = Path(HISTORY_FILE)
    
    with open(history_path, 'w') as f:
        json.dump(history, f, indent=2)
    
    logger.info(f"[DOC_SYNC] Saved to history: {repo_name} - {report.failure_rate:.1f}% failure rate")


def print_historical_summary(base_dir: str = None):
    """Print summary of historical generation data."""
    history = load_history(base_dir)
    
    if not history:
        print("No historical data available.")
        return
    
    print("\n" + "="*80)
    print("                    HISTORICAL GENERATION TRACKING")
    print("="*80)
    
    # Group by repo
    by_repo = {}
    for entry in history:
        repo = entry.get("repo", "unknown")
        if repo not in by_repo:
            by_repo[repo] = []
        by_repo[repo].append(entry)
    
    print(f"\nTotal runs tracked: {len(history)}")
    print(f"Repos tracked: {len(by_repo)}")
    
    # Latest stats per repo
    print(f"\n{'Repo':<20} {'Runs':<8} {'Latest Failure %':<18} {'Trend':<15}")
    print("-"*80)
    
    for repo, runs in sorted(by_repo.items()):
        latest = runs[-1]
        prev = runs[-2] if len(runs) > 1 else None
        
        latest_fail = latest.get("failure_rate_pct", 0)
        
        if prev:
            prev_fail = prev.get("failure_rate_pct", 0)
            if latest_fail < prev_fail:
                trend = f"📈 -{prev_fail - latest_fail:.1f}%"
            elif latest_fail > prev_fail:
                trend = f"📉 +{latest_fail - prev_fail:.1f}%"
            else:
                trend = "→ unchanged"
        else:
            trend = "new"
        
        print(f"{repo:<20} {len(runs):<8} {latest_fail:<18.1f} {trend:<15}")
    
    # Overall trend
    if len(history) >= 2:
        recent = history[-10:]  # Last 10 runs
        older = history[-20:-10] if len(history) >= 20 else history[:len(history)//2]
        
        if recent and older:
            recent_avg = sum(r.get("failure_rate_pct", 0) for r in recent) / len(recent)
            older_avg = sum(r.get("failure_rate_pct", 0) for r in older) / len(older)
            
            print(f"\nOverall trend:")
            print(f"  Recent avg failure rate: {recent_avg:.1f}%")
            print(f"  Previous avg failure rate: {older_avg:.1f}%")
            
            if recent_avg < older_avg:
                print(f"  📈 IMPROVING by {older_avg - recent_avg:.1f}%")
            elif recent_avg > older_avg:
                print(f"  📉 REGRESSING by {recent_avg - older_avg:.1f}%")
            else:
                print(f"  → No change")
    
    print("="*80)


def get_all_modules_in_tree(tree: Dict[str, Any], path: str = "") -> List[Tuple[str, str, Dict]]:
    """
    Recursively get all module names from the tree.
    
    Returns:
        List of (module_name, path, module_data) tuples
    """
    modules = []
    
    for name, data in tree.items():
        current_path = f"{path}/{name}" if path else name
        modules.append((name, current_path, data))
        
        if data.get("children"):
            modules.extend(get_all_modules_in_tree(data["children"], current_path))
    
    return modules


def _module_json_skip_stems() -> Set[str]:
    """Infrastructure JSON stems — not per-module documentation."""
    return {
        "module_tree",
        "first_module_tree",
        "metadata",
        "entry_points",
        "generation_report",
        "generation_metrics",
        "viewer_epoch",
        "sync_issues",
        "overview",
    }


def _tree_module_names(tree: Dict[str, Any]) -> Set[str]:
    return {
        name
        for name, _path, _data in get_all_modules_in_tree(tree)
        if name != "overview"
    }


def _repair_agent_json_literal_n_newlines(text: str) -> str:
    """
    Repair agent-written JSON where newlines were written as literal `,n` between values.

    Example: `"},n            {"id"` → `"},\\n            {"id"`.
  """
    if ",n" not in text:
        return text
    return re.sub(r"\},n\s+", "},\n            ", text)


def _check_module_json_file(
    json_path: Path, *, try_repair: bool = False
) -> Tuple[bool, Optional[str], bool]:
    """Return (parse_ok, error_message, repaired_file_written)."""
    if not json_path.is_file():
        return False, None, False
    raw = json_path.read_text(encoding="utf-8", errors="replace")
    try:
        json.loads(raw)
        return True, None, False
    except json.JSONDecodeError as first_err:
        repaired = _repair_agent_json_literal_n_newlines(raw)
        if repaired != raw:
            try:
                json.loads(repaired)
                if try_repair:
                    json_path.write_text(repaired, encoding="utf-8")
                    return True, None, True
                return True, None, False
            except json.JSONDecodeError:
                pass
        return False, str(first_err), False


def audit_docs_state(docs_dir: str) -> Dict[str, Any]:
    """
    Read-only audit of docs vs module_tree (Stage 3 output before sync repairs).

    Used to quantify how much Stage 4.5 fixes and what Stage 3 left incomplete.
    """
    docs_path = Path(docs_dir)
    tree_path = docs_path / "module_tree.json"
    out: Dict[str, Any] = {
        "modules_total": 0,
        "missing_md": 0,
        "missing_title": 0,
        "missing_description": 0,
        "leaf_missing_diagram": 0,
        "parent_missing_diagram_with_children": 0,
        "diagram_nodes_with_empty_label": 0,
        "diagram_edges_unknown_endpoint": 0,
        "children_missing_from_diagram_nodes": 0,
        "parent_diagram_gaps_to_inject": 0,
        "mermaid_fence_blocks_total": 0,
        "invalid_module_json_parse": 0,
        # *.md files whose body is the sync fallback (not LLM-written module docs)
        "placeholder_md_files": 0,
    }
    if not tree_path.exists():
        return out
    try:
        with open(tree_path) as f:
            tree = json.load(f)
    except Exception:
        return out

    # Extra *.md files not listed in module_tree (e.g. hand-written notes) are allowed by
    # design; do not count them as audit defects.

    existing_md = {f.stem for f in docs_path.glob("*.md")}

    for module_name, _path, module_data in get_all_modules_in_tree(tree):
        if module_name == "overview":
            continue
        out["modules_total"] += 1
        json_path = docs_path / f"{module_name}.json"
        json_ok, _err, _repaired = _check_module_json_file(json_path)
        if json_path.is_file() and not json_ok:
            out["invalid_module_json_parse"] += 1
        if module_name not in existing_md and not json_ok:
            out["missing_md"] += 1
        if not module_data.get("title"):
            out["missing_title"] += 1
        if not module_data.get("description"):
            out["missing_description"] += 1

        children = module_data.get("children") or {}
        diagram = module_data.get("diagram") or {}
        nodes = diagram.get("nodes") if isinstance(diagram, dict) else []
        edges = diagram.get("edges") if isinstance(diagram, dict) else []

        if not children:
            if not diagram or not nodes:
                out["leaf_missing_diagram"] += 1
        else:
            if not diagram or not nodes:
                out["parent_missing_diagram_with_children"] += 1

        if isinstance(diagram, dict) and nodes:
            node_ids = {n.get("id") for n in nodes if isinstance(n, dict) and n.get("id")}
            for n in nodes:
                if not isinstance(n, dict):
                    continue
                lab = n.get("label")
                if lab is None or (isinstance(lab, str) and not lab.strip()):
                    out["diagram_nodes_with_empty_label"] += 1
            for child_name in children:
                if child_name not in node_ids:
                    out["children_missing_from_diagram_nodes"] += 1
            for e in edges:
                if not isinstance(e, dict):
                    continue
                for key in ("source", "target"):
                    nid = e.get(key)
                    if nid and nid not in node_ids:
                        out["diagram_edges_unknown_endpoint"] += 1

        if children and isinstance(diagram, dict):
            existing_node_ids = {n.get("id") for n in (diagram.get("nodes") or []) if isinstance(n, dict)}
            for child_name in children:
                if child_name not in existing_node_ids:
                    out["parent_diagram_gaps_to_inject"] += 1

    for md_file in docs_path.glob("*.md"):
        try:
            content = md_file.read_text(encoding="utf-8", errors="replace")
        except Exception:
            continue
        if AUTO_GENERATED_PLACEHOLDER_MARKER in content:
            out["placeholder_md_files"] += 1
        out["mermaid_fence_blocks_total"] += len(
            re.findall(r"```mermaid\s*([\s\S]*?)```", content, flags=re.IGNORECASE)
        )

    return out


_MAX_SAMPLES_PER_DIAGRAM_IR_CODE = 50


def _elk_label(parent_id: str, index: int, text: str, w: float, h: float) -> Dict[str, Any]:
    return {
        "id": f"{parent_id}__label_{index}",
        "text": text,
        "width": w,
        "height": h,
    }


def _estimate_leaf_size(label: Any, max_node_width: int = 280) -> Tuple[float, float, str]:
    text = str(label if label is not None else "").strip() or "?"
    w = float(min(max_node_width, max(72, len(text) * 7 + 36)))
    return w, 44.0, text


def _estimate_group_label_size(label: Any) -> Tuple[float, float, str]:
    text = str(label if label is not None else "").strip() or "?"
    w = float(max(120, min(360, len(text) * 7 + 32)))
    return w, 28.0, text


def _map_diagram_direction_to_elk(diagram_direction: Any) -> str:
    d = str(diagram_direction or "TD").upper()
    if d in ("LR", "RL"):
        return "RIGHT" if d == "LR" else "LEFT"
    if d == "BT":
        return "UP"
    return "DOWN"


def _elk_port_edge_spacing_layout_options() -> Dict[str, str]:
    """Unified port + edge lane spacing for ELK layered (matches demo/elk-node-dimensions.js)."""
    sp = max(4, min(48, 16))
    s = str(sp)
    return {
        "elk.spacing.portPort": s,
        "elk.spacing.edgeEdge": s,
        "elk.spacing.edgeNode": s,
        "elk.layered.spacing.edgeEdgeBetweenLayers": s,
        "elk.layered.spacing.edgeNodeBetweenLayers": s,
        "elk.portAlignment.default": "DISTRIBUTED",
    }


def _root_layout_options(elk_direction: str, target: str) -> Dict[str, Any]:
    if target == "elkjs":
        return {
            "elk.algorithm": "layered",
            "elk.direction": elk_direction,
            "elk.hierarchyHandling": "INCLUDE_CHILDREN",
            "elk.spacing.nodeNode": "48",
            "elk.layered.spacing.nodeNodeBetweenLayers": "56",
            "elk.padding": "[top=20,left=20,bottom=20,right=20]",
            **_elk_port_edge_spacing_layout_options(),
        }
    return {"algorithm": "layered", "direction": elk_direction, "hierarchyHandling": "INCLUDE_CHILDREN"}


def _compound_layout_options(target: str) -> Dict[str, Any]:
    if target == "elkjs":
        return {
            "elk.hierarchyHandling": "INCLUDE_CHILDREN",
            "elk.padding": "[top=24,left=14,bottom=14,right=14]",
            "elk.spacing.nodeNode": "28",
            **_elk_port_edge_spacing_layout_options(),
        }
    return {"algorithm": "layered", "direction": "DOWN", "hierarchyHandling": "INCLUDE_CHILDREN"}


def _collect_elk_node_ids(node: Dict[str, Any], out: Set[str]) -> None:
    if not node or node.get("id") is None:
        return
    out.add(str(node["id"]))
    for ch in node.get("children") or []:
        _collect_elk_node_ids(ch, out)


def _collect_all_elk_edges(node: Dict[str, Any], out: List[Any]) -> None:
    if not node:
        return
    for e in node.get("edges") or []:
        out.append(e)
    for ch in node.get("children") or []:
        _collect_all_elk_edges(ch, out)


def _validate_elk_input_identifiers(elk_graph: Dict[str, Any]) -> Dict[str, Any]:
    missing: List[Dict[str, Any]] = []
    if not elk_graph or elk_graph.get("id") is None:
        return {"ok": False, "missingEndpoints": ["root"], "edgeIds": []}
    ids: Set[str] = set()
    _collect_elk_node_ids(elk_graph, ids)
    edges_all: List[Any] = []
    _collect_all_elk_edges(elk_graph, edges_all)
    for e in edges_all:
        if not e:
            continue
        eid = e.get("id")
        for s in e.get("sources") or []:
            if str(s) not in ids:
                missing.append({"edgeId": eid, "role": "source", "id": s})
        for t in e.get("targets") or []:
            if str(t) not in ids:
                missing.append({"edgeId": eid, "role": "target", "id": t})
    return {
        "ok": len(missing) == 0,
        "missingEndpoints": missing,
        "edgeIds": [e.get("id") if e else None for e in edges_all],
    }


def _validate_elk_edge_placement(elk_graph: Dict[str, Any]) -> Dict[str, Any]:
    if not elk_graph or elk_graph.get("id") is None:
        return {"ok": False, "violations": [{"reason": "no_root_id"}]}
    parent_by_id: Dict[str, str] = {}

    def walk(parent_id: Optional[str], node: Dict[str, Any]) -> None:
        if not node or node.get("id") is None:
            return
        nid = str(node["id"])
        if parent_id is not None:
            parent_by_id[nid] = str(parent_id)
        for ch in node.get("children") or []:
            walk(nid, ch)

    walk(None, elk_graph)

    def ancestors_of(iid: str) -> List[str]:
        chain: List[str] = []
        cur: Optional[str] = str(iid)
        seen: Set[str] = set()
        while cur is not None and cur not in seen:
            seen.add(cur)
            chain.append(cur)
            cur = parent_by_id.get(cur)
        return chain

    def lca_of(a: str, b: str) -> Optional[str]:
        a_chain = ancestors_of(a)
        b_set = set(ancestors_of(b))
        for x in a_chain:
            if x in b_set:
                return x
        return None

    violations: List[Dict[str, Any]] = []

    def walk_edges(node: Dict[str, Any]) -> None:
        if not node:
            return
        here_id = str(node["id"]) if node.get("id") is not None else None
        for e in node.get("edges") or []:
            if not e:
                continue
            srcs = e.get("sources") or []
            tgts = e.get("targets") or []
            for s in srcs:
                for t in tgts:
                    lca = lca_of(str(s), str(t))
                    if lca != here_id:
                        violations.append(
                            {
                                "edgeId": e.get("id"),
                                "placedIn": here_id,
                                "expectedLca": lca,
                                "source": s,
                                "target": t,
                            }
                        )
        for ch in node.get("children") or []:
            walk_edges(ch)

    walk_edges(elk_graph)
    return {"ok": len(violations) == 0, "violations": violations}


def diagram_to_elk_input_warnings(
    diagram: Optional[Dict[str, Any]], target: str = "elkjs"
) -> List[Dict[str, Any]]:
    """R4 structural warnings — parity with demo/pipeline-diagram-to-elk.js."""
    warnings: List[Dict[str, Any]] = []
    if not diagram or not isinstance(diagram, dict):
        return warnings

    nodes = diagram.get("nodes") or []
    edges = diagram.get("edges") or []
    groups = diagram.get("groups") or []

    node_by_id: Dict[str, Any] = {}
    for n in nodes:
        if n and n.get("id") is not None:
            node_by_id[str(n["id"])] = n

    parent_of: Dict[str, str] = {}
    for gr in groups:
        if not gr or gr.get("id") is None:
            continue
        gid = str(gr["id"])
        members = gr.get("nodes") or []
        if not isinstance(members, list):
            continue
        for m in members:
            nid = str(m)
            if nid not in parent_of:
                parent_of[nid] = gid

    group_compound_by_id: Dict[str, Dict[str, Any]] = {}
    root_children: List[Dict[str, Any]] = []
    elk_direction = _map_diagram_direction_to_elk(diagram.get("direction"))

    for gg in groups:
        if not gg or gg.get("id") is None:
            continue
        g_id = str(gg["id"])
        g_label = str(gg["label"]) if gg.get("label") is not None else g_id
        lw, lh, ltext = _estimate_group_label_size(g_label)
        member_ids = [str(x) for x in (gg.get("nodes") or [])]
        compound_children: List[Dict[str, Any]] = []
        for mid in member_ids:
            raw = node_by_id.get(mid)
            lab = raw.get("label") if raw and raw.get("label") is not None else mid
            szw, szh, stext = _estimate_leaf_size(lab)
            compound_children.append(
                {
                    "id": mid,
                    "width": szw,
                    "height": szh,
                    "labels": [_elk_label(mid, 0, stext, szw, szh)],
                }
            )
        compound = {
            "id": g_id,
            "width": lw,
            "height": lh,
            "labels": [_elk_label(g_id, 0, ltext, lw, lh)],
            "layoutOptions": _compound_layout_options(target),
            "children": compound_children,
        }
        group_compound_by_id[g_id] = compound
        root_children.append(compound)

    in_any_group = set(parent_of.keys())
    for node in nodes:
        if not node or node.get("id") is None:
            continue
        id_str = str(node["id"])
        if id_str in group_compound_by_id:
            warnings.append({"code": "r4_node_id_collides_with_group", "id": id_str})
            continue
        if id_str in in_any_group:
            continue
        lab2 = node.get("label") if node.get("label") is not None else id_str
        szw, szh, stext = _estimate_leaf_size(lab2)
        root_children.append(
            {
                "id": id_str,
                "width": szw,
                "height": szh,
                "labels": [_elk_label(id_str, 0, stext, szw, szh)],
            }
        )

    root_id = "root"
    elk_graph: Dict[str, Any] = {
        "id": root_id,
        "layoutOptions": _root_layout_options(elk_direction, target),
        "children": root_children,
        "edges": [],
    }

    elk_node_by_id: Dict[str, Any] = {}
    parent_by_elk_id: Dict[str, str] = {}

    def index_elk(parent_id: Optional[str], node: Dict[str, Any]) -> None:
        if not node or node.get("id") is None:
            return
        elk_node_by_id[str(node["id"])] = node
        if parent_id is not None:
            parent_by_elk_id[str(node["id"])] = str(parent_id)
        for ch in node.get("children") or []:
            index_elk(str(node["id"]), ch)

    index_elk(None, elk_graph)

    def ancestors_of_elk(iid: str) -> List[str]:
        chain: List[str] = []
        cur: Optional[str] = str(iid)
        seen: Set[str] = set()
        while cur is not None and cur not in seen:
            seen.add(cur)
            chain.append(cur)
            cur = parent_by_elk_id.get(cur)
        return chain

    def lca_container_id(src_id: str, tgt_id: str) -> str:
        a_chain = ancestors_of_elk(src_id)
        b_set = set(ancestors_of_elk(tgt_id))
        for x in a_chain:
            if x in b_set:
                return x
        return root_id

    for ei, ed in enumerate(edges):
        if not ed or ed.get("source") is None or ed.get("target") is None:
            warnings.append({"code": "r4_skip_edge_missing_endpoint", "index": ei})
            continue
        sid = str(ed["source"])
        tid = str(ed["target"])
        if sid not in elk_node_by_id:
            warnings.append(
                {"code": "r4_edge_unknown_source", "index": ei, "source": sid, "target": tid}
            )
            continue
        if tid not in elk_node_by_id:
            warnings.append(
                {"code": "r4_edge_unknown_target", "index": ei, "source": sid, "target": tid}
            )
            continue
        elk_edge = {"id": f"e_{sid}_{tid}_{ei}", "sources": [sid], "targets": [tid]}
        container_id = lca_container_id(sid, tid)
        container = elk_node_by_id.get(container_id) or elk_graph
        if container.get("edges") is None:
            container["edges"] = []
        container["edges"].append(elk_edge)

    validate = _validate_elk_input_identifiers(elk_graph)
    if not validate["ok"]:
        warnings.append({"code": "r4_validate_failed", "missing": validate["missingEndpoints"]})

    placement = _validate_elk_edge_placement(elk_graph)
    if not placement["ok"]:
        warnings.append({"code": "r4_edge_placement_violations", "violations": placement["violations"]})

    return warnings


def _flatten_diagram_ir_warnings(warnings: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
    by_code: Dict[str, List[Dict[str, Any]]] = {}
    for w in warnings:
        code = str(w.get("code", "unknown"))
        by_code.setdefault(code, []).append(w)
    return by_code


def _merge_samples(
    dest: Dict[str, List[Dict[str, Any]]],
    module_name: str,
    module_path: str,
    by_code_flat: Dict[str, List[Dict[str, Any]]],
) -> None:
    for code, items in by_code_flat.items():
        bucket = dest.setdefault(code, [])
        if len(bucket) >= _MAX_SAMPLES_PER_DIAGRAM_IR_CODE:
            continue
        for it in items:
            if len(bucket) >= _MAX_SAMPLES_PER_DIAGRAM_IR_CODE:
                break
            sample = dict(it)
            sample["module"] = module_name
            sample["path"] = module_path
            bucket.append(sample)


def _sanitize_diagram_in_doc_payload(
    doc: Dict[str, Any],
) -> Optional[Dict[str, Any]]:
    """Return drop stats if diagram edges were removed, else None."""
    diagram = doc.get("diagram")
    if not isinstance(diagram, dict) or not isinstance(diagram.get("nodes"), list):
        return None
    stats = drop_invalid_diagram_edges(diagram)
    if stats.get("dropped", 0) > 0:
        return stats
    return None


def sanitize_module_diagram_edges_in_docs(docs_dir: str, report: SyncReport) -> int:
    """
    Stage 4.5: drop diagram edges with unknown endpoints in module JSON + module_tree.

    Rewrites ``{module}.json`` and syncs repaired diagrams onto tree nodes so IR audit
    sees clean graphs. Returns total edges dropped.
    """
    docs_path = Path(docs_dir)
    tree_path = docs_path / "module_tree.json"
    if not tree_path.is_file():
        return 0

    try:
        tree = json.loads(tree_path.read_text(encoding="utf-8", errors="replace"))
    except Exception as e:
        logger.warning("[DOC_SYNC] sanitize diagrams: could not load module_tree: %s", e)
        return 0

    skip = _module_json_skip_stems()
    total_dropped = 0
    modules_updated = 0
    tree_dirty = False

    for module_name, module_path, module_data in get_all_modules_in_tree(tree):
        if module_name == "overview":
            continue

        stats: Optional[Dict[str, Any]] = None
        json_path = module_doc_path(docs_dir, module_name)
        if json_path.is_file():
            try:
                doc = json.loads(json_path.read_text(encoding="utf-8", errors="replace"))
            except json.JSONDecodeError as e:
                logger.warning("[DOC_SYNC] skip diagram sanitize for %s: %s", module_name, e)
                doc = None
            if isinstance(doc, dict):
                stats = _sanitize_diagram_in_doc_payload(doc)
                if stats:
                    json_path.write_text(
                        json.dumps(doc, indent=2) + "\n", encoding="utf-8"
                    )
                    module_data["diagram"] = doc["diagram"]
                    tree_dirty = True
        elif isinstance(module_data.get("diagram"), dict):
            inline = {"diagram": module_data["diagram"]}
            stats = _sanitize_diagram_in_doc_payload(inline)
            if stats:
                module_data["diagram"] = inline["diagram"]
                tree_dirty = True

        if stats and stats.get("dropped", 0) > 0:
            dropped = int(stats["dropped"])
            total_dropped += dropped
            modules_updated += 1
            report.add_issue(
                SyncIssue(
                    issue_type=IssueType.DIAGRAM_IR_SYNC_DROPPED_EDGES.value,
                    module_name=module_name,
                    module_path=module_path,
                    severity="warning",
                    details={
                        "dropped_edges": dropped,
                        "samples": (stats.get("dropped_edges") or [])[:5],
                    },
                    auto_fixed=True,
                )
            )
            logger.info(
                "[DOC_SYNC] Dropped %s invalid diagram edge(s) in %s",
                dropped,
                module_name,
            )

    overview_path = docs_path / OVERVIEW_FILENAME
    if overview_path.is_file():
        try:
            odoc = json.loads(overview_path.read_text(encoding="utf-8", errors="replace"))
        except json.JSONDecodeError:
            odoc = None
        if isinstance(odoc, dict):
            ostats = _sanitize_diagram_in_doc_payload(odoc)
            if ostats and ostats.get("dropped", 0) > 0:
                overview_path.write_text(
                    json.dumps(odoc, indent=2) + "\n", encoding="utf-8"
                )
                total_dropped += int(ostats["dropped"])
                report.add_issue(
                    SyncIssue(
                        issue_type=IssueType.DIAGRAM_IR_SYNC_DROPPED_EDGES.value,
                        module_name="overview",
                        module_path="overview",
                        severity="warning",
                        details={
                            "dropped_edges": ostats["dropped"],
                            "samples": (ostats.get("dropped_edges") or [])[:5],
                        },
                        auto_fixed=True,
                    )
                )

    if tree_dirty:
        tree_path.write_text(json.dumps(tree, indent=2) + "\n", encoding="utf-8")

    if total_dropped:
        logger.info(
            "[DOC_SYNC] Diagram edge sanitize: %s edge(s) dropped across %s module(s)",
            total_dropped,
            modules_updated,
        )
    return total_dropped


def audit_diagram_ir_state(docs_dir: str) -> Dict[str, Any]:
    """
    Walk module_tree.json diagrams + overview.json (or legacy overview.md); return histograms and capped samples.
    """
    docs_path = Path(docs_dir)
    tree_path = docs_path / "module_tree.json"
    out: Dict[str, Any] = {
        "module_diagrams_total": 0,
        "overview_has_diagram_json": False,
        "overview_mermaid_parse_ok": True,
        "overview_r1_reason": None,
        "by_code": Counter(),
        "samples_by_code": {},
    }
    samples_acc: Dict[str, List[Dict[str, Any]]] = {}

    if tree_path.exists():
        try:
            tree = json.loads(tree_path.read_text(encoding="utf-8", errors="replace"))
        except Exception:
            tree = {}
        if isinstance(tree, dict):
            for module_name, module_path, module_data in get_all_modules_in_tree(tree):
                if module_name == "overview":
                    continue
                raw_d = module_data.get("diagram")
                if not isinstance(raw_d, dict):
                    continue
                if not isinstance(raw_d.get("nodes"), list):
                    continue
                out["module_diagrams_total"] += 1
                r4_w = diagram_to_elk_input_warnings(raw_d, target="elkjs")
                fc = _flatten_diagram_ir_warnings(r4_w)
                for code, lst in fc.items():
                    out["by_code"][code] += len(lst)
                _merge_samples(samples_acc, module_name, module_path, fc)

    overview_json_path = docs_path / OVERVIEW_FILENAME
    if overview_json_path.exists():
        try:
            odata = json.loads(
                overview_json_path.read_text(encoding="utf-8", errors="replace")
            )
        except Exception:
            odata = None
        overview_diagram = odata.get("diagram") if isinstance(odata, dict) else None
        if isinstance(overview_diagram, dict) and isinstance(
            overview_diagram.get("nodes"), list
        ):
            out["overview_has_diagram_json"] = True
            r4_w = diagram_to_elk_input_warnings(overview_diagram, target="elkjs")
            fc = _flatten_diagram_ir_warnings(r4_w)
            for code, lst in fc.items():
                out["by_code"][code] += len(lst)
            _merge_samples(samples_acc, "overview", "overview", fc)

    out["by_code"] = dict(out["by_code"])
    for k in list(samples_acc.keys()):
        samples_acc[k] = samples_acc[k][: _MAX_SAMPLES_PER_DIAGRAM_IR_CODE]
    out["samples_by_code"] = samples_acc
    return out


def _emit_diagram_ir_sync_issues(report: SyncReport, ir_audit: Dict[str, Any]) -> None:
    """Emit capped SyncIssue rows for dashboard / sync_issues.json."""
    samples = ir_audit.get("samples_by_code") or {}
    code_to_issue_type = {
        "g3_lift_inline_node": IssueType.DIAGRAM_IR_G3_LIFT_INLINE_NODE.value,
        "g3_drop_non_string_member": IssueType.DIAGRAM_IR_G3_DROP_NON_STRING_MEMBER.value,
        "g3_drop_unknown_member": IssueType.DIAGRAM_IR_G3_DROP_UNKNOWN_MEMBER.value,
        "g3_dropped_empty_group": IssueType.DIAGRAM_IR_G3_DROPPED_EMPTY_GROUP.value,
        "g2_injected_external": IssueType.DIAGRAM_IR_G2_INJECTED_EXTERNAL.value,
        "g2_endpoint_is_group_id": IssueType.DIAGRAM_IR_G2_ENDPOINT_IS_GROUP_ID.value,
        "g2_skip_edge_missing_endpoint": IssueType.DIAGRAM_IR_G2_SKIP_EDGE_MISSING_ENDPOINT.value,
        "r4_node_id_collides_with_group": IssueType.DIAGRAM_IR_R4_NODE_ID_COLLIDES_WITH_GROUP.value,
        "r4_skip_edge_missing_endpoint": IssueType.DIAGRAM_IR_R4_SKIP_EDGE_MISSING_ENDPOINT.value,
        "r4_edge_unknown_source": IssueType.DIAGRAM_IR_R4_EDGE_UNKNOWN_SOURCE.value,
        "r4_edge_unknown_target": IssueType.DIAGRAM_IR_R4_EDGE_UNKNOWN_TARGET.value,
        "r4_validate_failed": IssueType.DIAGRAM_IR_R4_VALIDATE_FAILED.value,
        "r4_edge_placement_violations": IssueType.DIAGRAM_IR_R4_EDGE_PLACEMENT_VIOLATIONS.value,
        "overview_no_diagram_json": IssueType.DIAGRAM_IR_OVERVIEW_NO_DIAGRAM_JSON.value,
        "overview_mermaid_parse_failed": IssueType.DIAGRAM_IR_OVERVIEW_MERMAID_PARSE_FAILED.value,
        "r1_unmatched_end": IssueType.DIAGRAM_IR_R1_UNMATCHED_END.value,
        "r1_unclosed_subgraph": IssueType.DIAGRAM_IR_R1_UNCLOSED_SUBGRAPH.value,
        "r1_too_many_unsupported_lines": IssueType.DIAGRAM_IR_R1_TOO_MANY_UNSUPPORTED_LINES.value,
        "clone_error": "diagram_ir_clone_error",
    }
    for code, rows in samples.items():
        itype = code_to_issue_type.get(code, f"diagram_ir_{code}")
        for row in rows[:_MAX_SAMPLES_PER_DIAGRAM_IR_CODE]:
            mod = row.get("module", "?")
            pth = row.get("path", "?")
            details = {k: v for k, v in row.items() if k not in ("module", "path")}
            report.add_issue(
                SyncIssue(
                    issue_type=itype,
                    module_name=str(mod),
                    module_path=str(pth),
                    severity="warning",
                    details=details,
                    auto_fixed=False,
                )
            )


def _metrics_delta(before: Dict[str, Any], after: Dict[str, Any]) -> Dict[str, Any]:
    """Numeric presync minus postsync (positive => problems reduced by sync)."""
    keys = set(before.keys()) | set(after.keys())
    delta: Dict[str, Any] = {}
    for k in keys:
        b, a = before.get(k), after.get(k)
        if isinstance(b, (int, float)) and isinstance(a, (int, float)):
            delta[k] = round(float(b) - float(a), 4)
    return delta


def _build_measurement_summary(report: SyncReport) -> Dict[str, Any]:
    """One JSON blob for experiments: presync/postsync audits and fix counters."""
    by_type: Dict[str, int] = {}
    for i in report.issues:
        by_type[i.issue_type] = by_type.get(i.issue_type, 0) + 1

    presync = report.metrics.get("presync_audit") or {}
    postsync = report.metrics.get("postsync_audit") or {}

    return {
        "1_stage3_defects_before_stage45": {
            "note": "Read-only audit (audit_docs_state) on tree + *.md before sync mutates files",
            "presync_audit": presync,
        },
        "1b_stage45_fixes_applied_counters": report.metrics.get("fixes_applied_counts") or {},
        "1c_residual_after_stage45": {
            "postsync_audit": postsync,
        },
        "1d_reduction_delta_presync_minus_postsync": {
            "note": "Positive number = fewer problems after sync for that metric",
            "delta": report.metrics.get("delta_presync_minus_postsync") or {},
        },
        "1e_issues_logged_this_run_by_type": {
            "all": by_type,
        },
        "2_diagram_ir": {
            "audit": report.metrics.get("diagram_ir_audit"),
            "by_code": (report.metrics.get("diagram_ir_audit") or {}).get("by_code", {}),
        },
    }


def _placeholder_opening_description(
    title: str,
    module_data: Dict,
    component_ids: List[Any],
    max_chars: int = 200,
) -> str:
    """Opening paragraph for hover text (~200 chars), matching real module docs."""
    raw = (module_data.get("description") or "").strip()
    generic = f"Documentation for the {title} module."
    if raw and raw != generic:
        desc = raw
    elif component_ids:
        short = [cid.split(".")[-1].replace("_", " ") for cid in component_ids[:5]]
        desc = (
            f"This module groups {len(component_ids)} components, including "
            f"{', '.join(short[:3])}."
        )
    else:
        desc = f"Overview of {title} and its responsibilities in the codebase."
    if len(desc) > max_chars:
        desc = desc[: max_chars - 3].rsplit(" ", 1)[0] + "..."
    return desc


def _mermaid_safe_id(name: str) -> str:
    """Use tree keys as Mermaid node ids (alphanumeric + underscore)."""
    out = "".join(c if c.isalnum() or c == "_" else "_" for c in name)
    return out or "node"


def generate_minimal_module_doc_dict(
    module_name: str,
    module_data: Dict,
    module_path: str,
    components: Dict = None,
) -> Dict[str, Any]:
    """
    Minimal ``{module}.json`` for a tree node missing real documentation (viewer stubs).

    Diagram child links use bare module ids (normalized by ``validate_module_doc``).
    """
    title = module_data.get("title", module_name.replace("_", " ").title())
    component_ids = module_data.get("components", []) or []
    description = _placeholder_opening_description(title, module_data, component_ids)

    root_id = _mermaid_safe_id(module_name)
    children = module_data.get("children") or {}
    if not isinstance(children, dict):
        children = {}

    nodes_json: List[Dict[str, Any]] = []
    edges_json: List[Dict[str, str]] = []

    nodes_json.append(
        {
            "id": root_id,
            "label": title,
            "type": "module",
            "title": title,
            "description": description,
        }
    )

    for child_name, child_data in list(children.items())[:12]:
        if not isinstance(child_data, dict):
            continue
        cid = _mermaid_safe_id(child_name)
        ctitle = child_data.get("title", child_name.replace("_", " ").title())
        cdesc = (child_data.get("description") or "").strip()
        if not cdesc:
            cdesc = f"Sub-module {ctitle} under {title}."
        if len(cdesc) > 200:
            cdesc = cdesc[:197] + "..."
        nodes_json.append(
            {
                "id": cid,
                "label": ctitle,
                "type": "module",
                "link": child_name,
                "title": ctitle,
                "description": cdesc,
            }
        )
        edges_json.append(
            {
                "source": root_id,
                "target": cid,
                "label": "contains",
            }
        )

    diagram_obj = {
        "direction": "TD",
        "nodes": nodes_json,
        "edges": edges_json,
        "groups": [],
    }

    doc = validate_module_doc(
        {"title": title, "summary": description, "diagram": diagram_obj}
    )
    return doc.model_dump(mode="json")


def sync_docs_with_tree(docs_dir: str, report: SyncReport, components: Dict = None) -> List[str]:
    """
    Ensure all modules in module_tree.json have corresponding ``{module}.json`` (or legacy ``.md``).

    LOGS ERRORS for all missing files. Placeholder JSON creation is disabled unless
    CODEWIKI_SYNC_ALLOW_PLACEHOLDER_MD is set (see ALLOW_SYNC_PLACEHOLDER_MD).

    Args:
        docs_dir: Path to documentation directory
        report: SyncReport to record issues
        components: Optional full components dict for richer doc generation

    Returns:
        List of file paths that were created
    """
    docs_path = Path(docs_dir)
    tree_path = docs_path / "module_tree.json"
    
    if not tree_path.exists():
        logger.warning(f"[DOC_SYNC] module_tree.json not found at {tree_path}")
        return []
    
    # Load tree
    try:
        with open(tree_path) as f:
            tree = json.load(f)
    except Exception as e:
        logger.error(f"[DOC_SYNC] Failed to load module_tree.json: {e}")
        return []
    
    # Get all modules
    all_modules = get_all_modules_in_tree(tree)
    logger.info(f"[DOC_SYNC] Found {len(all_modules)} modules in tree")
    
    _skip_json = _module_json_skip_stems()
    json_stems = {f.stem for f in docs_path.glob("*.json") if f.stem not in _skip_json}
    md_stems = {f.stem for f in docs_path.glob("*.md")}
    tree_names = _tree_module_names(tree)
    valid_json_stems: Set[str] = set()
    for stem in json_stems:
        if stem not in tree_names:
            continue
        json_path = docs_path / f"{stem}.json"
        ok, err, repaired = _check_module_json_file(json_path, try_repair=True)
        if ok:
            valid_json_stems.add(stem)
            if repaired:
                logger.info(
                    "[DOC_SYNC] Repaired agent JSON literal-newline corruption in %s.json",
                    stem,
                )
        else:
            report.add_issue(
                SyncIssue(
                    issue_type=IssueType.JSON_PARSE_ERROR.value,
                    module_name=stem,
                    module_path=stem,
                    severity="error",
                    details={"error": err or "invalid json"},
                    auto_fixed=False,
                )
            )
            logger.error("[DOC_SYNC] Invalid JSON in %s.json: %s", stem, err)
    existing_files = valid_json_stems | md_stems
    logger.info(
        "[DOC_SYNC] Found %s module doc stems (.json/.md combined)",
        len(existing_files),
    )
    
    # Find missing files
    created_files = []
    
    for module_name, module_path, module_data in all_modules:
        if module_name == "overview":
            continue
            
        if module_name not in existing_files:
            # LOG THE ERROR - this is the key issue we want to track
            component_count = len(module_data.get("components", []))
            depth = module_path.count("/") + 1
            
            issue = SyncIssue(
                issue_type=IssueType.MISSING_MD_FILE.value,
                module_name=module_name,
                module_path=module_path,
                severity="error",
                details={
                    "component_count": component_count,
                    "depth": depth,
                    "has_title": "title" in module_data,
                    "has_description": "description" in module_data,
                    "has_children": bool(module_data.get("children")),
                    "parent": module_path.rsplit("/", 1)[0] if "/" in module_path else "root"
                },
                auto_fixed=ALLOW_SYNC_PLACEHOLDER_MD,
            )
            report.add_issue(issue)

            if ALLOW_SYNC_PLACEHOLDER_MD:
                try:
                    payload = generate_minimal_module_doc_dict(
                        module_name, module_data, module_path, components
                    )
                    file_path = module_doc_path(docs_dir, module_name)
                    file_path.write_text(
                        json.dumps(payload, indent=2), encoding="utf-8"
                    )

                    created_files.append(str(file_path))
                    report.files_created.append(module_name)
                    logger.info("[DOC_SYNC] Created placeholder: %s", file_path.name)

                except Exception as e:
                    logger.error("[DOC_SYNC] Failed to create %s.json: %s", module_name, e)
            else:
                logger.warning(
                    "[DOC_SYNC] Missing %s.json — placeholders disabled "
                    "(set CODEWIKI_SYNC_ALLOW_PLACEHOLDER_MD=1 to create viewer stubs)",
                    module_name,
                )

    logger.info(f"[DOC_SYNC] Complete: {len(report.files_created)} placeholder files created")
    
    return created_files


def add_leaf_diagrams(docs_dir: str, report: SyncReport = None) -> int:
    """
    Add minimal diagrams to leaf modules that don't have them.
    
    Returns:
        Number of diagrams added
    """
    docs_path = Path(docs_dir)
    tree_path = docs_path / "module_tree.json"
    
    if not tree_path.exists():
        return 0
    
    try:
        with open(tree_path) as f:
            tree = json.load(f)
    except:
        return 0
    
    added = 0
    
    def ensure_leaf_has_diagram(node: Dict, node_name: str, path: str = ""):
        nonlocal added
        current_path = f"{path}/{node_name}" if path else node_name
        
        children = node.get("children", {})
        
        # Recurse first
        for child_name, child_data in children.items():
            ensure_leaf_has_diagram(child_data, child_name, current_path)
        
        # If this is a leaf (no children) and has no diagram, add one
        if not children and not node.get("diagram"):
            components = node.get("components", [])
            title = node.get("title", node_name.replace("_", " ").title())
            
            # Log the issue - MISSING DIAGRAM IS AN ERROR (diagram required for viewer)
            if report:
                report.add_issue(SyncIssue(
                    issue_type=IssueType.MISSING_DIAGRAM.value,
                    module_name=node_name,
                    module_path=current_path,
                    severity="error",
                    details={
                        "component_count": len(components),
                        "is_leaf": True
                    },
                    auto_fixed=True
                ))
                report.diagrams_added.append(node_name)
            
            # Create minimal diagram showing components
            nodes = [{
                "id": node_name,
                "label": title,
                "type": "module"
            }]
            edges = []
            
            # Add up to 5 component nodes
            for i, comp in enumerate(components[:5]):
                comp_id = f"c{i}"
                comp_label = comp.split(".")[-1] if "." in comp else comp
                comp_label = comp_label.split("/")[-1] if "/" in comp_label else comp_label
                nodes.append({
                    "id": comp_id,
                    "label": comp_label[:30],  # Truncate long names
                    "type": "component"
                })
                edges.append({
                    "source": node_name,
                    "target": comp_id
                })
            
            if len(components) > 5:
                nodes.append({
                    "id": "more",
                    "label": f"+{len(components)-5} more",
                    "type": "component"
                })
                edges.append({
                    "source": node_name,
                    "target": "more"
                })
            
            node["diagram"] = {
                "direction": "TD",
                "nodes": nodes,
                "edges": edges,
                "groups": [],
                "_auto_generated": True  # Mark as auto-generated
            }
            added += 1
            logger.info(f"[DOC_SYNC] Added diagram to leaf: {node_name}")
    
    for name, data in tree.items():
        ensure_leaf_has_diagram(data, name)
    
    if added > 0:
        with open(tree_path, 'w') as f:
            json.dump(tree, f, indent=2)
        logger.info(f"[DOC_SYNC] Added {added} diagrams to leaf modules")
    
    return added


def update_tree_diagrams(docs_dir: str) -> int:
    """
    Ensure all parent modules have diagram.nodes containing their children.
    
    Returns:
        Number of diagrams updated
    """
    docs_path = Path(docs_dir)
    tree_path = docs_path / "module_tree.json"
    
    if not tree_path.exists():
        return 0
    
    try:
        with open(tree_path) as f:
            tree = json.load(f)
    except:
        return 0
    
    updated = 0
    
    def ensure_diagram_has_children(node: Dict, node_name: str):
        nonlocal updated
        
        children = node.get("children", {})
        if not children:
            return
        
        # Check if diagram exists and has all children as nodes
        diagram = node.get("diagram", {})
        if not diagram:
            # Create minimal diagram
            diagram = {
                "direction": "TD",
                "nodes": [],
                "edges": []
            }
        
        existing_node_ids = {n.get("id") for n in diagram.get("nodes", [])}
        nodes = diagram.get("nodes", [])
        edges = diagram.get("edges", [])
        
        for child_name, child_data in children.items():
            if child_name not in existing_node_ids:
                nodes.append({
                    "id": child_name,
                    "label": child_data.get("title", child_name.replace("_", " ").title()),
                    "type": "module",
                    "link": child_name
                })
                edges.append({
                    "source": node_name,
                    "target": child_name
                })
                updated += 1
        
        if nodes:
            # Ensure parent node exists
            parent_exists = any(n.get("id") == node_name for n in nodes)
            if not parent_exists:
                nodes.insert(0, {
                    "id": node_name,
                    "label": node.get("title", node_name.replace("_", " ").title()),
                    "type": "module"
                })
            
            diagram["nodes"] = nodes
            diagram["edges"] = edges
            node["diagram"] = diagram
        
        # Recurse into children
        for child_name, child_data in children.items():
            ensure_diagram_has_children(child_data, child_name)
    
    for name, data in tree.items():
        ensure_diagram_has_children(data, name)
    
    if updated > 0:
        with open(tree_path, 'w') as f:
            json.dump(tree, f, indent=2)
        logger.info(f"[DOC_SYNC] Updated {updated} diagram node references")
    
    return updated


def add_missing_metadata(docs_dir: str, report: SyncReport) -> int:
    """
    Add missing title/description to modules that don't have them.
    
    LOGS warnings for missing metadata, then adds auto-generated values.
    
    Returns:
        Number of modules updated
    """
    docs_path = Path(docs_dir)
    tree_path = docs_path / "module_tree.json"
    
    if not tree_path.exists():
        return 0
    
    try:
        with open(tree_path) as f:
            tree = json.load(f)
    except:
        return 0
    
    updated = 0
    
    def ensure_metadata(node: Dict, node_name: str, path: str = ""):
        nonlocal updated
        current_path = f"{path}/{node_name}" if path else node_name
        
        # Check for missing title
        if not node.get("title"):
            report.add_issue(SyncIssue(
                issue_type=IssueType.MISSING_TITLE.value,
                module_name=node_name,
                module_path=current_path,
                severity="warning",
                details={
                    "component_count": len(node.get("components", [])),
                    "has_children": bool(node.get("children"))
                },
                auto_fixed=True
            ))
            
            # Mark as auto-generated in the tree
            node["title"] = node_name.replace("_", " ").title()
            node["_title_auto_generated"] = True
            report.metadata_added.append(f"{node_name}:title")
            updated += 1
        
        # Check for missing description
        if not node.get("description"):
            report.add_issue(SyncIssue(
                issue_type=IssueType.MISSING_DESCRIPTION.value,
                module_name=node_name,
                module_path=current_path,
                severity="warning",
                details={
                    "component_count": len(node.get("components", [])),
                    "has_children": bool(node.get("children"))
                },
                auto_fixed=True
            ))
            
            title = node.get("title", node_name)
            comp_count = len(node.get("components", []))
            child_count = len(node.get("children", {}))
            
            if child_count > 0:
                node["description"] = f"Contains {child_count} sub-modules for {title.lower()} functionality."
            elif comp_count > 0:
                node["description"] = f"Provides {comp_count} component(s) for {title.lower()} operations."
            else:
                node["description"] = f"Documentation for the {title} module."
            
            node["_description_auto_generated"] = True
            report.metadata_added.append(f"{node_name}:description")
            updated += 1
        
        # Recurse into children
        for child_name, child_data in node.get("children", {}).items():
            ensure_metadata(child_data, child_name, current_path)
    
    for name, data in tree.items():
        ensure_metadata(data, name)
    
    if updated > 0:
        with open(tree_path, 'w') as f:
            json.dump(tree, f, indent=2)
        logger.info(f"[DOC_SYNC] Added metadata to {updated} modules (marked as auto-generated)")
    
    return updated


def ensure_overview_exists(docs_dir: str) -> bool:
    """
    Ensure ``overview.json`` exists. Create from module tree if missing.

    Returns:
        True if overview was created, False if already exists
    """
    docs_path = Path(docs_dir)
    overview_path = docs_path / OVERVIEW_FILENAME

    if overview_path.exists():
        return False

    tree_path = docs_path / "module_tree.json"
    if not tree_path.exists():
        return False

    try:
        tree = json.loads(tree_path.read_text(encoding="utf-8", errors="replace"))
    except Exception:
        return False

    repo_name = docs_path.parent.name if docs_path.name == "docs" else docs_path.name
    repo_label = repo_name.replace("-", " ").replace("_", " ").title()
    root_id = _mermaid_safe_id(repo_name)
    nodes: List[Dict[str, Any]] = [
        {"id": root_id, "label": repo_label, "type": "module", "title": repo_label, "description": ""}
    ]
    edges: List[Dict[str, str]] = []
    for module_name, module_data in tree.items():
        mid = _mermaid_safe_id(module_name)
        title = module_data.get("title", module_name.replace("_", " ").title())
        desc = (module_data.get("description") or "").strip() or f"Module {title}."
        if len(desc) > 200:
            desc = desc[:197] + "..."
        nodes.append(
            {
                "id": mid,
                "label": title,
                "type": "module",
                "link": module_name,
                "title": title,
                "description": desc,
            }
        )
        edges.append({"source": root_id, "target": mid, "label": "contains"})

    summary = (
        f"Auto-generated overview for **{repo_label}** with {len(tree)} top-level module(s)."
    )
    doc = validate_module_doc(
        {
            "title": f"{repo_label} — Overview",
            "summary": summary,
            "diagram": {
                "direction": "TD",
                "nodes": nodes,
                "edges": edges,
                "groups": [],
            },
        }
    )

    try:
        overview_path.write_text(
            json.dumps(doc.model_dump(mode="json"), indent=2),
            encoding="utf-8",
        )
        logger.info("[DOC_SYNC] Created %s", OVERVIEW_FILENAME)
        return True
    except Exception as e:
        logger.error("[DOC_SYNC] Failed to create %s: %s", OVERVIEW_FILENAME, e)
        return False


def run_full_sync(
    docs_dir: str,
    components: Dict = None,
    repo_name: str = None,
    config: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Run full synchronization: create missing files and update diagrams.
    
    IMPORTANT: This function:
    1. LOGS all issues found (errors for missing files, warnings for missing metadata)
    2. Creates placeholders for missing files (marked as auto-generated)
    3. Saves a sync_issues.json report for later analysis
    4. TRACKS failure rate and saves to historical log
    
    Returns:
        Summary of what was done including issue counts and failure rate
    """
    global _current_report
    
    logger.info(f"[DOC_SYNC] Running full sync on {docs_dir}")
    
    # Get total module count from tree
    docs_path = Path(docs_dir)
    tree_path = docs_path / "module_tree.json"
    total_modules = 0
    
    if tree_path.exists():
        try:
            with open(tree_path) as f:
                tree = json.load(f)
            
            def count_modules(t):
                return len(t) + sum(count_modules(v.get("children", {})) for v in t.values())
            
            total_modules = count_modules(tree)
        except Exception as e:
            logger.warning(f"[DOC_SYNC] Could not count modules: {e}")
    
    # Infer repo name if not provided
    if not repo_name:
        repo_name = docs_path.parent.name if docs_path.name == "docs" else docs_path.name
    
    # Create report
    report = SyncReport(
        docs_dir=docs_dir,
        timestamp=datetime.now().isoformat(),
        total_modules=total_modules
    )
    _current_report = report

    # Stage 3 snapshot (before any sync mutation) — quantifies what 4.5 must repair
    try:
        report.metrics["presync_audit"] = audit_docs_state(docs_dir)
    except Exception as e:
        logger.warning(f"[DOC_SYNC] presync audit failed: {e}")
        report.metrics["presync_audit"] = {"error": str(e)}

    # Structured log from Stage 4 sub-agents (why .md was missing before sync placeholders)
    smf_path = docs_path / "submodule_md_failures.json"
    if smf_path.exists():
        try:
            smf = json.loads(smf_path.read_text(encoding="utf-8"))
            if isinstance(smf, list):
                report.metrics["submodule_md_failures_from_generation"] = {
                    "count": len(smf),
                    "file": "submodule_md_failures.json",
                    "reason_histogram": dict(
                        Counter(str(x.get("reason", "unknown")) for x in smf if isinstance(x, dict))
                    ),
                }
                logger.info(
                    "[DOC_SYNC] Found submodule_md_failures.json: %s entries (see reason_histogram in sync_issues.json)",
                    len(smf),
                )
        except Exception as e:
            logger.warning("[DOC_SYNC] Could not read submodule_md_failures.json: %s", e)
    
    # Ensure overview exists
    overview_created = ensure_overview_exists(docs_dir)
    if overview_created:
        report.add_issue(SyncIssue(
            issue_type=IssueType.MISSING_OVERVIEW.value,
            module_name="overview",
            module_path="root",
            severity="error",
            details={"reason": f"{OVERVIEW_FILENAME} was not generated"},
            auto_fixed=True
        ))
    
    # First, add missing metadata (title/description) - log issues
    metadata_updates = add_missing_metadata(docs_dir, report)
    
    # Create missing files - log issues
    created_files = sync_docs_with_tree(docs_dir, report, components)
    
    # Add diagrams to leaf modules
    leaf_diagrams = add_leaf_diagrams(docs_dir, report)
    
    # Update parent diagrams to include children
    diagram_updates = update_tree_diagrams(docs_dir)

    edges_dropped = sanitize_module_diagram_edges_in_docs(docs_dir, report)

    ir_audit: Dict[str, Any] = {}
    try:
        ir_audit = audit_diagram_ir_state(docs_dir)
        report.metrics["diagram_ir_audit"] = ir_audit
        logger.info("[STAGE 4.5] Diagram IR audit: %s", ir_audit.get("by_code"))
    except Exception as e:
        logger.warning("[DOC_SYNC] diagram IR audit failed: %s", e)
        report.metrics["diagram_ir_audit"] = {"error": str(e)}
        ir_audit = {"samples_by_code": {}, "by_code": {}}

    try:
        _emit_diagram_ir_sync_issues(report, ir_audit)
    except Exception as e:
        logger.warning("[DOC_SYNC] diagram IR sync issue emit failed: %s", e)

    try:
        report.metrics["postsync_audit"] = audit_docs_state(docs_dir)
        pre = report.metrics.get("presync_audit") or {}
        post = report.metrics.get("postsync_audit") or {}
        if isinstance(pre, dict) and isinstance(post, dict) and "error" not in pre:
            report.metrics["delta_presync_minus_postsync"] = _metrics_delta(pre, post)
        # Single line for logs / CI: how many module .md files are still placeholders
        if isinstance(pre, dict) and isinstance(post, dict):
            logger.info(
                "[DOC_SYNC] Audit: missing_md presync=%s postsync=%s | placeholder_md_files presync=%s postsync=%s",
                pre.get("missing_md"),
                post.get("missing_md"),
                pre.get("placeholder_md_files"),
                post.get("placeholder_md_files"),
            )
    except Exception as e:
        logger.warning(f"[DOC_SYNC] postsync audit failed: {e}")

    report.metrics["fixes_applied_counts"] = {
        "metadata_field_updates": metadata_updates,
        "placeholder_md_files_created": len(created_files),
        "leaf_diagrams_added": leaf_diagrams,
        "parent_diagram_child_nodes_injected": diagram_updates,
        "diagram_ir_edges_dropped": edges_dropped,
        "overview_md_created": int(overview_created),
    }

    report.metrics["measurement_summary"] = _build_measurement_summary(report)

    # Save issue report
    report_path = Path(docs_dir) / "sync_issues.json"
    report.save(str(report_path))
    
    # Save to historical tracking
    try:
        save_to_history(report, repo_name, str(docs_path.parent.parent))
    except Exception as e:
        logger.warning(f"[DOC_SYNC] Could not save to history: {e}")
    
    # Print summary to console (always show failure rate)
    print(f"\n📊 {repo_name}: Failure rate {report.failure_rate:.1f}% ({report.missing_files_count}/{report.total_modules} modules)")
    
    if report.issues:
        report.print_summary()
    
    return {
        "files_created": len(created_files),
        "created_files": created_files,
        "overview_created": overview_created,
        "metadata_updates": metadata_updates,
        "leaf_diagrams_added": leaf_diagrams,
        "diagrams_updated": diagram_updates,
        "metrics": report.metrics,
        "measurement_summary": report.metrics.get("measurement_summary"),
        "issues": len(report.issues),
        "errors": report.error_count,
        "warnings": report.warning_count,
        "total_modules": total_modules,
        "missing_files": report.missing_files_count,
        "failure_rate_pct": round(report.failure_rate, 2),
        "success_rate_pct": round(report.success_rate, 2),
        "report_path": str(report_path)
    }


def get_sync_report(docs_dir: str) -> Optional[Dict]:
    """Load and return the sync report for a docs directory."""
    report_path = Path(docs_dir) / "sync_issues.json"
    if report_path.exists():
        try:
            with open(report_path) as f:
                return json.load(f)
        except:
            return None
    return None


# CLI interface
if __name__ == "__main__":
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python doc_file_sync.py <docs_dir>     - Run sync on docs directory")
        print("  python doc_file_sync.py --history      - Show historical tracking")
        sys.exit(1)
    
    if sys.argv[1] == "--history":
        base_dir = sys.argv[2] if len(sys.argv) > 2 else "."
        print_historical_summary(base_dir)
        sys.exit(0)
    
    docs_dir = sys.argv[1]
    result = run_full_sync(docs_dir)
    
    print(f"\n" + "="*60)
    print(f"SYNC COMPLETE")
    print(f"="*60)
    print(f"  📊 Failure rate: {result.get('failure_rate_pct', 0):.1f}%")
    print(f"  📁 Total modules: {result.get('total_modules', 0)}")
    print(f"  ❌ Missing files: {result.get('missing_files', 0)}")
    print(f"  🔧 Placeholders created: {result['files_created']}")
    print(f"  📝 Report saved: {result.get('report_path', 'N/A')}")
    
    if result['created_files']:
        print("\nPlaceholder files created:")
        for f in result['created_files']:
            print(f"  - {f}")
    
    print(f"="*60)
