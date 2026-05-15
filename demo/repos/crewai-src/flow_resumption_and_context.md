# Flow Resumption and Context Management
This module enables the seamless restoration and continuation of paused workflow executions, processing human feedback and managing the asynchronous context required for resuming operations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "flow_state_restoration", "label": "Restore Flow State", "type": "module", "link": "flow_state_restoration.md"},
        {"id": "flow_execution_resumption", "label": "Resume Flow Execution", "type": "module", "link": "flow_execution_resumption.md"}
    ],
    "edges": [
        {"source": "flow_state_restoration", "target": "flow_execution_resumption", "label": "initialized flow"}
    ],
    "groups": [
        {"id": "flow_setup", "label": "Flow Setup and Loading", "role": "analytical", "nodes": ["flow_state_restoration"]},
        {"id": "flow_continuation", "label": "Flow Continuation", "role": "generative", "nodes": ["flow_execution_resumption"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph flow_setup["Flow Setup and Loading"]
        flow_state_restoration["Restore Flow State"]
    end
    subgraph flow_continuation["Flow Continuation"]
        flow_execution_resumption["Resume Flow Execution"]
    end
    flow_state_restoration -->|"initialized flow"| flow_execution_resumption
    click flow_state_restoration "flow_state_restoration.md"
    click flow_execution_resumption "flow_execution_resumption.md"

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class flow_state_restoration analytical
    class flow_execution_resumption generative
```