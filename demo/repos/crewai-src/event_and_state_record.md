# event_and_state_record
This module provides a directed record for managing execution events and a utility function for resolving event types.

<!-- DIAGRAM_JSON
{
  "nodes": [
    {
      "id": "EventRecord",
      "label": "EventRecord",
      "type": "class"
    },
    {
      "id": "_resolve_event",
      "label": "_resolve_event",
      "type": "function"
    }
  ],
  "edges": [],
  "groups": [
    {
      "id": "event_and_state_record",
      "label": "event_and_state_record",
      "contains": ["EventRecord", "_resolve_event"]
    }
  ]
}
-->
```mermaid
flowchart TD
    subgraph event_and_state_record
        EventRecord[EventRecord]
        _resolve_event[_resolve_event]
    end

    classDef recordStyle fill:#DAE8FC,stroke:#6C8EBF
    classDef functionStyle fill:#D5E8D4,stroke:#82B366

    class EventRecord recordStyle
    class _resolve_event functionStyle
```