# Dynamic Tool Requests Module

## Introduction and Purpose

The `dynamic_tool_requests` module is a critical part of the `pydantic_ai_slim.pydantic_ai.ui.vercel_ai.request_types` package, specifically designed to handle the various states and interactions for dynamic tool calls within the Vercel AI UI integration. It defines the Pydantic models that represent the lifecycle of a dynamic tool from the UI's perspective, enabling the front-end to accurately render and respond to tool execution, user approvals, and streaming inputs/outputs.

This module ensures a seamless and interactive experience for users when AI agents invoke tools that require dynamic interaction, such as streaming input, user approval, or displaying ongoing output.

## Architecture Overview

The `dynamic_tool_requests` module is structured around the different states a dynamic tool interaction can go through, from initial input streaming to final output or denial. It provides a clear, type-safe contract for communication between the AI agent system and the Vercel AI UI.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "dynamic_tool_input_states", "label": "Handle Tool Input", "type": "module", "link": "dynamic_tool_input_states.md"},
        {"id": "dynamic_tool_approval_states", "label": "Manage Tool Approval", "type": "module", "link": "dynamic_tool_approval_states.md"},
        {"id": "dynamic_tool_output_states", "label": "Process Tool Output", "type": "module", "link": "dynamic_tool_output_states.md"}
    ],
    "edges": [
        {"source": "dynamic_tool_input_states", "target": "dynamic_tool_approval_states", "label": "input ready, needs approval"},
        {"source": "dynamic_tool_approval_states", "target": "dynamic_tool_output_states", "label": "approved, processing output"},
        {"source": "dynamic_tool_approval_states", "target": "dynamic_tool_output_states", "label": "denied, output denied"}
    ],
    "groups": [
        {
            "id": "tool_lifecycle",
            "label": "Dynamic Tool Lifecycle",
            "role": "surface",
            "nodes": ["dynamic_tool_input_states", "dynamic_tool_approval_states", "dynamic_tool_output_states"]
        }
    ]
}
-->

```mermaid
flowchart TD
    subgraph dynamic_tool_lifecycle["Dynamic Tool Lifecycle"]
        input_states["Handle Tool Input"]
        approval_states["Manage Tool Approval"]
        output_states["Process Tool Output"]
    end

    input_states -->|"input ready, needs approval"| approval_states
    approval_states -->|"approved, processing output"| output_states
    approval_states --.->|"denied, output denied"| output_states

    click input_states "dynamic_tool_input_states.md" "View Dynamic Tool Input States"
    click approval_states "dynamic_tool_approval_states.md" "View Dynamic Tool Approval States"
    click output_states "dynamic_tool_output_states.md" "View Dynamic Tool Output States"
```

## Sub-modules

This module is composed of the following sub-modules, each handling specific stages of a dynamic tool request:

*   **[Dynamic Tool Input States](dynamic_tool_input_states.md)**: Defines the data structures for managing the input phase of dynamic tools, including streaming and when input is fully available.

*   **[Dynamic Tool Approval States](dynamic_tool_approval_states.md)**: Handles the states related to user approval or denial of dynamic tool execution, facilitating interactive decision-making.

*   **[Dynamic Tool Output States](dynamic_tool_output_states.md)**: Manages the output phase of dynamic tools, indicating when output is available or if the tool execution was denied, leading to an output denial state.

## Connections to Other Modules

This module integrates closely with other parts of the `pydantic_ai_slim.pydantic_ai.ui.vercel_ai` package, particularly:

*   **[`vercel_ai_integration_adapter.md`](vercel_ai_integration_adapter.md)**: This module likely consumes the types defined here to communicate dynamic tool states to the Vercel AI frontend.
*   **[`output_definition_and_validation.md`](output_definition_and_validation.md)**: The output states defined here might be validated or constructed using logic from this module.
*   **[`agent_execution_graph.md`](agent_execution_graph.md)**: The dynamic tool requests are initiated as part of an agent's execution flow, making the types here crucial for representing tool calls within the agent's operational graph.
