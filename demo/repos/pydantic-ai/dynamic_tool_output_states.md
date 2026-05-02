# `dynamic_tool_output_states` Module Documentation

## Introduction

The `dynamic_tool_output_states` module is a critical component within the Pydantic AI Agent Core's Vercel AI UI integration, specifically designed to define and manage the various output states of dynamic tool executions. It provides structured data models for communicating the results of tool calls back to the user interface, enabling real-time feedback and interactive workflows. This module ensures that the UI can accurately represent whether a dynamic tool's output is available or if its execution was denied, along with relevant contextual information.

## Comprehensive Documentation

### What this module does and why it matters

This module defines the data structures (`DynamicToolOutputAvailablePart` and `DynamicToolOutputDeniedPart`) that encapsulate the final outcomes of dynamic tool calls initiated by the AI agent. These structures are essential for the Vercel AI frontend to:

*   Display the results of successfully executed tools, including their inputs and outputs.
*   Indicate when a tool's execution has been denied, providing clarity on why an expected outcome might be missing.
*   Facilitate user interaction for tools that require approval before execution, by reflecting the approval status in the output.

Without these clearly defined states, the UI would lack the necessary information to present a coherent and interactive experience for dynamic tool usage.

### How its parts work together from a user's perspective

When an AI agent's workflow involves a dynamic tool, the user interface needs to stay updated on the tool's status.

1.  **Tool Request**: A request for a dynamic tool is initiated, potentially including an [dynamic_tool_input_states](dynamic_tool_input_states.md) part.
2.  **Agent Execution**: The agent processes the request, potentially calling external tools via the [tool_execution_logic](tool_execution_logic.md).
3.  **Output Generation**: Upon completion or denial of the tool's execution, an output state object from this module is generated.
    *   If the tool executes successfully and its output is gathered, a `DynamicToolOutputAvailablePart` is created. This part includes the `input` the tool received and the `output` it produced.
    *   If the tool's execution is prevented (e.g., by user denial through [dynamic_tool_approval_states](dynamic_tool_approval_states.md)), a `DynamicToolOutputDeniedPart` is generated. This part indicates the denial and includes the original `input` but no `output`.
4.  **UI Update**: These output parts are then streamed back to the Vercel AI UI through [vercel_ai_response_types](vercel_ai_response_types.md), allowing the UI to update the user with the tool's final status and results.

### How it connects to the rest of the system

The `dynamic_tool_output_states` module acts as a crucial communication layer between the backend agent execution and the frontend Vercel AI user interface.

*   It is a sub-module of `vercel_ai_request_types`, emphasizing its role in defining the contract for data exchange with the Vercel AI frontend.
*   These output states are the culmination of the dynamic tool requests initiated earlier in the interaction flow, typically managed by the [dynamic_tool_requests](dynamic_tool_requests.md) module.
*   The [tool_execution_logic](tool_execution_logic.md) module is responsible for orchestrating the actual execution of tools and, subsequently, generating these output state objects.
*   The [dynamic_tool_approval_states](dynamic_tool_approval_states.md) module directly influences whether a tool transitions to an 'output-available' or 'output-denied' state, as approval (or lack thereof) is a key factor.
*   The [agent_output_handling](agent_output_handling.md) module would consume these structures for further processing or logging before they are serialized and sent to the UI.

These output states are fundamentally `BaseUIPart` instances, ensuring consistency across all UI-related data structures within the `ui_vercel_ai_adapter` module. The `BaseUIPart` definition can be found in the [vercel_ai_request_types](vercel_ai_request_types.md) module.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "output_available", "label": "Dynamic Tool Output Available", "type": "component", "link": null},
        {"id": "output_denied", "label": "Dynamic Tool Output Denied", "type": "component", "link": null},
        {"id": "tool_execution", "label": "Tool Execution Logic", "type": "external", "link": "tool_execution_logic.md"},
        {"id": "tool_approval", "label": "Tool Approval States", "type": "external", "link": "dynamic_tool_approval_states.md"},
        {"id": "ui_response_types", "label": "Vercel AI Response Types", "type": "external", "link": "vercel_ai_response_types.md"},
        {"id": "base_ui_part", "label": "Base UI Part Definition", "type": "external", "link": "vercel_ai_request_types.md"}
    ],
    "edges": [
        {"source": "tool_execution", "target": "output_available", "label": "generates output"},
        {"source": "tool_execution", "target": "output_denied", "label": "denied outcome"},
        {"source": "tool_approval", "target": "output_available", "label": "influences approval"},
        {"source": "tool_approval", "target": "output_denied", "label": "causes denial"},
        {"source": "output_available", "target": "ui_response_types", "label": "communicates state"},
        {"source": "output_denied", "target": "ui_response_types", "label": "communicates state"},
        {"source": "output_available", "target": "base_ui_part", "label": "inherits from"},
        {"source": "output_denied", "target": "base_ui_part", "label": "inherits from"}
    ],
    "groups": [
        {
            "id": "dynamic_tool_output_states_module",
            "label": "Dynamic Tool Output States Module",
            "role": "definition",
            "nodes": ["output_available", "output_denied"]
        }
    ]
}
-->

```mermaid
flowchart TD
    subgraph dynamic_tool_output_states_module["Dynamic Tool Output States Module"]
        output_available["Dynamic Tool Output Available"]
        output_denied["Dynamic Tool Output Denied"]
    end

    tool_execution["Tool Execution Logic"]
    tool_approval["Tool Approval States"]
    ui_response_types["Vercel AI Response Types"]
    base_ui_part["Base UI Part Definition"]

    %% Flow of tool execution
    tool_execution -->|"generates output"| output_available
    tool_execution -->|"denied outcome"| output_denied

    %% Influence of tool approval
    tool_approval -.->|"influences approval"| output_available
    tool_approval -.->|"causes denial"| output_denied

    %% Communication to UI
    output_available -->|"communicates state"| ui_response_types
    output_denied -->|"communicates state"| ui_response_types

    %% Inheritance
    output_available --|>|"inherits from"| base_ui_part
    output_denied --|>|"inherits from"| base_ui_part

    click tool_execution "tool_execution_logic.md"
    click tool_approval "dynamic_tool_approval_states.md"
    click ui_response_types "vercel_ai_response_types.md"
    click base_ui_part "vercel_ai_request_types.md"
```