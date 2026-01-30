"""
Documentation File Sync Module
Agent 3 (Reliability) - Ensures all modules in tree have corresponding .md files

This module provides post-processing to fix the common issue where modules are
added to module_tree.json but no .md file is generated. This happens because:
1. The LLM adds modules to the tree via generate_sub_module_documentation
2. But the sub-agent for small modules sometimes doesn't create the file

Usage:
    from codewiki.src.be.doc_file_sync import sync_docs_with_tree
    
    # After documentation generation
    created_files = sync_docs_with_tree(docs_dir)
    print(f"Created {len(created_files)} missing documentation files")
"""

import json
import logging
import os
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Tuple

logger = logging.getLogger(__name__)


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


def generate_minimal_doc(module_name: str, module_data: Dict, components: Dict = None) -> str:
    """
    Generate a minimal documentation file for a module that's missing one.
    
    Args:
        module_name: Name of the module
        module_data: Module data from tree (has title, description, components)
        components: Optional full components dict for more detail
    
    Returns:
        Markdown content for the documentation file
    """
    title = module_data.get("title", module_name.replace("_", " ").title())
    description = module_data.get("description", f"Documentation for the {title} module.")
    component_ids = module_data.get("components", [])
    
    content = f"# {title}\n\n"
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
    content += "*This documentation was auto-generated to ensure completeness.*\n"
    
    return content


def sync_docs_with_tree(docs_dir: str, components: Dict = None) -> List[str]:
    """
    Ensure all modules in module_tree.json have corresponding .md files.
    
    Args:
        docs_dir: Path to documentation directory
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
    missing_count = 0
    
    for module_name, module_path, module_data in all_modules:
        if module_name == "overview":
            continue
            
        if module_name not in existing_files:
            missing_count += 1
            logger.warning(f"[DOC_SYNC] Missing file: {module_name}.md (path: {module_path})")
            
            # Generate minimal doc
            try:
                content = generate_minimal_doc(module_name, module_data, components)
                file_path = docs_path / f"{module_name}.md"
                
                with open(file_path, 'w') as f:
                    f.write(content)
                
                created_files.append(str(file_path))
                logger.info(f"[DOC_SYNC] Created: {module_name}.md")
                
            except Exception as e:
                logger.error(f"[DOC_SYNC] Failed to create {module_name}.md: {e}")
    
    logger.info(f"[DOC_SYNC] Complete: {missing_count} missing, {len(created_files)} created")
    
    return created_files


def add_leaf_diagrams(docs_dir: str) -> int:
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
    
    def ensure_leaf_has_diagram(node: Dict, node_name: str):
        nonlocal added
        
        children = node.get("children", {})
        
        # Recurse first
        for child_name, child_data in children.items():
            ensure_leaf_has_diagram(child_data, child_name)
        
        # If this is a leaf (no children) and has no diagram, add one
        if not children and not node.get("diagram"):
            components = node.get("components", [])
            title = node.get("title", node_name.replace("_", " ").title())
            
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
                "groups": []
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


def add_missing_metadata(docs_dir: str) -> int:
    """
    Add missing title/description to modules that don't have them.
    
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
    
    def ensure_metadata(node: Dict, node_name: str):
        nonlocal updated
        
        # Add title if missing
        if not node.get("title"):
            node["title"] = node_name.replace("_", " ").title()
            updated += 1
            logger.info(f"[DOC_SYNC] Added title to: {node_name}")
        
        # Add description if missing
        if not node.get("description"):
            title = node.get("title", node_name)
            comp_count = len(node.get("components", []))
            child_count = len(node.get("children", {}))
            
            if child_count > 0:
                node["description"] = f"Contains {child_count} sub-modules for {title.lower()} functionality."
            elif comp_count > 0:
                node["description"] = f"Provides {comp_count} component(s) for {title.lower()} operations."
            else:
                node["description"] = f"Documentation for the {title} module."
            updated += 1
            logger.info(f"[DOC_SYNC] Added description to: {node_name}")
        
        # Recurse into children
        for child_name, child_data in node.get("children", {}).items():
            ensure_metadata(child_data, child_name)
    
    for name, data in tree.items():
        ensure_metadata(data, name)
    
    if updated > 0:
        with open(tree_path, 'w') as f:
            json.dump(tree, f, indent=2)
        logger.info(f"[DOC_SYNC] Added metadata to {updated} modules")
    
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


def run_full_sync(docs_dir: str, components: Dict = None) -> Dict[str, Any]:
    """
    Run full synchronization: create missing files and update diagrams.
    
    Returns:
        Summary of what was done
    """
    logger.info(f"[DOC_SYNC] Running full sync on {docs_dir}")
    
    # Ensure overview exists
    overview_created = ensure_overview_exists(docs_dir)
    
    # First, add missing metadata (title/description)
    metadata_updates = add_missing_metadata(docs_dir)
    
    # Create missing files
    created_files = sync_docs_with_tree(docs_dir, components)
    
    # Add diagrams to leaf modules
    leaf_diagrams = add_leaf_diagrams(docs_dir)
    
    # Update parent diagrams to include children
    diagram_updates = update_tree_diagrams(docs_dir)
    
    return {
        "files_created": len(created_files),
        "created_files": created_files,
        "overview_created": overview_created,
        "metadata_updates": metadata_updates,
        "leaf_diagrams_added": leaf_diagrams,
        "diagrams_updated": diagram_updates
    }


# CLI interface
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python doc_file_sync.py <docs_dir>")
        sys.exit(1)
    
    logging.basicConfig(level=logging.INFO)
    docs_dir = sys.argv[1]
    
    result = run_full_sync(docs_dir)
    
    print(f"\nSync complete:")
    print(f"  Files created: {result['files_created']}")
    print(f"  Diagrams updated: {result['diagrams_updated']}")
    
    if result['created_files']:
        print("\nCreated files:")
        for f in result['created_files']:
            print(f"  - {f}")
