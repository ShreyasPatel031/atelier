# Custom Event Dispatching

## Introduction

The `custom_event_dispatching` module is responsible for enabling the dispatch of custom events within the system. It provides mechanisms for both synchronous and asynchronous event propagation to registered callback handlers, allowing for flexible and extensible system behavior based on custom triggers.

This module is a part of the `event_dispatchers` sub-module within `core_callbacks`, ensuring that custom events can be integrated seamlessly into the broader callback management system.

## Architecture

The `custom_event_dispatching` module provides core utilities for dispatching events. It leverages callback managers to propagate these events to the appropriate handlers.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "event_dispatchers", "label": "Event Dispatching Functions", "type": "module", "link": "event_dispatchers.md"}
    ],
    "edges": [],
    "groups": []
}
-->
```mermaid
graph TD
    event_dispatchers[Event Dispatching Functions]
    click event_dispatchers "event_dispatchers.md" "View Event Dispatchers Module"
```

## Sub-modules

### Event Dispatching Functions (`event_dispatchers.md`)

This sub-module contains the core functions for dispatching custom events. It includes both `adispatch_custom_event` for asynchronous event handling and `dispatch_custom_event` for synchronous event handling. These functions allow developers to trigger custom events from various parts of the application, providing data payloads that can be consumed by custom callback handlers.

For more details, refer to the [Event Dispatching Functions](event_dispatchers.md) documentation.
