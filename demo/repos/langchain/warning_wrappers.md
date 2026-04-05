# warning_wrappers Module Documentation

## Introduction

The `warning_wrappers` module provides utility functions for wrapping synchronous and asynchronous callables to emit deprecation warnings. It ensures that warnings are emitted only once per wrapped function call and are not triggered by internal callers, making it a robust solution for managing deprecation notifications within the system.

## Architecture Overview

The `warning_wrappers` module contains core logic for creating callable wrappers that automatically emit deprecation warnings. It exposes a primary sub-module, `deprecation_wrappers`, which encapsulates the specific implementations for handling both synchronous and asynchronous function deprecations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "deprecation_wrappers", "label": "Deprecation Warning Wrappers", "type": "module", "link": "deprecation_wrappers.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    deprecation_wrappers[Deprecation Warning Wrappers]
    click deprecation_wrappers "deprecation_wrappers.md" "View Deprecation Warning Wrappers Module"
```

## Sub-modules

### [Deprecation Warning Wrappers](deprecation_wrappers.md)

This sub-module contains the core logic for creating callable wrappers that automatically emit deprecation warnings. It includes both `warning_emitting_wrapper` for synchronous functions and `awarning_emitting_wrapper` for asynchronous functions, ensuring consistent warning behavior across different types of callable. It prevents redundant warnings and filters out internal calls to avoid unnecessary notifications.