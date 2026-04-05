# Module: trace_context_managers

## Introduction

The `trace_context_managers` module provides essential context managers for grouping related operations into a single traceable unit within the LangChain ecosystem. It offers both synchronous (`trace_as_chain_group`) and asynchronous (`atrace_as_chain_group`) functionalities, enabling developers to create logical trace groups for better monitoring and debugging, especially when integrating with tools like LangSmith. These context managers are crucial for maintaining clear and organized trace data across complex AI applications, even when individual components are not explicitly linked in a single chain.

## Core Functionality

This module exposes two primary context managers:

### `trace_as_chain_group`

This synchronous context manager allows you to group multiple related synchronous calls under a single chain run for tracing purposes. It simplifies the process of creating a coherent trace when individual operations might otherwise appear as disconnected events.

**Key Features:**

*   **Synchronous Operation:** Designed for traditional, blocking execution flows.
*   **Trace Grouping:** Consolidates diverse operations into a single, logical trace.
*   **Configurable Tracing:** Supports custom `callback_manager`, `inputs`, `project_name`, `example_id`, `run_id`, `tags`, and `metadata` for fine-grained control over the trace.
*   **Error Handling:** Ensures proper trace termination (`on_chain_error` or `on_chain_end`) even if exceptions occur within the context.

**Usage Example:**

```python
from langchain_core.callbacks import CallbackManager
from langchain_core.language_models import ChatOpenAI
from libs.core.langchain_core.callbacks.manager import trace_as_chain_group

llm = ChatOpenAI()

llm_input = "Tell me a joke."
with trace_as_chain_group("my_joke_chain", inputs={"input": llm_input}) as manager:
    # Use the callback manager for the chain group
    print(f"Manager Run ID: {manager.run_id}")
    res = llm.invoke(llm_input, config={"callbacks": manager})
    manager.on_chain_end({"output": res.content})
    print(f"Result: {res.content}")
```

### `atrace_as_chain_group`

The asynchronous counterpart to `trace_as_chain_group`, this context manager provides the same grouping capabilities for asynchronous operations. It's ideal for applications built with `asyncio`, allowing for non-blocking trace management.

**Key Features:**

*   **Asynchronous Operation:** Designed for `await`/`async` execution flows.
*   **Trace Grouping:** Similar to its synchronous counterpart, it groups async operations into a single trace.
*   **Configurable Tracing:** Offers the same configuration options as `trace_as_chain_group` for managing trace metadata.
*   **Error Handling:** Gracefully handles exceptions in asynchronous contexts, ensuring correct trace termination.

**Usage Example:**

```python
import asyncio
from langchain_core.callbacks import AsyncCallbackManager
from langchain_core.language_models import ChatOpenAI
from libs.core.langchain_core.callbacks.manager import atrace_as_chain_group

llm = ChatOpenAI()

async def run_async_trace():
    llm_input = "Write a short poem about a cat."
    async with atrace_as_chain_group("my_cat_poem_chain", inputs={"input": llm_input}) as manager:
        # Use the async callback manager for the chain group
        print(f"Async Manager Run ID: {manager.run_id}")
        res = await llm.ainvoke(llm_input, config={"callbacks": manager})
        await manager.on_chain_end({"output": res.content})
        print(f"Async Result: {res.content}")

# To run the example:
# asyncio.run(run_async_trace())
```

## Architecture and Component Relationships

The `trace_context_managers` module resides within the `core_callbacks.trace_managers.trace_group_management` path. It acts as a leaf module providing specific context management utilities for tracing.

### Internal Components

*   `trace_as_chain_group`: The synchronous context manager function.
*   `atrace_as_chain_group`: The asynchronous context manager function.

### External Dependencies

*   **`core_tracers`**: This module provides the `_get_trace_callbacks` function, which is critical for initializing the tracing mechanism and integrating with systems like LangSmith. The context managers rely on this to set up the foundational trace callbacks. For more details, refer to the [core_tracers documentation](core_tracers.md).
*   **`core_callbacks`**: The context managers heavily depend on the core callback managers (`CallbackManager`, `AsyncCallbackManager`, `CallbackManagerForChainGroup`, `AsyncCallbackManagerForChainGroup`) defined within `core_callbacks`. These classes provide the underlying infrastructure for managing callback handlers and propagating trace events. For further information, see the [core_callbacks documentation](core_callbacks.md).
*   **`trace_group_management`**: This module is the parent of `trace_context_managers` and likely orchestrates broader trace group functionalities, though `trace_context_managers` provides the direct user-facing context managers for specific tracing patterns. Refer to [trace_group_management documentation](trace_group_management.md) for its overall role.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "trace_as_chain_group", "label": "trace_as_chain_group", "type": "component", "link": null},
        {"id": "atrace_as_chain_group", "label": "atrace_as_chain_group", "type": "component", "link": null},
        {"id": "core_tracers", "label": "core_tracers", "type": "external", "link": "core_tracers.md"},
        {"id": "core_callbacks", "label": "core_callbacks", "type": "external", "link": "core_callbacks.md"},
        {"id": "trace_group_management", "label": "trace_group_management (Parent)", "type": "external", "link": "trace_group_management.md"}
    ],
    "edges": [
        {"source": "trace_as_chain_group", "target": "core_tracers"},
        {"source": "trace_as_chain_group", "target": "core_callbacks"},
        {"source": "atrace_as_chain_group", "target": "core_tracers"},
        {"source": "atrace_as_chain_group", "target": "core_callbacks"},
        {"source": "trace_group_management", "target": "trace_as_chain_group"},
        {"source": "trace_group_management", "target": "atrace_as_chain_group"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    trace_as_chain_group[trace_as_chain_group]
    atrace_as_chain_group[atrace_as_chain_group]
    core_tracers[core_tracers]:::external
    core_callbacks[core_callbacks]:::external
    trace_group_management[trace_group_management (Parent)]:::external
    trace_as_chain_group --> core_tracers
    trace_as_chain_group --> core_callbacks
    atrace_as_chain_group --> core_tracers
    atrace_as_chain_group --> core_callbacks
    trace_group_management --> trace_as_chain_group
    trace_group_management --> atrace_as_chain_group
```
