# Module: base_tool_definition

## Introduction

The `base_tool_definition` module provides the foundational `BaseTool` abstract class, which serves as the common interface for all tools within the LangChain framework. This module is critical for defining callable functionalities that agents can utilize, ensuring a consistent structure for tool implementation, input validation, execution, and observability.

## Module Purpose and Core Functionality

The primary purpose of the `base_tool_definition` module is to establish a robust and extensible contract for creating tools. Its core functionality revolves around the `BaseTool` class, which offers:

1.  **Standardized Interface**: Defines essential properties like `name`, `description`, and `args_schema` that characterize any tool.
2.  **Input Validation**: Integrates with Pydantic models or JSON schemas via `args_schema` to ensure that tool inputs conform to expected formats, reducing runtime errors.
3.  **Execution Lifecycle Management**: Provides `run` and `arun` methods that orchestrate the execution of tool-specific logic (`_run` and `_arun`), including setup, callback invocation, and error handling.
4.  **Observability**: Incorporates callback mechanisms through `core_callbacks` to allow for monitoring, logging, and tracing of tool executions.
5.  **Error Handling**: Offers flexible mechanisms to catch and manage `ToolException` and `ValidationError`, allowing for custom error responses.

## Architecture and Component Relationships

The `base_tool_definition` module primarily revolves around the `BaseTool` class and its internal methods, which interact with several external core modules.

### BaseTool Class

The `BaseTool` class inherits from `RunnableSerializable` (from [core_runnables.md](core_runnables.md)), making it a runnable component in the LangChain ecosystem. Key properties include:

*   **`name` (str)**: A unique identifier for the tool.
*   **`description` (str)**: Provides instructions and context for how a model should use the tool, often including few-shot examples.
*   **`args_schema` (Type[BaseModel] | dict | None)**: Defines the expected input arguments for the tool, typically a Pydantic `BaseModel` subclass or a JSON schema dictionary. This is crucial for input validation.
*   **`return_direct` (bool)**: If `True`, the `AgentExecutor` will stop looping after this tool's execution.
*   **`verbose` (bool)**: Controls whether the tool's progress is logged.
*   **`callbacks` (Callbacks)**: Specifies callbacks to be invoked during tool execution, integrating with the [core_callbacks.md](core_callbacks.md) module.
*   **`tags` (list[str] | None)**: Optional tags for identifying tool instances or use cases in callbacks.
*   **`metadata` (dict[str, Any] | None)**: Optional metadata for tool calls, passed to callbacks.
*   **`handle_tool_error` / `handle_validation_error`**: Mechanisms to manage `ToolException` and Pydantic `ValidationError` during execution.
*   **`response_format` (Literal["content", "content_and_artifact"])**: Dictates how the tool's output is interpreted.
*   **`extras` (dict[str, Any] | None)**: Provider-specific extra fields for advanced configurations.

### Abstract Execution Methods (`_run`, `_arun`)

*   **`_run(*args: Any, **kwargs: Any) -> Any`**: An abstract method that concrete tool implementations must override. This method contains the synchronous business logic of the tool.
*   **`_arun(*args: Any, **kwargs: Any) -> Any`**: An abstract method for asynchronous tool execution, also to be implemented by subclasses. By default, it defers to `_run` if not explicitly overridden.

### Public Execution and Lifecycle Methods (`invoke`, `ainvoke`, `run`, `arun`)

These methods manage the entire tool execution process, wrapping the abstract `_run` and `_arun` methods with input parsing, validation, and callback handling:

*   **`invoke(input: str | dict | ToolCall, config: RunnableConfig | None = None, **kwargs: Any) -> Any`**: The synchronous entry point for invoking the tool as a runnable.
*   **`ainvoke(input: str | dict | ToolCall, config: RunnableConfig | None = None, **kwargs: Any) -> Any`**: The asynchronous entry point for invoking the tool.
*   **`run(...) -> Any`**: The main synchronous method for executing the tool. It configures callbacks via `CallbackManager` from [core_callbacks.md](core_callbacks.md), parses and validates input, calls `_run`, and handles exceptions.
*   **`arun(...) -> Any`**: The main asynchronous method, similar to `run`, but using `AsyncCallbackManager` and calling `_arun`.

### Input Handling

The module provides dedicated methods to process tool inputs:

*   **`_parse_input(tool_input: str | dict, tool_call_id: str | None) -> str | dict[str, Any]`**: Validates and parses the raw input against the `args_schema`. It handles both string inputs (for single-argument tools) and dictionary inputs, integrating with Pydantic for validation. It also processes `ToolCall` objects (from [core_messages.md](core_messages.md)) for injected arguments.
*   **`_filter_injected_args(tool_input: dict) -> dict`**: Removes internal or injected arguments (like `run_manager` or certain Pydantic annotated fields) from the tool input before passing them to the core `_run` method.
*   **`_to_args_and_kwargs(tool_input: str | dict, tool_call_id: str | None) -> tuple[tuple, dict]`**: Converts the parsed tool input into positional (`*args`) and keyword (`**kwargs`) arguments suitable for calling the `_run` or `_arun` methods.

## How the Module Fits into the Overall System

The `base_tool_definition` module is a fundamental building block for the LangChain framework's agentic capabilities. It provides the essential abstraction (`BaseTool`) that all concrete tools must extend. This standardization is crucial for:

*   **Agent Development**: Agents (e.g., from `core_agents` or `classic_agents`) rely on the `BaseTool` interface to discover, understand, and invoke various functionalities, allowing them to interact with external systems, perform calculations, or retrieve information.
*   **Tool Ecosystem**: It enables the creation of a rich ecosystem of tools by ensuring consistency in their definition and execution, regardless of their specific function.
*   **Extensibility**: Developers can easily create new tools by subclassing `BaseTool` and implementing the `_run` (and optionally `_arun`) methods, adhering to the established interface.
*   **Observability and Debugging**: Its tight integration with `core_callbacks` ensures that every tool interaction can be traced and monitored, which is vital for debugging and understanding agent behavior.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "base_tool_class", "label": "BaseTool Class", "type": "component", "link": null},
        {"id": "_run_method", "label": "_run() Method", "type": "component", "link": null},
        {"id": "_arun_method", "label": "_arun() Method", "type": "component", "link": null},
        {"id": "invoke_sync", "label": "invoke()", "type": "component", "link": null},
        {"id": "invoke_async", "label": "ainvoke()", "type": "component", "link": null},
        {"id": "run_public", "label": "run() Public API", "type": "component", "link": null},
        {"id": "arun_public", "label": "arun() Public API", "type": "component", "link": null},
        {"id": "input_parsing", "label": "Input Parsing (_parse_input)", "type": "component", "link": null},
        {"id": "arg_filtering", "label": "Argument Filtering (_filter_injected_args)", "type": "component", "link": null},
        {"id": "args_kwargs_conversion", "label": "Args/Kwargs Conversion (_to_args_and_kwargs)", "type": "component", "link": null},

        {"id": "core_runnables", "label": "core_runnables", "type": "external", "link": "core_runnables.md"},
        {"id": "core_callbacks", "label": "core_callbacks", "type": "external", "link": "core_callbacks.md"},
        {"id": "core_messages", "label": "core_messages", "type": "external", "link": "core_messages.md"}
    ],
    "edges": [
        {"source": "base_tool_class", "target": "core_runnables", "label": "inherits RunnableSerializable"},
        {"source": "base_tool_class", "target": "_run_method", "label": "defines abstract"},
        {"source": "base_tool_class", "target": "_arun_method", "label": "defines abstract"},

        {"source": "invoke_sync", "target": "run_public"},
        {"source": "invoke_async", "target": "arun_public"},

        {"source": "run_public", "target": "_run_method", "label": "calls"},
        {"source": "run_public", "target": "input_parsing"},
        {"source": "run_public", "target": "arg_filtering"},
        {"source": "run_public", "target": "args_kwargs_conversion"},
        {"source": "run_public", "target": "core_callbacks", "label": "uses CallbackManager"},
        {"source": "run_public", "target": "core_runnables", "label": "uses RunnableConfig"},

        {"source": "arun_public", "target": "_arun_method", "label": "calls"},
        {"source": "arun_public", "target": "input_parsing"},
        {"source": "arun_public", "target": "arg_filtering"},
        {"source": "arun_public", "target": "args_kwargs_conversion"},
        {"source": "arun_public", "target": "core_callbacks", "label": "uses AsyncCallbackManager"},
        {"source": "arun_public", "target": "core_runnables", "label": "uses RunnableConfig"},

        {"source": "input_parsing", "target": "core_messages", "label": "handles ToolCall type"}
    ],
    "groups": []
}
-->
```

```mermaid
graph TD
    base_tool_class[BaseTool Class]
    _run_method[_run() Method]
    _arun_method[_arun() Method]
    invoke_sync[invoke()]
    invoke_async[ainvoke()]
    run_public[run() Public API]
    arun_public[arun() Public API]
    input_parsing[Input Parsing (_parse_input)]
    arg_filtering[Argument Filtering (_filter_injected_args)]
    args_kwargs_conversion[Args/Kwargs Conversion (_to_args_and_kwargs)]

    core_runnables[core_runnables]
    core_callbacks[core_callbacks]
    core_messages[core_messages]

    base_tool_class -- inherits RunnableSerializable --> core_runnables
    base_tool_class --> _run_method
    base_tool_class --> _arun_method

    invoke_sync --> run_public
    invoke_async --> arun_public

    run_public -- calls --> _run_method
    run_public --> input_parsing
    run_public --> arg_filtering
    run_public --> args_kwargs_conversion
    run_public -- uses CallbackManager --> core_callbacks
    run_public -- uses RunnableConfig --> core_runnables

    arun_public -- calls --> _arun_method
    arun_public --> input_parsing
    arun_public --> arg_filtering
    arun_public --> args_kwargs_conversion
    arun_public -- uses AsyncCallbackManager --> core_callbacks
    arun_public -- uses RunnableConfig --> core_runnables

    input_parsing -- handles ToolCall type --> core_messages
```