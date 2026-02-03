"""
Documentation File Sync Module
Agent 3 (Reliability) - Ensures all modules in tree have corresponding .md files

This module provides post-processing to fix the common issue where modules are
added to module_tree.json but no .md file is generated. This happens because:
1. The LLM adds modules to the tree via generate_sub_module_documentation
2. But the sub-agent for small modules sometimes doesn't create the file

IMPORTANT: This module does NOT silently fix issues. It:
1. LOGS all issues found with ERROR level
2. MARKS auto-generated content with "_auto_generated" flag
3. CREATES a sync_issues.json report for later analysis
4. Still creates placeholder files so the viewer works

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
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple
from datetime import datetime
from dataclasses import dataclass, field, asdict
from enum import Enum

logger = logging.getLogger(__name__)


class IssueType(Enum):
    """Types of sync issues found."""
    # File/structure issues
    MISSING_MD_FILE = "missing_md_file"
    MISSING_TITLE = "missing_title"
    MISSING_DESCRIPTION = "missing_description"
    MISSING_DIAGRAM = "missing_diagram"
    MISSING_OVERVIEW = "missing_overview"
    ORPHAN_MD_FILE = "orphan_md_file"  # MD file exists but not in tree
    
    # Mermaid syntax errors
    MERMAID_INVALID_COMMENT = "mermaid_invalid_comment"
    MERMAID_UNBALANCED_BRACKETS = "mermaid_unbalanced_brackets"
    MERMAID_UNBALANCED_SUBGRAPH = "mermaid_unbalanced_subgraph"
    MERMAID_SYNTAX_ERROR = "mermaid_syntax_error"
    
    # JSON/parsing errors
    JSON_PARSE_ERROR = "json_parse_error"
    
    # LLM generation errors (from generation_tracker)
    LLM_RATE_LIMIT = "llm_rate_limit"
    LLM_CONTEXT_EXCEEDED = "llm_context_exceeded"
    LLM_TIMEOUT = "llm_timeout"
    LLM_API_ERROR = "llm_api_error"


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


def generate_minimal_doc(module_name: str, module_data: Dict, module_path: str, 
                        components: Dict = None) -> str:
    """
    Generate a minimal documentation file for a module that's missing one.
    
    IMPORTANT: This adds clear markers that this was auto-generated so we can:
    1. Track which modules failed to generate properly
    2. Fix the root cause in the LLM prompts
    
    Args:
        module_name: Name of the module
        module_data: Module data from tree (has title, description, components)
        module_path: Full path in tree (e.g., "parent/child/leaf")
        components: Optional full components dict for more detail
    
    Returns:
        Markdown content for the documentation file
    """
    title = module_data.get("title", module_name.replace("_", " ").title())
    description = module_data.get("description", f"Documentation for the {title} module.")
    component_ids = module_data.get("components", [])
    
    # START with clear auto-generated marker
    content = f"<!-- AUTO_GENERATED_PLACEHOLDER\n"
    content += f"  reason: LLM did not create .md file for this module\n"
    content += f"  module_path: {module_path}\n"
    content += f"  component_count: {len(component_ids)}\n"
    content += f"  generated_at: {datetime.now().isoformat()}\n"
    content += f"  TODO: Fix LLM prompt to handle small leaf modules\n"
    content += f"-->\n\n"
    
    content += f"# {title}\n\n"
    
    # Add warning banner
    content += "> ⚠️ **Auto-Generated Placeholder**\n"
    content += "> This documentation was auto-generated because the LLM failed to create it.\n"
    content += f"> Module path: `{module_path}`\n\n"
    
    content += f"{description}\n\n"
    
    # Add component list if available
    if component_ids:
        content += "## Components\n\n"
        content += f"This module contains {len(component_ids)} component(s):\n\n"
        for comp_id in component_ids[:10]:  # Limit to first 10
            content += f"- `{comp_id}`\n"
        if len(component_ids) > 10:
            content += f"- ... and {len(component_ids) - 10} more\n"
        content += "\n"
    
    # Add minimal diagram if not present
    if not module_data.get("diagram"):
        content += "## Structure\n\n"
        content += "```mermaid\n"
        content += "graph TD\n"
        main_id = module_name.replace("_", "").upper()[:3]
        content += f"    {main_id}[\"{title}\"]\n"
        
        # Add children if present
        children = module_data.get("children", {})
        for i, (child_name, _) in enumerate(list(children.items())[:5]):
            child_id = f"C{i}"
            content += f"    {child_id}[\"{child_name}\"]\n"
            content += f"    {main_id} --> {child_id}\n"
        
        content += "```\n\n"
    
    content += "---\n"
    content += f"*Auto-generated placeholder. See sync_issues.json for details.*\n"
    
    return content


def sync_docs_with_tree(docs_dir: str, report: SyncReport, components: Dict = None) -> List[str]:
    """
    Ensure all modules in module_tree.json have corresponding .md files.
    
    LOGS ERRORS for all missing files, then creates placeholders.
    
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
    
    # Get existing .md files
    existing_files = {f.stem for f in docs_path.glob("*.md")}
    logger.info(f"[DOC_SYNC] Found {len(existing_files)} existing .md files")
    
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
                auto_fixed=True
            )
            report.add_issue(issue)
            
            # Generate placeholder doc (with clear markers)
            try:
                content = generate_minimal_doc(module_name, module_data, module_path, components)
                file_path = docs_path / f"{module_name}.md"
                
                with open(file_path, 'w') as f:
                    f.write(content)
                
                created_files.append(str(file_path))
                report.files_created.append(module_name)
                logger.info(f"[DOC_SYNC] Created placeholder: {module_name}.md")
                
            except Exception as e:
                logger.error(f"[DOC_SYNC] Failed to create {module_name}.md: {e}")
    
    logger.info(f"[DOC_SYNC] Complete: {len(report.files_created)} placeholders created")
    
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


def validate_mermaid_diagrams(docs_dir: str, report: SyncReport) -> int:
    """
    Validate all Mermaid diagrams in the docs directory.
    
    Catches common syntax errors like:
    - % instead of %% for comments
    - Unbalanced brackets
    - Unbalanced subgraph/end
    
    Returns:
        Number of issues found
    """
    import re
    
    docs_path = Path(docs_dir)
    issues_found = 0
    
    # Check all .md files for embedded mermaid blocks
    for md_file in docs_path.glob("*.md"):
        try:
            content = md_file.read_text()
        except Exception:
            continue
        
        # Find mermaid blocks
        pattern = r'```mermaid\s*([\s\S]*?)```'
        for match in re.finditer(pattern, content):
            diagram = match.group(1).strip()
            lines = diagram.split('\n')
            
            for i, line in enumerate(lines, 1):
                stripped = line.strip()
                
                # Check for invalid comments (% instead of %%)
                if stripped.startswith('%') and not stripped.startswith('%%'):
                    issues_found += 1
                    logger.error(f"[MERMAID_ERROR] {md_file.name}:line {i} - Invalid comment syntax")
                    logger.error(f"[MERMAID_ERROR]   Found: {stripped[:50]}")
                    logger.error(f"[MERMAID_ERROR]   Fix: Use %% instead of %")
                    
                    report.add_issue(SyncIssue(
                        issue_type=IssueType.MERMAID_INVALID_COMMENT.value,
                        module_name=md_file.stem,
                        module_path=md_file.stem,
                        severity="error",
                        details={
                            "line_number": i,
                            "line_content": stripped[:100],
                            "fix": f"Change '%' to '%%'"
                        },
                        auto_fixed=False
                    ))
                
                # Check for inline % comments
                if ' % ' in stripped and not stripped.startswith('%%'):
                    issues_found += 1
                    logger.error(f"[MERMAID_ERROR] {md_file.name}:line {i} - Inline comment with single %")
                    
                    report.add_issue(SyncIssue(
                        issue_type=IssueType.MERMAID_INVALID_COMMENT.value,
                        module_name=md_file.stem,
                        module_path=md_file.stem,
                        severity="error",
                        details={
                            "line_number": i,
                            "line_content": stripped[:100],
                            "fix": "Use %% for comments"
                        },
                        auto_fixed=False
                    ))
            
            # Check bracket balance
            open_brackets = diagram.count('[')
            close_brackets = diagram.count(']')
            if open_brackets != close_brackets:
                issues_found += 1
                logger.error(f"[MERMAID_ERROR] {md_file.name} - Unbalanced brackets: {open_brackets} '[' vs {close_brackets} ']'")
                
                report.add_issue(SyncIssue(
                    issue_type=IssueType.MERMAID_UNBALANCED_BRACKETS.value,
                    module_name=md_file.stem,
                    module_path=md_file.stem,
                    severity="error",
                    details={
                        "open_count": open_brackets,
                        "close_count": close_brackets
                    },
                    auto_fixed=False
                ))
            
            # Check subgraph/end balance
            subgraph_count = len(re.findall(r'\bsubgraph\b', diagram, re.IGNORECASE))
            end_count = len(re.findall(r'^\s*end\s*$', diagram, re.MULTILINE | re.IGNORECASE))
            if subgraph_count != end_count:
                issues_found += 1
                logger.error(f"[MERMAID_ERROR] {md_file.name} - Unbalanced subgraph/end: {subgraph_count} subgraph vs {end_count} end")
                
                report.add_issue(SyncIssue(
                    issue_type=IssueType.MERMAID_UNBALANCED_SUBGRAPH.value,
                    module_name=md_file.stem,
                    module_path=md_file.stem,
                    severity="error",
                    details={
                        "subgraph_count": subgraph_count,
                        "end_count": end_count
                    },
                    auto_fixed=False
                ))
    
    if issues_found > 0:
        logger.warning(f"[DOC_SYNC] Found {issues_found} Mermaid syntax errors")
    
    return issues_found


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
                    "link": f"{child_name}.md"
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
    Ensure overview.md exists. Create from module tree if missing.
    
    Returns:
        True if overview was created, False if already exists
    """
    docs_path = Path(docs_dir)
    overview_path = docs_path / "overview.md"
    
    if overview_path.exists():
        return False
    
    tree_path = docs_path / "module_tree.json"
    if not tree_path.exists():
        return False
    
    try:
        with open(tree_path) as f:
            tree = json.load(f)
    except:
        return False
    
    # Create overview from module tree
    repo_name = docs_path.parent.name if docs_path.name == "docs" else docs_path.name
    
    content = f"# {repo_name.replace('-', ' ').replace('_', ' ').title()}\n\n"
    content += "## Overview\n\n"
    content += f"This repository contains {len(tree)} main modules.\n\n"
    content += "## Modules\n\n"
    
    for module_name, module_data in tree.items():
        title = module_data.get("title", module_name.replace("_", " ").title())
        desc = module_data.get("description", "")
        content += f"### [{title}]({module_name}.md)\n\n"
        if desc:
            content += f"{desc}\n\n"
    
    # Add diagram
    content += "## Architecture\n\n"
    content += "```mermaid\ngraph TD\n"
    for i, (module_name, module_data) in enumerate(list(tree.items())[:10]):
        mid = f"M{i}"
        title = module_data.get("title", module_name)[:20]
        content += f"    {mid}[\"{title}\"]\n"
    content += "```\n"
    
    try:
        with open(overview_path, 'w') as f:
            f.write(content)
        logger.info(f"[DOC_SYNC] Created overview.md")
        return True
    except Exception as e:
        logger.error(f"[DOC_SYNC] Failed to create overview.md: {e}")
        return False


def run_full_sync(docs_dir: str, components: Dict = None, repo_name: str = None) -> Dict[str, Any]:
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
    
    # Ensure overview exists
    overview_created = ensure_overview_exists(docs_dir)
    if overview_created:
        report.add_issue(SyncIssue(
            issue_type=IssueType.MISSING_OVERVIEW.value,
            module_name="overview",
            module_path="root",
            severity="error",
            details={"reason": "overview.md was not generated"},
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
    
    # Validate Mermaid diagrams - catch syntax errors
    mermaid_errors = validate_mermaid_diagrams(docs_dir, report)
    
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
        "mermaid_errors": mermaid_errors,
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
