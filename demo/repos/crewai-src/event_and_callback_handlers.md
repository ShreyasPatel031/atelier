# Event and Callback Handlers

This module manages event handling, specifically processing LLM stream chunks, and provides utilities to convert string representations of functions into executable callbacks for dynamic event orchestration.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "event_bus_ext", "label": "Event Bus", "type": "external", "link": "eventing_and_context.md"},
        {"id": "llm_stream_event", "label": "LLM Stream Chunk Event", "type": "component", "link": null},
        {"id": "stream_handler_comp", "label": "Handle LLM Stream Chunks", "type": "component", "link": null},
        {"id": "event_queue", "label": "Asynchronous/Synchronous Queue", "type": "component", "link": null},
        {"id": "string_to_callable_comp", "label": "Resolve Dotted Path Callbacks", "type": "component", "link": null},
        {"id": "callable_func", "label": "Resolved Callable Function", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "event_bus_ext", "target": "llm_stream_event", "label": "emits"},
        {"source": "llm_stream_event", "target": "stream_handler_comp", "label": "processed by"},
        {"source": "stream_handler_comp", "target": "event_queue", "label": "enqueues chunk"},
        {"source": "string_to_callable_comp", "target": "callable_func", "label": "returns"}
    ],
    "groups": [
        {"id": "event_processing", "label": "Event Processing", "role": "analytical", "nodes": ["llm_stream_event", "stream_handler_comp", "event_queue"]},
        {"id": "callback_management", "label": "Callback Management", "role": "generative", "nodes": ["string_to_callable_comp", "callable_func"]}
    ]
}
-->