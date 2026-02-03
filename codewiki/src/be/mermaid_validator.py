"""
Mermaid Diagram Validator

Validates Mermaid syntax BEFORE rendering to catch errors early in the pipeline.
Catches issues that would cause the viewer to fail.

Common errors:
- Wrong comment syntax (% instead of %%)
- Unbalanced brackets/subgraphs
- Invalid node IDs
- Malformed edge labels
"""

import re
import subprocess
import json
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from pathlib import Path
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class MermaidErrorType(Enum):
    INVALID_COMMENT = "invalid_comment"       # % instead of %%
    UNBALANCED_BRACKETS = "unbalanced_brackets"
    UNBALANCED_SUBGRAPH = "unbalanced_subgraph"
    INVALID_NODE_ID = "invalid_node_id"       # Special chars in node ID
    MALFORMED_EDGE_LABEL = "malformed_edge_label"
    MISSING_DIAGRAM_TYPE = "missing_diagram_type"
    FORBIDDEN_DIAGRAM_TYPE = "forbidden_diagram_type"
    SYNTAX_ERROR = "syntax_error"
    EMPTY_DIAGRAM = "empty_diagram"


@dataclass
class MermaidError:
    error_type: MermaidErrorType
    message: str
    line_number: Optional[int] = None
    line_content: Optional[str] = None
    fix_suggestion: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            "error_type": self.error_type.value,
            "message": self.message,
            "line_number": self.line_number,
            "line_content": self.line_content,
            "fix_suggestion": self.fix_suggestion
        }


@dataclass
class MermaidValidationResult:
    valid: bool
    errors: List[MermaidError] = field(default_factory=list)
    warnings: List[MermaidError] = field(default_factory=list)
    
    def to_dict(self) -> Dict:
        return {
            "valid": self.valid,
            "error_count": len(self.errors),
            "warning_count": len(self.warnings),
            "errors": [e.to_dict() for e in self.errors],
            "warnings": [w.to_dict() for w in self.warnings]
        }


def validate_mermaid(diagram: str, source_info: str = "") -> MermaidValidationResult:
    """
    Validate a Mermaid diagram for common syntax errors.
    
    Args:
        diagram: The Mermaid diagram code
        source_info: Where this diagram came from (for logging)
    
    Returns:
        MermaidValidationResult with any errors found
    """
    result = MermaidValidationResult(valid=True)
    
    if not diagram or not diagram.strip():
        result.valid = False
        result.errors.append(MermaidError(
            error_type=MermaidErrorType.EMPTY_DIAGRAM,
            message="Empty diagram"
        ))
        return result
    
    lines = diagram.split('\n')
    
    # Check 1: Diagram type
    first_content_line = ""
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith('%%'):
            first_content_line = stripped
            break
    
    valid_types = ['graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'pie']
    forbidden_types = ['sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'pie']  # For our use case
    
    has_valid_type = any(first_content_line.startswith(t) for t in valid_types)
    if not has_valid_type:
        result.valid = False
        result.errors.append(MermaidError(
            error_type=MermaidErrorType.MISSING_DIAGRAM_TYPE,
            message="Diagram must start with 'graph TD' or 'flowchart TD'",
            line_number=1,
            line_content=first_content_line[:50],
            fix_suggestion="Add 'graph TD' at the start"
        ))
    
    # Check for forbidden types
    for ftype in forbidden_types:
        if first_content_line.startswith(ftype):
            result.warnings.append(MermaidError(
                error_type=MermaidErrorType.FORBIDDEN_DIAGRAM_TYPE,
                message=f"Diagram type '{ftype}' may not render correctly in viewer",
                line_number=1
            ))
    
    # Check 2: Invalid comments (% instead of %%)
    for i, line in enumerate(lines, 1):
        stripped = line.strip()
        # Check for % that's not %%
        if stripped.startswith('%') and not stripped.startswith('%%'):
            result.valid = False
            result.errors.append(MermaidError(
                error_type=MermaidErrorType.INVALID_COMMENT,
                message="Single % is invalid. Use %% for comments",
                line_number=i,
                line_content=stripped[:50],
                fix_suggestion=f"Change '%' to '%%': {stripped.replace('%', '%%', 1)[:50]}"
            ))
        
        # Also check for % in the middle of a line (outside strings)
        # Look for patterns like "edge1 --> edge2 % comment" 
        if ' % ' in stripped and not stripped.startswith('%%'):
            result.valid = False
            result.errors.append(MermaidError(
                error_type=MermaidErrorType.INVALID_COMMENT,
                message="Inline comment with single % is invalid. Use %%",
                line_number=i,
                line_content=stripped[:50],
                fix_suggestion="Use %% for comments or put on separate line"
            ))
    
    # Check 3: Unbalanced brackets
    open_brackets = diagram.count('[')
    close_brackets = diagram.count(']')
    if open_brackets != close_brackets:
        result.valid = False
        result.errors.append(MermaidError(
            error_type=MermaidErrorType.UNBALANCED_BRACKETS,
            message=f"Unbalanced square brackets: {open_brackets} '[' vs {close_brackets} ']'"
        ))
    
    open_parens = diagram.count('(')
    close_parens = diagram.count(')')
    if open_parens != close_parens:
        result.valid = False
        result.errors.append(MermaidError(
            error_type=MermaidErrorType.UNBALANCED_BRACKETS,
            message=f"Unbalanced parentheses: {open_parens} '(' vs {close_parens} ')'"
        ))
    
    # Check 4: Unbalanced subgraph/end
    subgraph_count = len(re.findall(r'\bsubgraph\b', diagram, re.IGNORECASE))
    end_count = len(re.findall(r'^\s*end\s*$', diagram, re.MULTILINE | re.IGNORECASE))
    if subgraph_count != end_count:
        result.valid = False
        result.errors.append(MermaidError(
            error_type=MermaidErrorType.UNBALANCED_SUBGRAPH,
            message=f"Unbalanced subgraph/end: {subgraph_count} subgraph vs {end_count} end"
        ))
    
    # Check 5: Invalid node IDs (special characters)
    node_pattern = r'^\s*([^\[\s\-\>]+)\s*[\[\(]'
    for i, line in enumerate(lines, 1):
        match = re.match(node_pattern, line)
        if match:
            node_id = match.group(1)
            # Valid node IDs: alphanumeric and underscores
            if not re.match(r'^[A-Za-z_][A-Za-z0-9_]*$', node_id):
                # Skip keywords
                if node_id.lower() not in ['graph', 'flowchart', 'subgraph', 'end', 'click', 'style']:
                    result.warnings.append(MermaidError(
                        error_type=MermaidErrorType.INVALID_NODE_ID,
                        message=f"Node ID '{node_id}' contains special characters",
                        line_number=i,
                        line_content=line.strip()[:50],
                        fix_suggestion="Use alphanumeric characters and underscores only"
                    ))
    
    # Check 6: Malformed edge labels
    edge_label_pattern = r'\|([^|]*)\|'
    for i, line in enumerate(lines, 1):
        for match in re.finditer(edge_label_pattern, line):
            label = match.group(1)
            # Check for problematic characters
            if '"' in label and label.count('"') % 2 != 0:
                result.warnings.append(MermaidError(
                    error_type=MermaidErrorType.MALFORMED_EDGE_LABEL,
                    message=f"Unbalanced quotes in edge label",
                    line_number=i,
                    line_content=line.strip()[:50]
                ))
    
    return result


def validate_markdown_mermaid(markdown: str, source_file: str = "") -> List[MermaidValidationResult]:
    """
    Extract and validate all Mermaid diagrams in a markdown file.
    
    Returns list of validation results, one per diagram found.
    """
    results = []
    
    # Find all mermaid code blocks
    pattern = r'```mermaid\s*([\s\S]*?)```'
    for i, match in enumerate(re.finditer(pattern, markdown)):
        diagram = match.group(1).strip()
        result = validate_mermaid(diagram, f"{source_file}:diagram_{i+1}")
        results.append(result)
    
    return results


def validate_module_tree_diagrams(tree_path: Path) -> Dict[str, MermaidValidationResult]:
    """
    Validate all diagrams in a module_tree.json file.
    
    Args:
        tree_path: Path to module_tree.json
    
    Returns:
        Dict mapping module path to validation result
    """
    results = {}
    
    if not tree_path.exists():
        return results
    
    try:
        with open(tree_path) as f:
            tree = json.load(f)
    except json.JSONDecodeError as e:
        results["_parse_error"] = MermaidValidationResult(
            valid=False,
            errors=[MermaidError(
                error_type=MermaidErrorType.SYNTAX_ERROR,
                message=f"JSON parse error: {e}"
            )]
        )
        return results
    
    def validate_tree(t, path=""):
        for name, node in t.items():
            current_path = f"{path}/{name}" if path else name
            
            # Check for mermaid field in diagram
            diagram = node.get("diagram")
            if diagram:
                if isinstance(diagram, dict) and "mermaid" in diagram:
                    mermaid_code = diagram["mermaid"]
                    result = validate_mermaid(mermaid_code, current_path)
                    if not result.valid or result.warnings:
                        results[current_path] = result
                elif isinstance(diagram, str):
                    # Raw mermaid string
                    result = validate_mermaid(diagram, current_path)
                    if not result.valid or result.warnings:
                        results[current_path] = result
            
            # Recurse into children
            if "children" in node:
                validate_tree(node["children"], current_path)
    
    validate_tree(tree)
    return results


def validate_docs_directory(docs_path: Path) -> Dict[str, Any]:
    """
    Validate all Mermaid diagrams in a docs directory.
    
    Checks:
    - module_tree.json diagrams
    - All .md files for embedded mermaid blocks
    
    Returns comprehensive validation report.
    """
    report = {
        "docs_path": str(docs_path),
        "total_diagrams": 0,
        "valid_diagrams": 0,
        "invalid_diagrams": 0,
        "total_errors": 0,
        "total_warnings": 0,
        "errors_by_type": {},
        "issues": []
    }
    
    # Validate module_tree.json diagrams
    tree_path = docs_path / "module_tree.json"
    tree_results = validate_module_tree_diagrams(tree_path)
    
    for path, result in tree_results.items():
        report["total_diagrams"] += 1
        if result.valid:
            report["valid_diagrams"] += 1
        else:
            report["invalid_diagrams"] += 1
        
        for error in result.errors:
            report["total_errors"] += 1
            error_type = error.error_type.value
            report["errors_by_type"][error_type] = report["errors_by_type"].get(error_type, 0) + 1
            report["issues"].append({
                "source": f"module_tree:{path}",
                "severity": "error",
                **error.to_dict()
            })
        
        for warning in result.warnings:
            report["total_warnings"] += 1
            report["issues"].append({
                "source": f"module_tree:{path}",
                "severity": "warning",
                **warning.to_dict()
            })
    
    # Validate .md files
    for md_file in docs_path.glob("*.md"):
        try:
            content = md_file.read_text()
        except Exception as e:
            report["issues"].append({
                "source": str(md_file),
                "severity": "error",
                "error_type": "file_read_error",
                "message": str(e)
            })
            continue
        
        results = validate_markdown_mermaid(content, md_file.name)
        
        for i, result in enumerate(results):
            report["total_diagrams"] += 1
            if result.valid:
                report["valid_diagrams"] += 1
            else:
                report["invalid_diagrams"] += 1
            
            for error in result.errors:
                report["total_errors"] += 1
                error_type = error.error_type.value
                report["errors_by_type"][error_type] = report["errors_by_type"].get(error_type, 0) + 1
                report["issues"].append({
                    "source": f"{md_file.name}:diagram_{i+1}",
                    "severity": "error",
                    **error.to_dict()
                })
            
            for warning in result.warnings:
                report["total_warnings"] += 1
                report["issues"].append({
                    "source": f"{md_file.name}:diagram_{i+1}",
                    "severity": "warning",
                    **warning.to_dict()
                })
    
    return report


def fix_mermaid_diagram(diagram: str) -> str:
    """
    Attempt to auto-fix common Mermaid syntax errors.
    
    Returns the fixed diagram.
    """
    fixed = diagram
    
    # Fix 1: Single % comments -> %%
    lines = fixed.split('\n')
    fixed_lines = []
    for line in lines:
        stripped = line.strip()
        # If line starts with single % (not %%), fix it
        if stripped.startswith('%') and not stripped.startswith('%%'):
            # Replace first % with %%
            line = line.replace('%', '%%', 1)
        # Also fix inline % comments
        if ' % ' in line and not stripped.startswith('%%'):
            line = line.replace(' % ', ' %% ')
        fixed_lines.append(line)
    fixed = '\n'.join(fixed_lines)
    
    return fixed


# CLI interface
if __name__ == "__main__":
    import sys
    
    logging.basicConfig(level=logging.INFO)
    
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python mermaid_validator.py <docs_dir>     - Validate docs directory")
        print("  python mermaid_validator.py --fix <file>   - Fix and print a .md file")
        sys.exit(1)
    
    if sys.argv[1] == "--fix" and len(sys.argv) > 2:
        # Fix mode
        file_path = Path(sys.argv[2])
        content = file_path.read_text()
        
        # Find and fix mermaid blocks
        def fix_block(match):
            diagram = match.group(1)
            fixed = fix_mermaid_diagram(diagram)
            return f"```mermaid\n{fixed}\n```"
        
        fixed_content = re.sub(r'```mermaid\n([\s\S]*?)```', fix_block, content)
        print(fixed_content)
    else:
        # Validate mode
        docs_path = Path(sys.argv[1])
        
        if not docs_path.exists():
            print(f"Error: Path not found: {docs_path}")
            sys.exit(1)
        
        report = validate_docs_directory(docs_path)
        
        print("\n" + "="*70)
        print("           MERMAID DIAGRAM VALIDATION REPORT")
        print("="*70)
        print(f"Docs path: {report['docs_path']}")
        print(f"\nDiagrams checked: {report['total_diagrams']}")
        print(f"  Valid: {report['valid_diagrams']}")
        print(f"  Invalid: {report['invalid_diagrams']}")
        print(f"\nErrors: {report['total_errors']}")
        print(f"Warnings: {report['total_warnings']}")
        
        if report['errors_by_type']:
            print("\nErrors by type:")
            for error_type, count in sorted(report['errors_by_type'].items(), key=lambda x: -x[1]):
                print(f"  {error_type}: {count}")
        
        if report['issues']:
            print("\nIssues:")
            for issue in report['issues'][:20]:
                marker = "❌" if issue['severity'] == 'error' else "⚠️"
                print(f"  {marker} [{issue['source']}] {issue.get('error_type', 'unknown')}")
                print(f"     {issue.get('message', '')}")
                if issue.get('line_number'):
                    print(f"     Line {issue['line_number']}: {issue.get('line_content', '')}")
                if issue.get('fix_suggestion'):
                    print(f"     💡 Fix: {issue['fix_suggestion']}")
            
            if len(report['issues']) > 20:
                print(f"\n  ... and {len(report['issues']) - 20} more issues")
        
        print("="*70)
        
        sys.exit(1 if report['total_errors'] > 0 else 0)
