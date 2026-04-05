# `tool_call_hooks` Module Documentation

## Introduction

The `tool_call_hooks` module is a crucial component within the `crewai_hooks_system`, specifically designed to provide mechanisms for intercepting and modifying the behavior of tool calls made by agents. It defines wrapper classes for methods that act as hooks, allowing developers to execute custom logic *before* or *after* a tool is invoked. This enables granular control over the tool execution lifecycle, supporting functionalities like validation, logging, pre-processing arguments, or post-processing results.

This module is part of the [hook_wrappers module](hook_wrappers.md) which is a sub-module of the broader [crewai_hooks_system module](crewai_hooks_system.md).

## Architecture and Component Relationships

The `tool_call_hooks` module encapsulates two primary wrapper classes: `BeforeToolCallHookMethod` and `AfterToolCallHookMethod`. These classes are responsible for wrapping user-defined methods within `@CrewBase` classes, transforming them into callable hooks that can be triggered at specific points during a tool's invocation.

Each hook method can optionally be configured to apply only to specific tools or agents, providing flexibility in controlling when and where the hook logic is executed. Both wrappers interact with a `ToolCallHookContext` object, which provides relevant information about the ongoing tool call.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "before_tool_call_hook_method", "label": "BeforeToolCallHookMethod", "type": "component", "link": null},
        {"id": "after_tool_call_hook_method", "label": "AfterToolCallHookMethod", "type": "component", "link": null},
        {"id": "tool_hook_wrappers", "label": "tool_hook_wrappers Module", "type": "external", "link": "tool_hook_wrappers.md"},
        {"id": "tool_call_hook_context", "label": "ToolCallHookContext (Type)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "tool_hook_wrappers", "target": "before_tool_call_hook_method"},
        {"source": "tool_hook_wrappers", "target": "after_tool_call_hook_method"},
        {"source": "before_tool_call_hook_method", "target": "tool_call_hook_context"},
        {"source": "after_tool_call_hook_method", "target": "tool_call_hook_context"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    before_tool_call_hook_method[BeforeToolCallHookMethod]
    after_tool_call_hook_method[AfterToolCallHookMethod]
    tool_hook_wrappers[tool_hook_wrappers Module]
    tool_call_hook_context[ToolCallHookContext (Type)]

    tool_hook_wrappers --> before_tool_call_hook_method
    tool_hook_wrappers --> after_tool_call_hook_method
    before_tool_call_hook_method --> tool_call_hook_context
    after_tool_call_hook_method --> tool_call_hook_context
```

### Core Components

#### `BeforeToolCallHookMethod`

*   **Purpose**: This class serves as a wrapper for methods that are designated to run *before* a tool is called. It ensures that the wrapped method adheres to the expected hook signature and behavior.
*   **Functionality**:
    *   `is_before_tool_call_hook`: A boolean flag indicating its type.
    *   `__init__(self, meth: Callable[[Any, ToolCallHookContext], bool | None], tools: list[str] | None = None, agents: list[str] | None = None)`: Initializes the wrapper with the actual hook method (`meth`) and optional lists of `tools` and `agents` to which this hook applies. It also copies metadata from the original method.
    *   `__call__(self, *args: Any, **kwargs: Any) -> bool | None`: Allows the wrapped method to be called directly, executing the custom logic defined by the user. The return value (boolean or None) typically dictates whether the tool call should proceed.
    *   `__get__(self, obj: Any, objtype: type[Any] | None = None) -> Any`: Enables the wrapper to work correctly with instance methods, binding the method to an instance if present.

#### `AfterToolCallHookMethod`

*   **Purpose**: This class wraps methods intended to execute *after* a tool call has completed. It provides a way to process the results of a tool call or perform cleanup operations.
*   **Functionality**:
    *   `is_after_tool_call_hook`: A boolean flag indicating its type.
    *   `__init__(self, meth: Callable[[Any, ToolCallHookContext], str | None], tools: list[str] | None = None, agents: list[str] | None = None)`: Initializes the wrapper with the hook method (`meth`) and optional `tools` and `agents` lists. Metadata is copied from the original method.
    *   `__call__(self, *args: Any, **kwargs: Any) -> str | None`: Invokes the wrapped method. The return value (string or None) can be used to modify or provide additional information about the tool's outcome.
    *   `__get__(self, obj: Any, objtype: type[Any] | None = None) -> Any`: Ensures proper binding for instance methods.

## How the Module Fits into the Overall System

The `tool_call_hooks` module is an integral part of the CrewAI framework's extensibility, particularly within the agent's tool execution pipeline. It provides a standardized and flexible way for developers to inject custom logic into the tool usage flow without altering the core framework code.

Agents within CrewAI can be configured with various tools. By leveraging `before_tool_call` and `after_tool_call` hooks (defined using these wrappers), developers can:

*   **Validate Tool Inputs**: A `before_tool_call` hook can check if tool arguments meet specific criteria before execution.
*   **Log Tool Activity**: Both `before` and `after` hooks can be used to log tool calls, their arguments, and their results for auditing or debugging purposes.
*   **Modify Tool Arguments**: A `before_tool_call` hook can dynamically alter the arguments passed to a tool.
*   **Process Tool Outputs**: An `after_tool_call` hook can parse, summarize, or reformat the output of a tool before it's returned to the agent.
*   **Implement Retry Logic or Fallbacks**: Based on the context or result, hooks can trigger alternative actions.

This module enhances the robustness and adaptability of CrewAI agents by allowing fine-grained control over their interactions with external tools, making it easier to integrate with complex systems and enforce specific operational policies.