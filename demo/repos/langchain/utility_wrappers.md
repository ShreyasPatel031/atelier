### `utility_wrappers` Module

This module provides utility wrappers for message manipulation within the `langchain_core.messages.utils` subpackage. Its primary function is to offer a flexible way to apply a function to a sequence of messages or a `PromptValue`, either directly or by returning a `RunnableLambda` for deferred execution.

### Core Functionality

The `utility_wrappers` module contains the `wrapped` function, which serves as a flexible wrapper for functions that operate on message-like representations or prompt values.

#### `wrapped`

```python
wrapped(
    messages: Sequence[MessageLikeRepresentation] | PromptValue | None = None,
    *args: _P.args,
    **kwargs: _P.kwargs,
) -> _R_co | Runnable[Sequence[MessageLikeRepresentation], _R_co]
```

This function allows a given function (`func`) to be called directly with messages or to be wrapped within a `RunnableLambda` for integration into a LangChain expression language (LCEL) chain.

**Parameters**:

*   `messages` (`Sequence[MessageLikeRepresentation] | PromptValue | None`): An optional sequence of message-like objects or a `PromptValue` to which `func` should be applied. If `None`, a `RunnableLambda` is returned.
*   `*args`: Positional arguments to be passed to the wrapped function `func`.
*   `**kwargs`: Keyword arguments to be passed to the wrapped function `func`.

**Returns**:

*   `_R_co`: The result of `func(messages, *args, **kwargs)` if `messages` is provided.
*   `Runnable[Sequence[MessageLikeRepresentation], _R_co]`: A `RunnableLambda` instance configured to call `func` with the provided `kwargs` (and potentially messages later) if `messages` is `None`.

**Purpose**:

The `wrapped` function enhances the reusability and composability of functions that process messages. By optionally returning a `RunnableLambda`, it allows these functions to seamlessly become part of LCEL chains, enabling lazy evaluation and integration into complex data flows.

### Architecture and Component Relationships

The `utility_wrappers` module is a leaf module focused on providing the `wrapped` utility function. It is part of the broader `message_manipulation` sub-module, which itself is nested under `message_utils` within the `core_messages` module.

It has a direct dependency on the `RunnableLambda` class from the [core_runnables](core_runnables.md) module, which is used when the function is intended to be integrated into an LCEL chain.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "wrapped_function", "label": "wrapped(func)", "type": "component", "link": null},
        {"id": "runnable_lambda", "label": "RunnableLambda", "type": "external", "link": "core_runnables.md"},
        {"id": "message_manipulation", "label": "message_manipulation", "type": "external", "link": "message_manipulation.md"}
    ],
    "edges": [
        {"source": "wrapped_function", "target": "runnable_lambda"}
    ],
    "groups": [
        {"id": "current_module_group", "label": "utility_wrappers", "nodes": ["wrapped_function"]}
    ]
}
-->
```mermaid
graph TD
    subgraph current_module_group [utility_wrappers]
        wrapped_function[wrapped(func)]
    end
    wrapped_function --> runnable_lambda[RunnableLambda]
    runnable_lambda --> message_manipulation[message_manipulation]
    click runnable_lambda "core_runnables.md"
    click message_manipulation "message_manipulation.md"
```

### How the Module Fits into the Overall System

The `utility_wrappers` module plays a crucial role in enabling functional programming patterns and LCEL integration for message-related utilities. It provides a mechanism to convert simple functions into "runnable" components, making them compatible with LangChain's chain and graph constructs.

It is specifically utilized by the `message_manipulation` module to provide a consistent interface for functions that can either be called immediately or deferred for later execution within an LCEL workflow. This promotes modularity and flexibility in how message processing functions are defined and used across the LangChain ecosystem. Its dependency on `core_runnables` highlights the foundational role of the runnable interface in the entire system.
