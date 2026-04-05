# Async Helpers Module

The `async_helpers` module provides essential utilities for managing asynchronous operations and the Python event loop within the `pydantic_ai_slim` framework. It enables the seamless integration of synchronous code within an asynchronous context and ensures proper event loop management.

## Architecture Overview

The `async_helpers` module is composed of the `async_operations` sub-module, which encapsulates the core logic for executing functions in a separate thread and retrieving the active event loop.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "async_operations", "label": "Asynchronous Operations", "type": "module", "link": "async_operations.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    async_operations[Asynchronous Operations]
    click async_operations "async_operations.md" "View Asynchronous Operations Module"
```

## Sub-modules

* [Async Operations](async_operations.md): Provides utilities for running synchronous functions in an asynchronous context and managing the event loop.