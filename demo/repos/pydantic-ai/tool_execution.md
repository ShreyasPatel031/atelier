# Module: `tool_execution`

## Introduction

The `tool_execution` module is a crucial component within the [Agent Execution Graph](agent_execution_graph.md) of the [Pydantic AI Agent Core](pydantic_ai_agent_core.md). Its primary responsibility is to orchestrate the execution of tool calls initiated by the agent and to manage the various outcomes of these executions, including successful returns, denials, and retries. This module ensures that the agent can effectively interact with external tools and process their responses in a structured manner.

## Architecture and Component Relationships

The `tool_execution` module is a leaf module, focusing on the intricate logic of executing a single tool call. It relies on the [Tool Output Management](tool_output_management.md) module for the actual execution of tools and handles the subsequent processing of results.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "_call_tool", "label": "_call_tool Function", "type": "component", "link": null},
        {"id": "tool_manager", "label": "Tool Output Management", "type": "external", "link": "tool_output_management.md"},
        {"id": "tool_call_input", "label": "Tool Call Input (ValidatedToolCall / ToolCallPart)", "type": "component", "link": null},
        {"id": "tool_result_processing", "label": "Tool Result & Retry Processing", "type": "component", "link": null},
        {"id": "tool_return_output", "label": "Tool Return Part / Retry Prompt Part (Output)", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "tool_call_input", "target": "_call_tool"},
        {"source": "_call_tool", "target": "tool_manager"},
        {"source": "tool_manager", "target": "_call_tool"},
        {"source": "_call_tool", "target": "tool_result_processing"},
        {"source": "tool_result_processing", "target": "tool_return_output"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    _call_tool[_call_tool Function]
    tool_manager[Tool Output Management]
    click tool_manager "tool_output_management.md"

    tool_call_input[Tool Call Input (ValidatedToolCall / ToolCallPart)]
    tool_result_processing[Tool Result & Retry Processing]
    tool_return_output[Tool Return Part / Retry Prompt Part (Output)]

    tool_call_input --> _call_tool
    _call_tool --> tool_manager
    tool_manager --> _call_tool
    _call_tool --> tool_result_processing
    tool_result_processing --> tool_return_output
```

### Core Components

#### `_call_tool`

-   **Path**: `pydantic_ai_slim.pydantic_ai._agent_graph._call_tool`
-   **Description**: This asynchronous function is the heart of the `tool_execution` module. It takes a tool call (either validated or raw) and a `DeferredToolResult` (which can indicate approval, denial, or a retry) and executes the tool using the provided `ToolManager`. It then processes the outcome, converting raw tool results into structured `ToolReturnPart` messages or raising `ToolRetryError` for retry scenarios. It also handles explicit tool denials.

    **Key Responsibilities**:
    *   Executing tool calls via `ToolManager`.
    *   Processing various `DeferredToolResult` types: `ToolApproved`, `ToolDenied`, `exceptions.ModelRetry`, `_messages.RetryPromptPart`.
    *   Converting tool execution outcomes into `_messages.ToolReturnPart` for successful calls.
    *   Generating `_messages.ToolReturnPart` with an 'outcome' of 'denied' for denied tool calls.
    *   Raising `ToolRetryError` for scenarios requiring a model retry.
    *   Validating tool return formats to prevent nested `ToolReturn` objects.

## How the Module Fits into the Overall System

The `tool_execution` module plays a vital role in the agent's operational workflow. It is directly invoked by the [Tool Call Processing](tool_call_processing.md) module, which is responsible for orchestrating the overall handling of tool calls.

When an agent decides to use a tool, the `tool_call_processing` module prepares the tool call and passes it to `tool_execution`'s `_call_tool` function. This function then interacts with the [Tool Output Management](tool_output_management.md) module to perform the actual tool operation. The result, whether a success, denial, or a signal for retry, is then processed and returned by `tool_execution` back to `tool_call_processing` for further action within the agent's execution flow. This ensures a clear separation of concerns, with `tool_execution` solely focused on the immediate execution and initial result handling of individual tool invocations.
