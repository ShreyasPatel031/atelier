"""
CodeWiki Logging Hooks Module
Agent 3 (Reliability) - Runtime logging for documentation generation

This module provides logging hooks that can be called during documentation
generation to track issues in real-time. It complements validation.py which
runs after generation.

Usage:
    from codewiki.src.be.logging_hooks import log_metadata_validation
    
    # During documentation generation:
    log_metadata_validation("module_name", "Module Title", "Description...", [])
"""

import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any

# Configure logger
logger = logging.getLogger("codewiki.reliability")

# Default log file location
LOG_FILE = Path("codewiki_reliability.log")


def _get_log_file() -> Path:
    """Get the log file path, creating parent directories if needed."""
    log_file = LOG_FILE
    log_file.parent.mkdir(parents=True, exist_ok=True)
    return log_file


def log_event(event_type: str, data: Dict[str, Any]) -> None:
    """
    Log a structured event to both the logger and file.
    
    Args:
        event_type: Type of event (e.g., "metadata_validation", "diagram_generation")
        data: Event data as a dictionary
    """
    entry = {
        "type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data
    }
    
    # Log to standard logger
    logger.info(json.dumps(entry))
    
    # Append to log file
    try:
        with open(_get_log_file(), "a") as f:
            f.write(json.dumps(entry) + "\n")
    except Exception as e:
        logger.warning(f"Failed to write to log file: {e}")


def log_metadata_validation(
    module_name: str, 
    title: str, 
    description: str, 
    issues: List[str]
) -> None:
    """
    Log metadata validation results for a module.
    
    Args:
        module_name: Name of the module being validated
        title: The module's title
        description: The module's description
        issues: List of issue codes (e.g., ["title_too_long", "missing_description"])
    """
    log_event("metadata_validation", {
        "module": module_name,
        "title": title,
        "title_word_count": len(title.split()) if title else 0,
        "description_length": len(description) if description else 0,
        "description_sentence_count": description.count('.') if description else 0,
        "issues": issues,
        "valid": len(issues) == 0
    })


def log_mermaid_generation(
    module_name: str, 
    success: bool, 
    error: Optional[str] = None,
    node_count: int = 0,
    edge_count: int = 0
) -> None:
    """
    Log mermaid diagram generation results.
    
    Args:
        module_name: Name of the module
        success: Whether diagram generation succeeded
        error: Error message if failed
        node_count: Number of nodes in the diagram
        edge_count: Number of edges in the diagram
    """
    log_event("mermaid_generation", {
        "module": module_name,
        "success": success,
        "error": error,
        "node_count": node_count,
        "edge_count": edge_count
    })


def log_documentation_generation(
    module_name: str,
    success: bool,
    file_path: Optional[str] = None,
    word_count: int = 0,
    has_diagram: bool = False,
    error: Optional[str] = None
) -> None:
    """
    Log documentation file generation results.
    
    Args:
        module_name: Name of the module
        success: Whether generation succeeded
        file_path: Path to the generated file
        word_count: Word count of the documentation
        has_diagram: Whether the doc includes a diagram
        error: Error message if failed
    """
    log_event("documentation_generation", {
        "module": module_name,
        "success": success,
        "file_path": file_path,
        "word_count": word_count,
        "has_diagram": has_diagram,
        "error": error
    })


def log_link_resolution(
    source_module: str,
    target_id: str,
    resolved: bool,
    resolved_to: Optional[str] = None
) -> None:
    """
    Log link resolution attempts.
    
    Args:
        source_module: The module containing the link
        target_id: The link target ID
        resolved: Whether the link was successfully resolved
        resolved_to: The resolved module ID (if successful)
    """
    log_event("link_resolution", {
        "source": source_module,
        "target_id": target_id,
        "resolved": resolved,
        "resolved_to": resolved_to
    })


def get_log_summary() -> Dict[str, Any]:
    """
    Read the log file and generate a summary.
    
    Returns:
        Dictionary with counts of each event type and issue breakdown
    """
    log_file = _get_log_file()
    if not log_file.exists():
        return {"events": 0, "by_type": {}}
    
    events = []
    try:
        with open(log_file, "r") as f:
            for line in f:
                line = line.strip()
                if line:
                    try:
                        events.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass
    except Exception as e:
        logger.error(f"Failed to read log file: {e}")
        return {"events": 0, "by_type": {}, "error": str(e)}
    
    # Count by type
    by_type = {}
    issues_found = []
    
    for event in events:
        event_type = event.get("type", "unknown")
        by_type[event_type] = by_type.get(event_type, 0) + 1
        
        # Collect issues from metadata validation
        if event_type == "metadata_validation":
            data = event.get("data", {})
            if data.get("issues"):
                issues_found.extend([
                    {"module": data.get("module"), "issue": issue}
                    for issue in data.get("issues", [])
                ])
    
    return {
        "events": len(events),
        "by_type": by_type,
        "issues_found": issues_found,
        "first_event": events[0].get("timestamp") if events else None,
        "last_event": events[-1].get("timestamp") if events else None
    }


def clear_log() -> None:
    """Clear the log file."""
    log_file = _get_log_file()
    if log_file.exists():
        log_file.unlink()
        logger.info("Log file cleared")


# ============================================================
# CLI for testing
# ============================================================

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "summary":
        summary = get_log_summary()
        print(json.dumps(summary, indent=2))
    elif len(sys.argv) > 1 and sys.argv[1] == "clear":
        clear_log()
        print("Log cleared")
    else:
        print("Usage:")
        print("  python logging_hooks.py summary  - Show log summary")
        print("  python logging_hooks.py clear    - Clear log file")
