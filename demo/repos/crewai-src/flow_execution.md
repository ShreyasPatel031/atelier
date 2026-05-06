# Flow Execution Module
This module orchestrates the lifecycle and control flow of AI agent crews, handling initialization, state management, asynchronous execution, and integration of human feedback and persistence.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "flow_definition", "label": "Flow Definition", "type": "module", "link": "flow_definition.md"},
        {"id": "flow_lifecycle", "label": "Flow Lifecycle Management", "type": "module", "link": "flow_lifecycle.md"},
        {"id": "human_feedback_integration", "label": "Human Feedback Integration", "type": "module", "link": "human_feedback_integration.md"},
        {"id": "flow_state_persistence", "label": "Flow State Persistence", "type": "module", "link": "flow_state_persistence.md"},
        {"id": "flow_eventing", "label": "Flow Eventing", "type": "module", "link": "flow_eventing.md"}
    ],
    "edges": [
        {"source": "flow_definition", "target": "flow_lifecycle", "label": "defines structure"},
        {"source": "flow_lifecycle", "target": "human_feedback_integration", "label": "requests/processes feedback"},
        {"source": "flow_lifecycle", "target": "flow_state_persistence", "label": "saves/loads state"},
        {"source": "flow_lifecycle", "target": "flow_eventing", "label": "emits events"},
        {"source": "human_feedback_integration", "target": "flow_state_persistence", "label": "persists pending feedback"},
        {"source": "flow_state_persistence", "target": "flow_lifecycle", "label": "restores state"}
    ],
    "groups": [
        {"id": "core_flow", "label": "Core Flow Logic", "role": "analytical", "nodes": ["flow_definition", "flow_lifecycle"]},
        {"id": "interaction_data", "label": "Interaction and Data Management", "role": "data", "nodes": ["human_feedback_integration", "flow_state_persistence"]},
        {"id": "monitoring", "label": "Monitoring and Events", "role": "generative", "nodes": ["flow_eventing"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph core_flow["Core Flow Logic"]
        flow_definition[
            Flow Definition
        ]
        flow_lifecycle[
            Flow Lifecycle Management
        ]
    end

    subgraph interaction_data["Interaction and Data Management"]
        human_feedback_integration[
            Human Feedback Integration
        ]
        flow_state_persistence[
            Flow State Persistence
        ]
    end

    subgraph monitoring["Monitoring and Events"]
        flow_eventing[
            Flow Eventing
        ]
    end

    flow_definition -->|
        defines structure
    | flow_lifecycle
    flow_lifecycle -->|
        requests/processes feedback
    | human_feedback_integration
    flow_lifecycle -->|
        saves/loads state
    | flow_state_persistence
    flow_lifecycle -->|
        emits events
    | flow_eventing
    human_feedback_integration -->|
        persists pending feedback
    | flow_state_persistence
    flow_state_persistence -->|
        restores state
    | flow_lifecycle

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class flow_definition,flow_lifecycle analytical
    class human_feedback_integration,flow_state_persistence data
    class flow_eventing generative

    click flow_definition "flow_definition.md"
    click flow_lifecycle "flow_lifecycle.md"
    click human_feedback_integration "human_feedback_integration.md"
    click flow_state_persistence "flow_state_persistence.md"
    click flow_eventing "flow_eventing.md"
```