# Developer Tools and Utilities
This module provides essential tools for managing the development lifecycle, including version control for bumping and tagging releases, and automated documentation generation and checking to ensure codebase changes are well-documented.
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "version_control", "label": "Version Control", "type": "module", "link": "version_control.md"},
        {"id": "documentation_management", "label": "Documentation Management", "type": "module", "link": "documentation_management.md"}
    ],
    "edges": [
        {"source": "version_control", "target": "documentation_management", "label": "triggers updates"}
    ],
    "groups": [
        {"id": "dev_workflow", "label": "Developer Workflow", "role": "analytical", "nodes": ["version_control", "documentation_management"]}
    ]
}
-->