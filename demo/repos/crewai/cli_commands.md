# CLI Commands
This module provides a comprehensive set of command-line interface tools for managing crew operations, including checkpoint control, deployment, tool integration, flow execution, system configuration, and tracing.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "user", "label": "User", "type": "external"},
        {"id": "cli_commands", "label": "CLI Commands", "type": "module"},
        {"id": "checkpoint_and_state", "label": "Checkpoint & State Management", "type": "module", "link": "checkpoint_and_state.md"},
        {"id": "deployment_and_tooling", "label": "Deployment & Tooling", "type": "module", "link": "deployment_and_tooling.md"},
        {"id": "execution_and_interaction", "label": "Execution & Interaction", "type": "module", "link": "execution_and_interaction.md"},
        {"id": "system_config_and_tracing", "label": "System Configuration & Tracing", "type": "module", "link": "system_config_and_tracing.md"},
        {"id": "cli_helpers", "label": "CLI Helpers", "type": "external", "link": "cli_helpers.md"}
    ],
    "edges": [
        {"source": "user", "target": "cli_commands", "label": "invokes commands"},
        {"source": "cli_commands", "target": "checkpoint_and_state", "label": "manages state"},
        {"source": "cli_commands", "target": "deployment_and_tooling", "label": "configures deployments and tools"},
        {"source": "cli_commands", "target": "execution_and_interaction", "label": "runs and monitors processes"},
        {"source": "cli_commands", "target": "system_config_and_tracing", "label": "configures system settings"},
        {"source": "cli_commands", "target": "cli_helpers", "label": "utilizes helpers"}
    ],
    "groups": [
        {"id": "intake", "label": "Intake", "role": "surface", "nodes": ["user"]},
        {"id": "operations", "label": "CLI Operations", "role": "generative", "nodes": ["cli_commands"]},
        {"id": "core_functionality", "label": "Core Functionality", "role": "analytical", "nodes": ["checkpoint_and_state", "deployment_and_tooling", "execution_and_interaction", "system_config_and_tracing"]},
        {"id": "support", "label": "Support Utilities", "role": "analytical", "nodes": ["cli_helpers"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph intake["Intake"]
        user(("User"))
    end

    subgraph operations["CLI Operations"]
        cli_commands["CLI Commands"]
    end

    subgraph core_functionality["Core Functionality"]
        checkpoint_and_state["Checkpoint and State Management"]
        deployment_and_tooling["Deployment and Tooling"]
        execution_and_interaction["Execution and Interaction"]
        system_config_and_tracing["System Configuration and Tracing"]
    end

    subgraph support["Support Utilities"]
        cli_helpers["CLI Helpers"]
    end

    user ==>|"invokes commands"| cli_commands
    cli_commands -->|"manages state"| checkpoint_and_state
    cli_commands -->|"configures deployments and tools"| deployment_and_tooling
    cli_commands -->|"runs and monitors processes"| execution_and_interaction
    cli_commands -->|"configures system settings"| system_config_and_tracing
    cli_commands -->|"utilizes helpers"| cli_helpers

    classDef userNode fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e
    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class user userNode
    class cli_commands generative
    class checkpoint_and_state,deployment_and_tooling,execution_and_interaction,system_config_and_tracing,cli_helpers analytical

    click checkpoint_and_state "checkpoint_and_state.md" "View Checkpoint & State Management Module"
    click deployment_and_tooling "deployment_and_tooling.md" "View Deployment & Tooling Module"
    click execution_and_interaction "execution_and_interaction.md" "View Execution & Interaction Module"
    click system_config_and_tracing "system_config_and_tracing.md" "View System Configuration & Tracing Module"
    click cli_helpers "cli_helpers.md" "View CLI Helpers Module"
```