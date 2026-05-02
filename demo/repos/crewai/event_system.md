# Event System

This module provides the core event handling infrastructure for CrewAI, including a singleton event bus, event definitions, context management, and event recording for traceability and checkpointing.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "event_bus_and_context", "label": "Event Bus and Context", "type": "module", "link": "event_bus_and_context.md"},
        {"id": "event_definitions", "label": "Event Definitions", "type": "module", "link": "event_definitions.md"},
        {"id": "event_record_and_checkpointing", "label": "Event Record and Checkpointing", "type": "module", "link": "event_record_and_checkpointing.md"}
    ],
    "edges": [
        {"source": "event_definitions", "target": "event_bus_and_context", "label": "emitted to"},
        {"source": "event_bus_and_context", "target": "event_record_and_checkpointing", "label": "records"},
        {"source": "event_record_and_checkpointing", "target": "event_definitions", "label": "uses"}
    ],
    "groups": [
        {"id": "event_flow", "label": "Event Flow", "role": "analytical", "nodes": ["event_bus_and_context", "event_definitions", "event_record_and_checkpointing"]}
    ]
}
-->

```mermaid
flowchart TD
    subgraph event_flow["Event Flow"]
        event_definitions["Event Definitions"]
        event_bus_and_context["Event Bus and Context"]
        event_record_and_checkpointing["Event Record and Checkpointing"]
    end

    event_definitions -->|'''emitted to'''| event_bus_and_context
    event_bus_and_context -->|'''records'''| event_record_and_checkpointing
    event_record_and_checkpointing -->|'''uses'''| event_definitions

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    click event_bus_and_context "event_bus_and_context.md"
    click event_definitions "event_definitions.md"
    click event_record_and_checkpointing "event_record_and_checkpointing.md"
```