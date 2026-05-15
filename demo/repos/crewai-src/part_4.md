# Flow Definition and Management

This module defines the `Flow` class, which serves as the core orchestration engine for CrewAI. It handles the lifecycle of a flow, managing state, method execution, human feedback, and persistence mechanisms to ensure robust and interactive agent workflows.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "part_4",
            "label": "Flow Definition and Management",
            "type": "module"
        },
        {
            "id": "flow_definition_and_execution",
            "label": "Flow Definition and Execution",
            "type": "module",
            "link": "flow_definition_and_execution.md"
        }
    ],
    "edges": [],
    "groups": [
        {
            "id": "core_flow_logic",
            "label": "Core Flow Logic",
            "role": "analytical",
            "nodes": [
                "flow_definition_and_execution"
            ]
        }
    ]
}
-->

```mermaid
flowchart TD
    subgraph core_flow_logic["Core Flow Logic"]
        flow_definition_and_execution["Flow Definition and Execution"]
    end
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    class flow_definition_and_execution analytical
    click flow_definition_and_execution "flow_definition_and_execution.md"
```