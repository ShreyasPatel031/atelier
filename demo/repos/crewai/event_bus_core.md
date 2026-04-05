# `event_bus_core`

## Introduction
The `event_bus_core` module provides the foundational `CrewAIEventsBus` class, a singleton event bus responsible for managing and dispatching events across the CrewAI system. It supports both synchronous and asynchronous event handlers, gracefully managing their execution with dependency resolution and robust error handling. This module is a critical component for enabling decoupled communication and extensible behavior within CrewAI.

## Architecture and Component Relationships

The `CrewAIEventsBus` is the central component within this module. It coordinates with several other modules to fulfill its responsibilities:
- It relies on `event_definitions` for the types of events it handles, such as `BaseEvent` and `LLMStreamChunkEvent`.
- It interacts with `event_context_management` to maintain event scope and generate unique event IDs for tracing and hierarchical event structures.
- It is a core part of `event_bus_management`, which orchestrates the overall event bus functionality.

Internally, `CrewAIEventsBus` utilizes:
- A `ThreadPoolExecutor` to run synchronous handlers without blocking the main thread.
- A dedicated `asyncio` event loop running in a daemon thread for efficient execution of asynchronous handlers.
- A read-write lock (`_rwlock`) to ensure thread-safe access during handler registration and emission.
- Dependency injection via `Depends` to manage the order of handler execution, preventing race conditions and ensuring logical flow.
- A console formatter for consistent error logging.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "CrewAIEventsBus", "label": "CrewAIEventsBus", "type": "component", "link": null},
        {"id": "on_method", "label": "on() - Register Handler", "type": "component", "link": null},
        {"id": "emit_method", "label": "emit() - Emit Event", "type": "component", "link": null},
        {"id": "flush_method", "label": "flush() - Wait for Handlers", "type": "component", "link": null},
        {"id": "shutdown_method", "label": "shutdown() - Terminate Bus", "type": "component", "link": null},
        {"id": "event_context_management", "label": "Event Context Management", "type": "external", "link": "event_context_management.md"},
        {"id": "event_definitions", "label": "Event Definitions", "type": "external", "link": "event_definitions.md"},
        {"id": "event_bus_management", "label": "Event Bus Management", "type": "external", "link": "event_bus_management.md"}
    ],
    "edges": [
        {"source": "on_method", "target": "CrewAIEventsBus"},
        {"source": "emit_method", "target": "CrewAIEventsBus"},
        {"source": "flush_method", "target": "CrewAIEventsBus"},
        {"source": "shutdown_method", "target": "CrewAIEventsBus"},
        {"source": "CrewAIEventsBus", "target": "event_context_management"},
        {"source": "CrewAIEventsBus", "target": "event_definitions"},
        {"source": "event_bus_management", "target": "CrewAIEventsBus"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    on_method[on() - Register Handler]
    emit_method[emit() - Emit Event]
    flush_method[flush() - Wait for Handlers]
    shutdown_method[shutdown() - Terminate Bus]
    CrewAIEventsBus[CrewAIEventsBus]
    event_context_management[Event Context Management]:::external
    event_definitions[Event Definitions]:::external
    event_bus_management[Event Bus Management]:::external

    on_method --> CrewAIEventsBus
    emit_method --> CrewAIEventsBus
    flush_method --> CrewAIEventsBus
    shutdown_method --> CrewAIEventsBus
    CrewAIEventsBus --> event_context_management
    CrewAIEventsBus --> event_definitions
    event_bus_management --> CrewAIEventsBus

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

## Core Functionality

The `CrewAIEventsBus` offers the following key functionalities:

-   **Singleton Pattern**: Ensures a single, globally accessible instance of the event bus, preventing multiple redundant event systems.
-   **Handler Registration (`on`)**: Allows developers to register synchronous or asynchronous functions as event handlers for specific event types. It supports defining dependencies between handlers using the `Depends` object, ensuring a specific execution order.
-   **Event Emission (`emit`, `aemit`)**: Dispatches events to all registered handlers. It intelligently routes events to appropriate executors (thread pool for sync, dedicated async loop for async) and respects handler dependencies. `aemit` provides an asynchronous way to emit events, primarily for async contexts.
-   **Lazy Initialization**: The internal `ThreadPoolExecutor` and `asyncio` event loop are only initialized when the first event is emitted, optimizing startup performance.
-   **Dependency Resolution**: Builds and caches execution plans for handlers with dependencies, ensuring that dependent handlers run only after their prerequisites are met. This mechanism also includes validation to detect circular dependencies.
-   **Graceful Shutdown (`shutdown`)**: Provides a mechanism to gracefully stop the event bus, allowing all pending tasks to complete before termination or cancelling them immediately.
-   **Blocking Flush (`flush`)**: Enables blocking the execution until all currently pending event handlers have completed, useful for ensuring event processing before proceeding with subsequent operations.
-   **Scoped Handlers (`scoped_handlers`)**: A context manager that allows temporary registration of handlers, which are automatically cleared upon exiting the context, useful for testing or isolated scenarios.
-   **Error Handling**: Catches exceptions in handlers during emission and logs them using an internal `ConsoleFormatter`, preventing a single handler failure from crashing the entire event bus.

## Integration with the Overall System

The `event_bus_core` module, through its `CrewAIEventsBus`, acts as the central communication hub for the entire CrewAI framework. It allows various components, such as agents, tasks, and tools, to emit events and react to events without direct coupling. This design promotes modularity, testability, and extensibility.

Examples of its integration include:
-   **Agent Communication**: Agents can emit events to signal state changes, task completion, or requests for other agents.
-   **Tracing and Monitoring**: Events can be intercepted by [Tracing Utilities](tracing_utilities.md) to log and visualize the flow of execution within a crew.
-   **Flow Management**: [Flow Events](flow_events.md) can leverage the event bus to signal transitions between different stages of a CrewAI workflow.
-   **A2A Communication**: In Agent-to-Agent communication ([A2A Events](a2a_events.md)), the event bus can be used to coordinate complex interactions.

By providing a robust and flexible eventing system, `event_bus_core` is fundamental to the dynamic and collaborative nature of CrewAI applications.
