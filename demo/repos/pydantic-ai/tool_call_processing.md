# tool_call_processing

The `tool_call_processing` module is a crucial component within the agent execution graph, responsible for orchestrating the invocation and result handling of tools. It acts as the central hub for executing tool calls, managing their outcomes (success, denial, retry, or deferral), and translating these outcomes into structured messages for the agent's ongoing conversation. This module ensures that the agent can effectively interact with external capabilities and process the responses in a consistent manner.

## How it Works

The `tool_call_processing` module integrates two primary functions: `_call_tool` and `handle_call_or_result`.

1.  **`_call_tool`**: This function is the initial entry point for executing a tool. It takes a tool call instruction and an optional pre-determined result (e.g., if a tool was already approved or denied by a user). It dispatches the actual tool execution to the [Toolset Manager](toolset_management.md) if the tool call is validated and approved. It also handles immediate responses for denied or retry-prompted tool calls. The output is a formatted `ToolReturnPart` along with any associated user-facing content.

2.  **`handle_call_or_result`**: This function processes the asynchronous result of a tool call, which could be a coroutine or a completed task from `_call_tool`. It's responsible for catching specific exceptions like `CallDeferred` (indicating an external dependency or long-running operation) or `ApprovalRequired` (signaling that user intervention is needed). Upon successful completion, it captures the tool's return and any user-facing messages, converting them into an `FunctionToolResultEvent` that can be consumed by the agent's output handling system.

Together, these functions ensure a robust and flexible mechanism for agents to interact with tools, manage their lifecycle, and feed results back into the agent's operational flow, allowing for complex decision-making and interaction patterns.

## Architecture Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "_call_tool_entry",
            "label": "Initiate Tool Call Execution",
            "type": "component",
            "link": null
        },
        {
            "id": "execute_tool_action",
            "label": "Execute Tool Action",
            "type": "component",
            "link": null
        },
        {
            "id": "handle_tool_denial",
            "label": "Handle Tool Denial",
            "type": "component",
            "link": null
        },
        {
            "id": "handle_tool_retry",
            "label": "Handle Tool Retry Request",
            "type": "component",
            "link": null
        },
        {
            "id": "wrap_tool_result",
            "label": "Wrap Tool Result",
            "type": "component",
            "link": null
        },
        {
            "id": "handle_call_result_entry",
            "label": "Process Tool Call Outcome",
            "type": "component",
            "link": null
        },
        {
            "id": "extract_tool_outcome",
            "label": "Extract Tool Outcome",
            "type": "component",
            "link": null
        },
        {
            "id": "detect_deferred_call",
            "label": "Detect Deferred Call",
            "type": "component",
            "link": null
        },
        {
            "id": "detect_approval_needed",
            "label": "Detect Approval Needed",
            "type": "component",
            "link": null
        },
        {
            "id": "capture_processed_output",
            "label": "Capture Processed Output",
            "type": "component",
            "link": null
        },
        {
            "id": "generate_output_event",
            "label": "Generate Agent Output Event",
            "type": "component",
            "link": null
        },
        {
            "id": "toolset_manager",
            "label": "Toolset Manager",
            "type": "external",
            "link": "toolset_management.md"
        },
        {
            "id": "agent_output",
            "label": "Agent Output Handling",
            "type": "external",
            "link": "agent_output_handling.md"
        }
    ],
    "edges": [
        {
            "source": "_call_tool_entry",
            "target": "execute_tool_action",
            "label": "Tool Call Request"
        },
        {
            "source": "_call_tool_entry",
            "target": "handle_tool_denial",
            "label": "If Denied"
        },
        {
            "source": "_call_tool_entry",
            "target": "handle_tool_retry",
            "label": "If Retry Requested"
        },
        {
            "source": "execute_tool_action",
            "target": "wrap_tool_result",
            "label": "Raw Tool Output"
        },
        {
            "source": "handle_tool_denial",
            "target": "wrap_tool_result",
            "label": "Denied Response"
        },
        {
            "source": "handle_tool_retry",
            "target": "wrap_tool_result",
            "label": "Retry Prompt"
        },
        {
            "source": "wrap_tool_result",
            "target": "handle_call_result_entry",
            "label": "Formatted Tool Part, User Content",
            "type": "primary"
        },
        {
            "source": "execute_tool_action",
            "target": "toolset_manager",
            "label": "Uses ToolManager to execute",
            "type": "reference"
        },
        {
            "source": "handle_call_result_entry",
            "target": "extract_tool_outcome",
            "label": "Awaitable Tool Result"
        },
        {
            "source": "extract_tool_outcome",
            "target": "detect_deferred_call",
            "label": "On CallDeferred"
        },
        {
            "source": "extract_tool_outcome",
            "target": "detect_approval_needed",
            "label": "On ApprovalRequired"
        },
        {
            "source": "extract_tool_outcome",
            "target": "capture_processed_output",
            "label": "Tool Part, User Content (Success)"
        },
        {
            "source": "detect_deferred_call",
            "target": "capture_processed_output",
            "label": "Mark as Deferred"
        },
        {
            "source": "detect_approval_needed",
            "target": "capture_processed_output",
            "label": "Mark as Approval Required"
        },
        {
            "source": "capture_processed_output",
            "target": "generate_output_event",
            "label": "Processed Data"
        },
        {
            "source": "generate_output_event",
            "target": "agent_output",
            "label": "Emits FunctionToolResultEvent",
            "type": "reference"
        }
    ],
    "groups": [
        {
            "id": "tool_execution_flow",
            "label": "Tool Execution Flow (Internal to _call_tool)",
            "role": "functional",
            "nodes": [
                "_call_tool_entry",
                "execute_tool_action",
                "handle_tool_denial",
                "handle_tool_retry",
                "wrap_tool_result"
            ]
        },
        {
            "id": "result_processing_flow",
            "label": "Result Processing Flow (Internal to handle_call_or_result)",
            "role": "functional",
            "nodes": [
                "handle_call_result_entry",
                "extract_tool_outcome",
                "detect_deferred_call",
                "detect_approval_needed",
                "capture_processed_output",
                "generate_output_event"
            ]
        }
    ]
}
-->

```mermaid
flowchart TD
    subgraph tool_execution_flow["Tool Execution Flow (Internal to _call_tool)"]
        _call_tool_entry["Initiate Tool Call Execution"]
        execute_tool_action["Execute Tool Action"]
        handle_tool_denial["Handle Tool Denial"]
        handle_tool_retry["Handle Tool Retry Request"]
        wrap_tool_result["Wrap Tool Result"]
    end

    subgraph result_processing_flow["Result Processing Flow (Internal to handle_call_or_result)"]
        handle_call_result_entry["Process Tool Call Outcome"]
        extract_tool_outcome["Extract Tool Outcome"]
        detect_deferred_call["Detect Deferred Call"]
        detect_approval_needed["Detect Approval Needed"]
        capture_processed_output["Capture Processed Output"]
        generate_output_event["Generate Agent Output Event"]
    end

    toolset_manager["Toolset Manager"]
    agent_output["Agent Output Handling"]

    _call_tool_entry -->|"Tool Call Request"| execute_tool_action
    _call_tool_entry -->|"If Denied"| handle_tool_denial
    _call_tool_entry -->|"If Retry Requested"| handle_tool_retry

    execute_tool_action -->|"Raw Tool Output"| wrap_tool_result
    handle_tool_denial -->|"Denied Response"| wrap_tool_result
    handle_tool_retry -->|"Retry Prompt"| wrap_tool_result

    wrap_tool_result ==>|"Formatted Tool Part, User Content"| handle_call_result_entry

    execute_tool_action -.->|"Uses ToolManager to execute"| toolset_manager

    handle_call_result_entry -->|"Awaitable Tool Result"| extract_tool_outcome
    extract_tool_outcome -->|"On CallDeferred"| detect_deferred_call
    extract_tool_outcome -->|"On ApprovalRequired"| detect_approval_needed
    extract_tool_outcome -->|"Tool Part, User Content (Success)"| capture_processed_output

    detect_deferred_call -->|"Mark as Deferred"| capture_processed_output
    detect_approval_needed -->|"Mark as Approval Required"| capture_processed_output

    capture_processed_output -->|"Processed Data"| generate_output_event

    generate_output_event -.->|"Emits FunctionToolResultEvent"| agent_output
