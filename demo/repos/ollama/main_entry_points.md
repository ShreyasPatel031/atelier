# Main Entry Points
This module defines the primary entry points for the application, encompassing the core application launcher, server execution, and various specialized command-line utilities for interactive models, image generation, and MLX code generation.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "core_application_launch",
            "label": "Core Application Launch",
            "type": "module",
            "link": "core_application_launch.md"
        },
        {
            "id": "specialized_execution_engines",
            "label": "Specialized Execution Engines",
            "type": "module",
            "link": "specialized_execution_engines.md"
        }
    ],
    "edges": [
        {
            "source": "core_application_launch",
            "target": "specialized_execution_engines",
            "label": "invokes specialized commands"
        }
    ],
    "groups": [
        {
            "id": "initiation",
            "label": "Initiation",
            "role": "surface",
            "nodes": [
                "core_application_launch"
            ]
        },
        {
            "id": "execution",
            "label": "Execution",
            "role": "analytical",
            "nodes": [
                "specialized_execution_engines"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph initiation["Initiation"]
        core_application_launch["Core Application Launch"]
    end

    subgraph execution["Execution"]
        specialized_execution_engines["Specialized Execution Engines"]
    end

    core_application_launch -->|
    invokes specialized commands
    | specialized_execution_engines

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class core_application_launch surface
    class specialized_execution_engines analytical

    click core_application_launch "core_application_launch.md"
    click specialized_execution_engines "specialized_execution_engines.md"
```