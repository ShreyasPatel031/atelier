# `synchronization_wrapper`

The `synchronization_wrapper` module provides utilities for wrapping asynchronous programs to allow them to be called from a synchronous context. This is crucial for integrating asynchronous components seamlessly into predominantly synchronous workflows.

## Module Purpose and Core Functionality

The primary purpose of this module is to offer the `SyncWrapper` class, which acts as a bridge between asynchronous `dspy` modules and synchronous execution environments. It enables any `dspy.primitives.Module` that implements an `aforward` (asynchronous forward) method to be invoked synchronously, by handling the asynchronous execution internally.

## Architecture

The `synchronization_wrapper` module contains the following core component:

### `SyncWrapper` Class

- **`dspy.utils.syncify.SyncWrapper`**: This class inherits from `dspy.primitives.Module` and is designed to wrap another `dspy.primitives.Module` (referred to as `program`) that has an asynchronous `aforward` method. When its own `forward` method is called, it executes the wrapped `program`'s `aforward` method in an asynchronous event loop and waits for its completion, effectively making the asynchronous program callable synchronously.

#### Relationships

- **Inheritance**: `SyncWrapper` inherits from `[dspy_primitives.Module](dspy_primitives.md)`, making it a valid `dspy` module itself.
- **Composition**: It composes another `dspy_primitives.Module` (the `program`) that it wraps.
- **Dependency**: It relies on an external utility, `run_async`, likely found in the `[asynchronization_utilities](asynchronization_utilities.md)` module, to manage the execution of the asynchronous `aforward` method within a synchronous context.

## How it Fits into the Overall System

The `synchronization_wrapper` module is a key part of the `dspy_utilities` package, specifically within the `dspy.utils` namespace. It ensures that `dspy` programs and components that are designed to be asynchronous can still be easily used in contexts where synchronous execution is required or preferred. This enhances the flexibility and interoperability of `dspy` modules across different parts of a larger system, bridging the gap between synchronous and asynchronous code execution within the `dspy` framework.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "sync_wrapper_class", "label": "SyncWrapper", "type": "component", "link": null},
        {"id": "dspy_module", "label": "Module", "type": "external", "link": "dspy_primitives.md"},
        {"id": "async_util", "label": "run_async (Async Utility)", "type": "external", "link": "asynchronization_utilities.md"}
    ],
    "edges": [
        {"source": "sync_wrapper_class", "target": "dspy_module", "label": "inherits/wraps"},
        {"source": "sync_wrapper_class", "target": "async_util", "label": "uses"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    sync_wrapper_class[SyncWrapper]
    dspy_module[Module]
    async_util[run_async (Async Utility)]

    sync_wrapper_class -- "inherits/wraps" --> dspy_module
    sync_wrapper_class -- "uses" --> async_util
```