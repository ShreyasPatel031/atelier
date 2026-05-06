# Version Control and Release Management
This module provides command-line tools to manage software versions. It automates package version bumps, handles Git operations for branching and committing, and streamlines the creation of release tags and GitHub releases, along with documentation updates.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "version_bump_process", "label": "Manage Version Bumps", "type": "component", "link": null},
        {"id": "release_tag_process", "label": "Manage Release Tags", "type": "component", "link": null},
        {"id": "git_commands", "label": "Git Operations", "type": "external", "link": null},
        {"id": "github_interaction", "label": "GitHub API/CLI Interaction", "type": "external", "link": null},
        {"id": "documentation_module", "label": "Documentation Management", "type": "external", "link": "documentation_management.md"}
    ],
    "edges": [
        {"source": "version_bump_process", "target": "git_commands", "label": "modifies code via"},
        {"source": "version_bump_process", "target": "github_interaction", "label": "creates PR on"},
        {"source": "release_tag_process", "target": "git_commands", "label": "tags repository via"},
        {"source": "release_tag_process", "target": "github_interaction", "label": "creates release on"},
        {"source": "release_tag_process", "target": "documentation_module", "label": "triggers updates in"}
    ],
    "groups": [
        {"id": "core_versioning", "label": "Core Versioning Logic", "role": "surface", "nodes": ["version_bump_process", "release_tag_process"]},
        {"id": "external_systems", "label": "External System Interfaces", "role": "generative", "nodes": ["git_commands", "github_interaction", "documentation_module"]}
    ]
}
-->