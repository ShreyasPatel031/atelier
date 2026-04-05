# Async Program Execution

The `async_program_execution` module provides the foundational mechanisms for executing DSPy programs asynchronously, enabling non-blocking operations and improved responsiveness in applications. It ensures that program execution respects thread-local context overrides, crucial for managing state in concurrent environments.

## Architecture Overview

This module encapsulates the core logic required for transforming synchronous DSPy programs into their asynchronous counterparts. It relies on internal components to manage program wrapping and execution flow. Its functionality is closely related to [concurrency_management.md](concurrency_management.md), which handles rate limiting and concurrent access within the broader [asynchronization_utilities.md](asynchronization_utilities.md) module.

## High-Level Functionality

- **[Core Program Execution](program_execution_core.md):** Manages the core asynchronous execution flow and ensures proper handling of context overrides.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "program_execution_core", "label": "Core Program Execution", "type": "module", "link": "program_execution_core.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    program_execution_core[Core Program Execution]
    click program_execution_core "program_execution_core.md" "View Core Program Execution Module"
```
