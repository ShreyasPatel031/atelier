# event_dispatchers Module Documentation

## Introduction

The `event_dispatchers` module provides essential functionality for dispatching custom events within the LangChain framework, supporting both synchronous and asynchronous operations. These utilities allow developers to integrate custom event handling into their applications, ensuring that events are properly associated with the correct run context without generating new run IDs. This module is a key component of the [core_callbacks](core_callbacks.md) system, enabling flexible and extensible event management.

## Core Functionality

This module exposes two primary functions for dispatching custom events:

### `adispatch_custom_event`

`adispatch_custom_event` is an asynchronous function designed to dispatch ad-hoc events to registered async callback handlers. It ensures that custom event data is associated with the current parent run, making it ideal for use within asynchronous `Runnable` objects or tools.

**Purpose:** To send custom events in an asynchronous context, allowing custom logic to be triggered by `AsyncCallbackHandler` implementations.

**Parameters:**
- `name` (str): The name of the custom event.
- `data` (Any): The data associated with the event. This data should ideally be JSON serializable.
- `config` (RunnableConfig | None): An optional configuration object. This is crucial for Python 3.10 and async operations to ensure proper context propagation.

**Raises:**
- `RuntimeError`: If no parent run ID is available, meaning the function is called outside an active run context, or if `config` is not explicitly provided in Python 3.10 async environments.

**Usage Example:**
```python
from langchain_core.callbacks import (
    AsyncCallbackHandler,
    adispatch_custom_event
)
from langchain_core.runnable import RunnableLambda

class CustomCallbackManager(AsyncCallbackHandler):
    async def on_custom_event(
        self,
        name: str,
        data: Any,
        *,n        run_id: UUID,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> None:
        print(f"Received custom event: {name} with data: {data}")

callback = CustomCallbackManager()

async def foo(inputs):
    await adispatch_custom_event("my_event", {"bar": "buzz"})
    return inputs

foo_ = RunnableLambda(foo)
await foo_.ainvoke({"a": "1"}, {"callbacks": [CustomCallbackManager()]})
```

### `dispatch_custom_event`

`dispatch_custom_event` is a synchronous function that dispatches ad-hoc events to registered synchronous callback handlers. Similar to its asynchronous counterpart, it ensures event data is linked to the current parent run.

**Purpose:** To send custom events in a synchronous context, enabling custom logic to be triggered by `BaseCallbackHandler` implementations.

**Parameters:**
- `name` (str): The name of the custom event.
- `data` (Any): The data associated with the event. This data should ideally be JSON serializable.
- `config` (RunnableConfig | None): An optional configuration object.

**Raises:**
- `RuntimeError`: If there is no parent run ID available, indicating the function is called outside an active run context.

**Usage Example:**
```python
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.callbacks import dispatch_custom_event
from langchain_core.runnables import RunnableLambda

class CustomCallbackManager(BaseCallbackHandler):
    def on_custom_event(
        self,
        name: str,
        data: Any,
        *,n        run_id: UUID,
        tags: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
        **kwargs: Any,
    ) -> None:
        print(f"Received custom event: {name} with data: {data}")

def foo(inputs):
    dispatch_custom_event("my_event", {"bar": "buzz"})
    return inputs

foo_ = RunnableLambda(foo)
foo_.invoke({"a": "1"}, {"callbacks": [CustomCallbackManager()]})
```

## Architecture and Component Relationships

The `event_dispatchers` module primarily consists of two functions, `adispatch_custom_event` and `dispatch_custom_event`, which act as entry points for dispatching custom events. These functions rely heavily on the callback management system provided by the [core_callbacks](core_callbacks.md) module and the configuration utilities from the `runnable_config` sub-module within [core_runnables](core_runnables.md).

When a custom event is dispatched, the appropriate function (`adispatch_custom_event` or `dispatch_custom_event`) first retrieves the `RunnableConfig` to determine the current execution context, including the parent run ID. It then obtains the relevant `CallbackManager` (either synchronous or asynchronous) from the [core_callbacks](core_callbacks.md) module using the configuration. Finally, the `on_custom_event` method of this `CallbackManager` is invoked, propagating the event to all registered handlers.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "adispatch_custom_event", "label": "adispatch_custom_event", "type": "component", "link": null},
        {"id": "dispatch_custom_event", "label": "dispatch_custom_event", "type": "component", "link": null},
        {"id": "runnable_config", "label": "Runnable Config (core_runnables)", "type": "external", "link": "core_runnables.md"},
        {"id": "core_callbacks", "label": "Core Callbacks", "type": "external", "link": "core_callbacks.md"}
    ],
    "edges": [
        {"source": "adispatch_custom_event", "target": "runnable_config"},
        {"source": "adispatch_custom_event", "target": "core_callbacks"},
        {"source": "dispatch_custom_event", "target": "runnable_config"},
        {"source": "dispatch_custom_event", "target": "core_callbacks"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    adispatch_custom_event[adispatch_custom_event]
    dispatch_custom_event[dispatch_custom_event]
    runnable_config[
        Runnable Config
        (core_runnables)
    ]
    core_callbacks[Core Callbacks]

    adispatch_custom_event --> runnable_config
    adispatch_custom_event --> core_callbacks
    dispatch_custom_event --> runnable_config
    dispatch_custom_event --> core_callbacks
```

## How the Module Fits into the Overall System

The `event_dispatchers` module plays a crucial role in the extensibility and observability of the LangChain ecosystem. By providing a standardized way to dispatch custom events, it allows developers to:

1.  **Enhance Observability**: Custom events can be used to signal specific occurrences within complex `Runnable` chains, enabling more detailed logging, monitoring, and debugging through custom callback handlers.
2.  **Facilitate Custom Logic**: Developers can implement `BaseCallbackHandler` or `AsyncCallbackHandler` to react to these custom events, triggering bespoke actions, data transformations, or external system integrations.
3.  **Maintain Context**: By associating events with existing run IDs, the module ensures that custom events fit seamlessly into the tracing and lineage provided by the LangChain callback system, avoiding the creation of fragmented or unrelated traces.

This module acts as a bridge, allowing the core execution logic (often within `Runnable` objects) to communicate application-specific events to the broader callback and tracing infrastructure, managed primarily by the [core_callbacks](core_callbacks.md) module. It empowers users to extend the framework's capabilities without altering its core components, promoting a clean and modular architecture.