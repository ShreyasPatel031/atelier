#!/usr/bin/env python3
"""
Documentation Validation Module

Validates generated documentation for:
1. Diagram generation - each module with children must have a diagram with submodules as nodes
2. Mermaid rendering - syntax validation for Mermaid diagrams
3. Metadata - title, description, and documentation for each module

Usage:
    python codewiki/src/be/validation.py <docs_path>
    
Example:
    python codewiki/src/be/validation.py demo/repos/KubeElasti
"""

import json
import re
import sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum


class Severity(Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"


@dataclass
class ValidationIssue:
    module: str
    code: str
    message: str
    severity: Severity = Severity.ERROR
    
    def __str__(self):
        return f"[{self.module}] {self.code}: {self.message}"


@dataclass
class ValidationResult:
    issues: List[ValidationIssue] = field(default_factory=list)
    
    @property
    def errors(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == Severity.ERROR]
    
    @property
    def warnings(self) -> List[ValidationIssue]:
        return [i for i in self.issues if i.severity == Severity.WARNING]
    
    @property
    def passed(self) -> bool:
        return len(self.errors) == 0
    
    def add(self, module: str, code: str, message: str, severity: Severity = Severity.ERROR):
        self.issues.append(ValidationIssue(module, code, message, severity))
    
    def merge(self, other: 'ValidationResult'):
        self.issues.extend(other.issues)


# ============================================================
# MERMAID EXTRACTION & VALIDATION
# ============================================================

def extract_mermaid_from_markdown(content: str) -> Optional[str]:
    """Extract the first Mermaid diagram from markdown content."""
    pattern = r'```mermaid\s*([\s\S]*?)```'
    match = re.search(pattern, content)
    return match.group(1).strip() if match else None


def extract_diagram_nodes(diagram: str) -> List[str]:
    """Extract node IDs from a Mermaid diagram."""
    nodes = set()
    
    # Pattern for node definitions: nodeId[Label] or nodeId["Label"]
    node_def_pattern = r'\b([A-Za-z_][A-Za-z0-9_]*)\s*\[(?:"[^"]+"|[^\]]+)\]'
    for match in re.finditer(node_def_pattern, diagram):
        nodes.add(match.group(1).lower())
    
    # Pattern for edges: A --> B or A -> B
    edge_pattern = r'\b([A-Za-z_][A-Za-z0-9_]*)\s*(?:-->|->|--)\s*([A-Za-z_][A-Za-z0-9_]*)'
    for match in re.finditer(edge_pattern, diagram):
        nodes.add(match.group(1).lower())
        nodes.add(match.group(2).lower())
    
    # Pattern for subgraph labels
    subgraph_pattern = r'subgraph\s+([A-Za-z_][A-Za-z0-9_]*)'
    for match in re.finditer(subgraph_pattern, diagram):
        nodes.add(match.group(1).lower())
    
    return list(nodes)


def validate_mermaid_syntax(diagram: str, module: str, result: ValidationResult):
    """Validate Mermaid diagram syntax."""
    
    # Check for valid diagram type
    valid_pattern = r'^(graph|flowchart)\s+(TD|TB|LR|RL|BT)'
    if not re.search(valid_pattern, diagram, re.MULTILINE):
        # Check for forbidden types
        forbidden = ['classDiagram', 'sequenceDiagram', 'stateDiagram', 'erDiagram', 'pie']
        for ftype in forbidden:
            if diagram.strip().startswith(ftype):
                result.add(module, "FORBIDDEN_DIAGRAM_TYPE", 
                          f"Uses '{ftype}' - only graph/flowchart TD allowed")
                return
        result.add(module, "INVALID_MERMAID", 
                  "Diagram must start with 'graph TD' or 'flowchart TD'")
    
    # Check for balanced brackets
    if diagram.count('[') != diagram.count(']'):
        result.add(module, "SYNTAX_ERROR", "Unbalanced square brackets")
    
    if diagram.count('(') != diagram.count(')'):
        result.add(module, "SYNTAX_ERROR", "Unbalanced parentheses")
    
    # Check subgraph/end balance
    subgraph_count = len(re.findall(r'\bsubgraph\b', diagram))
    end_count = len(re.findall(r'\bend\b', diagram))
    if subgraph_count != end_count:
        result.add(module, "SYNTAX_ERROR", 
                  f"Unbalanced subgraph/end ({subgraph_count} subgraph, {end_count} end)")


# ============================================================
# MODULE TREE VALIDATION
# ============================================================

def validate_module_tree(
    tree: Dict, 
    docs_path: Path, 
    result: ValidationResult,
    parent_name: str = "",
    immediate_parent: str = ""
):
    """Recursively validate module tree structure."""
    
    for module_name, module_data in tree.items():
        full_name = f"{parent_name}.{module_name}" if parent_name else module_name
        
        # Skip "echo" modules - child has same name as parent (LLM artifact)
        if module_name == immediate_parent:
            children = module_data.get('children', {})
            if children:
                validate_module_tree(children, docs_path, result, full_name, module_name)
            continue
        
        # 1. Check metadata (title, description)
        if 'title' not in module_data or not module_data.get('title'):
            result.add(module_name, "MISSING_TITLE", "Module missing 'title'")
        elif len(module_data.get('title', '').split()) > 6:
            result.add(module_name, "TITLE_TOO_LONG", 
                      "Title should be 2-4 words", Severity.WARNING)
        
        if 'description' not in module_data or not module_data.get('description'):
            result.add(module_name, "MISSING_DESCRIPTION", "Module missing 'description'")
        elif len(module_data.get('description', '').split('.')) > 3:
            result.add(module_name, "DESCRIPTION_TOO_LONG", 
                      "Description should be 1-2 sentences", Severity.WARNING)
        
        # 2. Check documentation file exists
        md_file = docs_path / f"{module_name}.md"
        if not md_file.exists():
            result.add(module_name, "MISSING_DOCUMENTATION", 
                      f"No documentation file: {module_name}.md")
        else:
            content = md_file.read_text()
            
            # Check documentation has content
            if len(content.strip()) < 100:
                result.add(module_name, "EMPTY_DOCUMENTATION", 
                          "Documentation file too small", Severity.WARNING)
            
            # 3. Validate diagram - EVERY module must have a diagram
            children = module_data.get('children', {})
            structured_diagram = module_data.get('diagram')
            
            if not structured_diagram:
                if children:
                    result.add(module_name, "MISSING_STRUCTURED_DIAGRAM", 
                              f"Parent module has {len(children)} children but no 'diagram' JSON")
                else:
                    result.add(module_name, "MISSING_LEAF_DIAGRAM", 
                              "Leaf module missing 'diagram' JSON (should show components/dependencies)")
            else:
                # Validate structured diagram has required fields
                if 'nodes' not in structured_diagram:
                    result.add(module_name, "INVALID_DIAGRAM", "Diagram missing 'nodes' array")
                elif 'edges' not in structured_diagram:
                    result.add(module_name, "INVALID_DIAGRAM", "Diagram missing 'edges' array")
                else:
                    # For parent modules, check all children are nodes
                    if children:
                        node_ids = {n.get('id', '').lower() for n in structured_diagram.get('nodes', [])}
                        for child_name in children.keys():
                            if child_name.lower() not in node_ids:
                                result.add(module_name, "MISSING_CHILD_NODE", 
                                          f"Child '{child_name}' not found in diagram nodes")
        
        # Recurse into children
        children = module_data.get('children', {})
        if children:
            validate_module_tree(children, docs_path, result, full_name, module_name)


# ============================================================
# MAIN VALIDATION ENTRY POINT
# ============================================================

def validate_docs(docs_path: Path) -> ValidationResult:
    """
    Validate documentation at the given path.
    
    Args:
        docs_path: Path to documentation directory (e.g., demo/repos/KubeElasti)
    
    Returns:
        ValidationResult with all issues found
    """
    result = ValidationResult()
    
    # Check module_tree.json exists
    tree_path = docs_path / "module_tree.json"
    if not tree_path.exists():
        result.add("root", "MISSING_MODULE_TREE", 
                  f"module_tree.json not found at {docs_path}")
        return result
    
    # Load and validate tree
    try:
        tree = json.loads(tree_path.read_text())
    except json.JSONDecodeError as e:
        result.add("root", "INVALID_MODULE_TREE", f"JSON parse error: {e}")
        return result
    
    # Validate the tree
    validate_module_tree(tree, docs_path, result)
    
    # Check overview.md
    overview_path = docs_path / "overview.md"
    if not overview_path.exists():
        result.add("root", "MISSING_OVERVIEW", "overview.md not found")
    else:
        content = overview_path.read_text()
        diagram = extract_mermaid_from_markdown(content)
        if diagram:
            validate_mermaid_syntax(diagram, "overview", result)
    
    return result


def print_result(result: ValidationResult):
    """Pretty print validation results."""
    if result.passed:
        print(f"✅ PASSED - No errors, {len(result.warnings)} warnings")
    else:
        print(f"❌ FAILED - Errors: {len(result.errors)}, Warnings: {len(result.warnings)}")
    
    if result.errors:
        print("\n🔴 ERRORS:")
        for issue in result.errors:
            print(f"  {issue}")
    
    if result.warnings:
        print("\n🟡 WARNINGS:")
        for issue in result.warnings:
            print(f"  {issue}")


# ============================================================
# CLI
# ============================================================

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python validation.py <docs_path>")
        print("Example: python validation.py demo/repos/KubeElasti")
        sys.exit(1)
    
    docs_path = Path(sys.argv[1])
    if not docs_path.exists():
        print(f"Error: Path not found: {docs_path}")
        sys.exit(1)
    
    result = validate_docs(docs_path)
    print_result(result)
    
    sys.exit(0 if result.passed else 1)
