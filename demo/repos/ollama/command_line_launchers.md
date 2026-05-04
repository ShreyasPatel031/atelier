# Command Line Launchers
This module orchestrates various command-line interactions, enabling users to run models, manage integrations, and configure settings through interactive TUI or direct commands. It handles model embedding, creation, and pushing, alongside complex integration launch workflows involving policy-based model selection and configuration persistence.

<!-- DIAGRAM_JSON
{
    "direction": "LR",
    "nodes": [
        {
            "id": "cli_core_operations",
            "label": "CLI Core Operations",
            "type": "module",
            "link": "cli_core_operations.md"
        },
        {
            "id": "integration_launch_flows",
            "label": "Integration Launch Flows",
            "type": "module",
            "link": "integration_launch_flows.md"
        },
        {
            "id": "launcher_state_and_config",
            "label": "Launcher State & Configuration",
            "type": "module",
            "link": "launcher_state_and_config.md"
        }
    ],
    "edges": [
        {
            "source": "cli_core_operations",
            "target": "integration_launch_flows",
            "label": "initiates launch"
        },
        {
            "source": "launcher_state_and_config",
            "target": "cli_core_operations",
            "label": "provides configuration"
        },
        {
            "source": "launcher_state_and_config",
            "target": "integration_launch_flows",
            "label": "manages state"
        }
    ],
    "groups": [
        {
            "id": "core_cli",
            "label": "Core CLI",
            "role": "surface",
            "nodes": [
                "cli_core_operations"
            ]
        },
        {
            "id": "integration_management",
            "label": "Integration Management",
            "role": "analytical",
            "nodes": [
                "integration_launch_flows"
            ]
        },
        {
            "id": "configuration",
            "label": "Configuration",
            "role": "data",
            "nodes": [
                "launcher_state_and_config"
            ]
        }
    ]
}
-->
```mermaid
flowchart LR
    subgraph core_cli["Core CLI"]
        cli_core_operations["CLI Core Operations"]
    end
    subgraph integration_management["Integration Management"]
        integration_launch_flows["Integration Launch Flows"]
    end
    subgraph configuration["Configuration"]
        launcher_state_and_config["Launcher State & Configuration"]
    end

    cli_core_operations -->|initiates launch| integration_launch_flows
    launcher_state_and_config -->|provides configuration| cli_core_operations
    launcher_state_and_config -->|manages state| integration_launch_flows

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class cli_core_operations surface
    class integration_launch_flows analytical
    class launcher_state_and_config data

    click cli_core_operations "cli_core_operations.md"
    click integration_launch_flows "integration_launch_flows.md"
    click launcher_state_and_config "launcher_state_and_config.md"
```