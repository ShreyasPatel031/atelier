# `deprecation_wrappers` Module Documentation

The `deprecation_wrappers` module provides core utilities for managing deprecation warnings within the system, specifically by offering wrapper functions that emit warnings when deprecated synchronous or asynchronous functions are called. It ensures that users are informed about deprecated functionalities while allowing for a controlled transition to newer APIs.

### Purpose and Core Functionality

This module contains two primary wrapper functions: `warning_emitting_wrapper` and `awarning_emitting_wrapper`. These wrappers are designed to be used as decorators or Higher-Order Functions to encapsulate deprecated callable objects.

When a function wrapped by `warning_emitting_wrapper` (for synchronous functions) or `awarning_emitting_wrapper` (for asynchronous functions) is invoked:
1.  It checks if a deprecation warning has already been issued for this specific instance to prevent redundant warnings.
2.  It verifies if the caller is internal to the system. Warnings are typically suppressed for internal calls to avoid cluttering internal logs during development and testing.
3.  If a warning has not been emitted and the caller is external, a deprecation warning is issued.
4.  Finally, the original wrapped function is executed and its result is returned.

This mechanism allows developers to seamlessly mark functions as deprecated without altering their core logic, providing a clear path for users to adapt to API changes.

### Architecture and Component Relationships

The `deprecation_wrappers` module is a leaf module within the `core_api.deprecation_warnings.warning_wrappers` hierarchy. It depends on functions for emitting warnings and determining caller origin, which are expected to be provided by its parent modules.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "warning_emitting_wrapper", "label": "warning_emitting_wrapper", "type": "component", "link": null},
        {"id": "awarning_emitting_wrapper", "label": "awarning_emitting_wrapper", "type": "component", "link": null},
        {"id": "emit_warning", "label": "emit_warning()", "type": "external", "link": "warning_wrappers.md"},
        {"id": "is_caller_internal", "label": "is_caller_internal()", "type": "external", "link": "warning_wrappers.md"}
    ],
    "edges": [
        {"source": "warning_emitting_wrapper", "target": "emit_warning"},
        {"source": "warning_emitting_wrapper", "target": "is_caller_internal"},
        {"source": "awarning_emitting_wrapper", "target": "emit_warning"},
        {"source": "awarning_emitting_wrapper", "target": "is_caller_internal"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    warning_emitting_wrapper[warning_emitting_wrapper]
    awarning_emitting_wrapper[awarning_emitting_wrapper]
    emit_warning[emit_warning()]
    is_caller_internal[is_caller_internal()]

    warning_emitting_wrapper --> emit_warning
    warning_emitting_wrapper --> is_caller_internal
    awarning_emitting_wrapper --> emit_warning
    awarning_emitting_wrapper --> is_caller_internal
```

**Components:**

*   **`warning_emitting_wrapper`**: A synchronous function wrapper that emits a deprecation warning on its first external call.
*   **`awarning_emitting_wrapper`**: An asynchronous function wrapper that emits a deprecation warning on its first external call.

**Dependencies:**

*   **`emit_warning()`**: This function is responsible for the actual mechanism of emitting a deprecation warning. It is an external dependency, likely defined in the [warning_wrappers.md](warning_wrappers.md) module.
*   **`is_caller_internal()`**: This function determines if the caller of the wrapped function is an internal component of the system. This is an external dependency, also likely found in the [warning_wrappers.md](warning_wrappers.md) module.

### How the Module Fits into the Overall System

The `deprecation_wrappers` module is a fundamental part of the API deprecation strategy within the `core_api`. By providing robust and consistent wrappers for handling deprecation warnings, it ensures:

*   **Backward Compatibility**: Allows for a grace period where old functionalities still work but inform users of upcoming changes.
*   **Maintainability**: Centralizes the logic for deprecation warnings, making it easier to manage and update warning behaviors across the system.
*   **Developer Experience**: Provides clear guidance to developers about which parts of the API are being phased out, helping them migrate their code proactively.

This module is integrated into `core_api.deprecation_warnings.warning_wrappers` which is part of `core_api.deprecation_warnings`, indicating its role in a broader system for managing API evolution and communicating changes to users.