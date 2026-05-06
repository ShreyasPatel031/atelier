# Static Tool Requests Module Documentation

## Introduction

The `static_tool_requests` module defines the data structures for handling static tool requests and their various states within the Vercel AI UI integration. It primarily focuses on the lifecycle of a tool call from the perspective of the UI, including initial input streaming, requesting user approval, and recording the user's approval response.

This module is a core part of the `vercel_ai_request_types` (parent module) and works in conjunction with other modules like `ui_step_management` and `dynamic_tool_requests` to manage the overall UI interaction and tool execution flow.

## Architecture Overview

The `static_tool_requests` module is composed of the `tool_request_states` sub-module, which encapsulates the different phases of a static tool request. These states are critical for the UI to correctly display the status of a tool execution and to facilitate user interaction, such as requesting approval before executing sensitive operations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "static_tool_requests",
            "label": "Static Tool Interaction Requests",
            "type": "module"
        },
        {
            "id": "tool_request_states",
            "label": "Manage Tool Request States",
            "type": "module",
            "link": "tool_request_states.md"
        },
        {
            "id": "vercel_ai_request_types",
            "label": "Vercel AI Request Types",
            "type": "external",
            "link": "vercel_ai_request_types.md"
        },
        {
            "id": "ui_step_management",
            "label": "UI Step Management",
            "type": "external",
            "link": "ui_step_management.md"
        },
        {
            "id": "dynamic_tool_requests",
            "label": "Dynamic Tool Requests",
            "type": "external",
            "link": "dynamic_tool_requests.md"
        }
    ],
    "edges": [
        {
            "source": "vercel_ai_request_types",
            "target": "tool_request_states",
            "label": "contains definitions"
        },
        {
            "source": "tool_request_states",
            "target": "ui_step_management",
            "label": "informs UI flow"
        },
        {
            "source": "tool_request_states",
            "target": "dynamic_tool_requests",
            "label": "related to tool states"
        }
    ],
    "groups": [
        {
            "id": "static_requests",
            "label": "Static Tool Request Handling",
            "role": "generative",
            "nodes": [
                "tool_request_states"
            ]
        },
        {
            "id": "interaction_context",
            "label": "UI Interaction Context",
            "role": "surface",
            "nodes": [
                "vercel_ai_request_types",
                "ui_step_management",
                "dynamic_tool_requests"
            ]
        }
    ]
}
-->

```mermaid
flowchart TD
    subgraph static_requests["Static Tool Request Handling"]
        tool_request_states["Manage Tool Request States"]
    end

    subgraph interaction_context["UI Interaction Context"]
        vercel_ai_request_types["Vercel AI Request Types"]
        ui_step_management["UI Step Management"]
        dynamic_tool_requests["Dynamic Tool Requests"]
    end

    vercel_ai_request_types -->|contains definitions| tool_request_states
    tool_request_states -->|informs UI flow| ui_step_management
    tool_request_states --.->|related to tool states| dynamic_tool_requests

    click tool_request_states "tool_request_states.md" "View Tool Request States Documentation"
    click vercel_ai_request_types "vercel_ai_request_types.md" "View Vercel AI Request Types Documentation"
    click ui_step_management "ui_step_management.md" "View UI Step Management Documentation"
    click dynamic_tool_requests "dynamic_tool_requests.md" "View Dynamic Tool Requests Documentation"
```

## Sub-modules

### [Tool Request States](tool_request_states.md)

This sub-module defines the Pydantic models representing different states of a tool call as it progresses through the Vercel AI UI. These states include when input is being streamed, when user approval is required, and after the user has responded to an approval request. This ensures a clear and structured way to communicate the status of tool execution to the UI and manage user interactions.

## Related Modules

*   **[Vercel AI Request Types](vercel_ai_request_types.md)**: The parent module that contains `static_tool_requests` and defines the overall structure for Vercel AI integration requests.
*   **[UI Step Management](ui_step_management.md)**: A sibling module that likely uses the state information from `static_tool_requests` to manage and update the UI steps presented to the user.
*   **[Dynamic Tool Requests](dynamic_tool_requests.md)**: Another sibling module that probably handles tool requests generated dynamically during agent execution, contrasting with the static, predefined nature of requests handled here.