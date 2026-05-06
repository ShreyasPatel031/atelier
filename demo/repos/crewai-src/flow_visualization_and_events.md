# Flow Visualization and Eventing
This module provides tools for visualizing CrewAI Flow structures as interactive HTML diagrams and defines core event types for flow execution. It enables introspection of flow components and provides feedback on tracing status.
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "flow_structure_analysis", "label": "Flow Structure Analysis", "type": "module", "link": "flow_structure_analysis.md"},
        {"id": "visualization_and_tracing", "label": "Visualization and Tracing", "type": "module", "link": "visualization_and_tracing.md"},
        {"id": "flow_event_definitions", "label": "Flow Event Definitions", "type": "module", "link": "flow_event_definitions.md"},
        {"id": "eventing_and_context", "label": "Eventing and Context", "type": "external"}
    ],
    "edges": [
        {"source": "flow_structure_analysis", "target": "visualization_and_tracing", "label": "structured flow data"},
        {"source": "visualization_and_tracing", "target": "eventing_and_context", "label": "emits visualization events"},
        {"source": "flow_event_definitions", "target": "eventing_and_context", "label": "defines event types"}
    ],
    "groups": [
        {"id": "flow_analysis_and_rendering", "label": "Flow Analysis and Rendering", "role": "generative", "nodes": ["flow_structure_analysis", "visualization_and_tracing"]},
        {"id": "event_management", "label": "Event Management", "role": "data", "nodes": ["flow_event_definitions", "eventing_and_context"]}
    ]
}
-->