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
        if str(module_name).startswith("__") and str(module_name).endswith("__"):
            continue
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
        elif len(module_data.get('description', '')) > 240:
            result.add(
                module_name,
                "DESCRIPTION_LONG",
                "Description targets ~200 characters for module tree / hover (see generation prompts)",
                Severity.WARNING,
            )
        
        # 2. Check documentation file exists (JSON preferred; legacy .md accepted)
        json_path = docs_path / f"{module_name}.json"
        md_file = docs_path / f"{module_name}.md"
        doc_obj: Optional[Dict] = None
        if json_path.exists():
            try:
                doc_obj = json.loads(json_path.read_text(encoding="utf-8", errors="replace"))
            except json.JSONDecodeError as e:
                result.add(module_name, "INVALID_MODULE_DOC_JSON", f"{module_name}.json: {e}")
                doc_obj = None
            if doc_obj is not None:
                try:
                    from codewiki.src.be.doc_schema import validate_module_doc

                    validate_module_doc(doc_obj)
                except Exception as e:
                    result.add(
                        module_name,
                        "INVALID_MODULE_DOC_SCHEMA",
                        f"{module_name}.json: {e}",
                    )
                    doc_obj = None
                summary = (doc_obj.get("summary") or "").strip()
                if len(summary) < 20:
                    result.add(
                        module_name,
                        "EMPTY_DOCUMENTATION",
                        "Documentation summary too small",
                        Severity.WARNING,
                    )
        if doc_obj is None and md_file.exists():
            content = md_file.read_text(encoding="utf-8", errors="replace")
            if len(content.strip()) < 100:
                result.add(
                    module_name,
                    "EMPTY_DOCUMENTATION",
                    "Documentation file too small",
                    Severity.WARNING,
                )
        elif doc_obj is None and not json_path.exists() and not md_file.exists():
            result.add(
                module_name,
                "MISSING_DOCUMENTATION",
                f"No documentation file: {module_name}.json or {module_name}.md",
            )

        # 3. Validate diagram on module_tree (canonical IR for the viewer)
        children = module_data.get("children", {})
        structured_diagram = module_data.get("diagram")

        if not structured_diagram:
            if children:
                result.add(
                    module_name,
                    "MISSING_STRUCTURED_DIAGRAM",
                    f"Parent module has {len(children)} children but no 'diagram' JSON",
                )
            else:
                result.add(
                    module_name,
                    "MISSING_LEAF_DIAGRAM",
                    "Leaf module missing 'diagram' JSON (should show components/dependencies)",
                )
        else:
            if "nodes" not in structured_diagram:
                result.add(module_name, "INVALID_DIAGRAM", "Diagram missing 'nodes' array")
            elif "edges" not in structured_diagram:
                result.add(module_name, "INVALID_DIAGRAM", "Diagram missing 'edges' array")
            else:
                if children:
                    node_ids = {n.get("id", "").lower() for n in structured_diagram.get("nodes", [])}
                    for child_name in children.keys():
                        if child_name.lower() not in node_ids:
                            result.add(
                                module_name,
                                "MISSING_CHILD_NODE",
                                f"Child '{child_name}' not found in diagram nodes",
                            )
        
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
    
    from codewiki.src.config import OVERVIEW_FILENAME

    overview_json = docs_path / OVERVIEW_FILENAME
    if overview_json.exists():
        try:
            odata = json.loads(overview_json.read_text(encoding="utf-8", errors="replace"))
        except json.JSONDecodeError as e:
            result.add("root", "INVALID_OVERVIEW_JSON", str(e))
        else:
            if isinstance(odata, dict):
                try:
                    from codewiki.src.be.doc_schema import validate_module_doc

                    validate_module_doc(odata)
                except Exception as e:
                    result.add("root", "INVALID_OVERVIEW_DOC", str(e))
    else:
        result.add(
            "root",
            "MISSING_OVERVIEW",
            f"{OVERVIEW_FILENAME} not found",
        )
    
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
