## Tool and Template Management
This module provides command-line functionalities for managing tools and templates, including creating, installing, and publishing tools, as well as listing and adding project templates.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "tool_create",
            "label": "Create Tool (CLI)",
            "type": "component",
            "link": null
        },
        {
            "id": "tool_install",
            "label": "Install Tool (CLI)",
            "type": "component",
            "link": null
        },
        {
            "id": "tool_publish",
            "label": "Publish Tool (CLI)",
            "type": "component",
            "link": null
        },
        {
            "id": "template_list",
            "label": "List Templates (CLI)",
            "type": "component",
            "link": null
        },
        {
            "id": "template_add",
            "label": "Add Template (CLI)",
            "type": "component",
            "link": null
        },
        {
            "id": "tool_command_api",
            "label": "Tool Command API",
            "type": "component",
            "link": null
        },
        {
            "id": "template_command_api",
            "label": "Template Command API",
            "type": "component",
            "link": null
        },
        {
            "id": "auth_settings",
            "label": "Authentication Settings",
            "type": "external",
            "link": "authentication_settings.md"
        }
    ],
    "edges": [
        {
            "source": "tool_create",
            "target": "tool_command_api",
            "label": "delegates"
        },
        {
            "source": "tool_install",
            "target": "tool_command_api",
            "label": "delegates"
        },
        {
            "source": "tool_publish",
            "target": "tool_command_api",
            "label": "delegates"
        },
        {
            "source": "template_list",
            "target": "template_command_api",
            "label": "delegates"
        },
        {
            "source": "template_add",
            "target": "template_command_api",
            "label": "delegates"
        },
        {
            "source": "tool_install",
            "target": "auth_settings",
            "label": "requires login from"
        },
        {
            "source": "tool_publish",
            "target": "auth_settings",
            "label": "requires login from"
        }
    ],
    "groups": [
        {
            "id": "tool_cli",
            "label": "Tool Management CLI",
            "role": "surface",
            "nodes": [
                "tool_create",
                "tool_install",
                "tool_publish"
            ]
        },
        {
            "id": "template_cli",
            "label": "Template Management CLI",
            "role": "surface",
            "nodes": [
                "template_list",
                "template_add"
            ]
        },
        {
            "id": "command_apis",
            "label": "Command Abstractions",
            "role": "analytical",
            "nodes": [
                "tool_command_api",
                "template_command_api"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph tool_cli["Tool Management CLI"]
        tool_create["Create Tool (CLI)"]
        tool_install["Install Tool (CLI)"]
        tool_publish["Publish Tool (CLI)"]
    end

    subgraph template_cli["Template Management CLI"]
        template_list["List Templates (CLI)"]
        template_add["Add Template (CLI)"]
    end

    subgraph command_apis["Command Abstractions"]
        tool_command_api["Tool Command API"]
        template_command_api["Template Command API"]
    end

    auth_settings["Authentication Settings"]

    tool_create -->|"delegates"| tool_command_api
    tool_install -->|"delegates"| tool_command_api
    tool_publish -->|"delegates"| tool_command_api
    template_list -->|"delegates"| template_command_api
    template_add -->|"delegates"| template_command_api

    tool_install -.->|"requires login from"| auth_settings
    tool_publish -.->|"requires login from"| auth_settings

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class tool_create,tool_install,tool_publish,template_list,template_add surface
    class tool_command_api,template_command_api analytical

    click auth_settings "authentication_settings.md" "View Authentication Settings Module"
```