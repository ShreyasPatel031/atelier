# streaming_response_parts

## Introduction

The `streaming_response_parts` module is a crucial component within the `pydantic_ai_agent_core` system, specifically responsible for managing and reconstructing streamed responses from language models. It addresses the challenge of handling incremental data, such as text deltas, thinking process updates, and tool call instructions, by efficiently assembling them into coherent and complete model outputs.

This module plays a vital role in enabling real-time interaction and detailed visibility into the model's generation process, which is essential for applications requiring dynamic UI updates or intricate agent reasoning.

## Comprehensive Documentation

### Purpose and Core Functionality

The primary purpose of the `streaming_response_parts` module is to provide a robust mechanism for managing and processing parts of a model's streamed response. Language models often generate output incrementally, sending portions of text, thoughts, or tool calls as they are produced. The `ModelResponsePartsManager` class centralizes the logic for receiving these deltas, identifying them (often via vendor-specific IDs), and assembling them into a complete and ordered sequence of `ModelResponsePart` objects.

Key functionalities include:
*   **Accumulating Deltas**: Efficiently appends and updates text content, thinking process descriptions, and tool call arguments as they arrive.
*   **Part Identification**: Uses vendor-specific IDs to track and update individual response parts, ensuring correct ordering and aggregation.
*   **State Management**: Maintains the current state of the model's response, allowing for the retrieval of complete parts at any point.
*   **Event Emission**: Yields `PartStartEvent` when a new part begins and `PartDeltaEvent` when an existing part is updated, facilitating reactive programming and UI updates.
*   **Error Handling**: Raises `UnexpectedModelBehavior` for invalid operations, ensuring the integrity of the response reconstruction process.

### Architecture and Component Relationships

The `streaming_response_parts` module is built around the `ModelResponsePartsManager` class. This class acts as the central orchestrator for handling incoming streamed data.

#### ModelResponsePartsManager

The `ModelResponsePartsManager` is responsible for:
*   **`_parts`**: A list of `ManagedPart` objects representing the current state of the response. These can be `TextPart`, `ThinkingPart`, `ToolCallPart`, or `ToolCallPartDelta`.
*   **`_vendor_id_to_part_index`**: A dictionary that maps vendor-specific part IDs to their corresponding indices within the `_parts` list, enabling quick lookups and updates.

**Key methods of `ModelResponsePartsManager`:**

*   **`get_parts()`**: Retrieves all complete `ModelResponsePart` objects from the managed sequence, excluding any incomplete `ToolCallPartDelta` objects.
*   **`get_part_by_vendor_id(vendor_id)`**: Allows retrieval of a specific `ManagedPart` by its vendor-provided ID.
*   **`handle_text_delta(...)`**: Processes incoming text content. It intelligently appends content to the latest `TextPart` or creates a new one. It also handles special `<think>` and `</think>` tags to manage embedded thinking processes within the text stream.
*   **`handle_thinking_delta(...)`**: Manages updates to `ThinkingPart` objects, appending new thinking content or updating existing thinking process descriptions.
*   **`handle_tool_call_delta(...)`**: Handles tool call information, which can arrive in deltas. It accumulates `tool_name`, `args`, and `tool_call_id`, upgrading a `ToolCallPartDelta` to a complete `ToolCallPart` or `BuiltinToolCallPart` once sufficient information is available.
*   **`handle_tool_call_part(...)`**: Directly creates or fully overwrites a `ToolCallPart` with complete information, bypassing the delta accumulation process.
*   **`handle_part(...)`**: A general method to add or overwrite any `ModelResponsePart` based on its `vendor_part_id`.

### How the Module Fits into the Overall System

The `streaming_response_parts` module, specifically the `ModelResponsePartsManager`, is a core component within the `tool_output_management` sub-module of `pydantic_ai_agent_core`.

It integrates with:
*   **Model Integrations**: Models (e.g., [gemini_model_integration](gemini_model_integration.md), [openai_model_integration](openai_model_integration.md)) that provide streamed responses utilize this manager to process and normalize their diverse output formats into a unified sequence of `ModelResponsePart` objects.
*   **Agent Execution**: Agent logic (within [pydantic_ai_agent_core](pydantic_ai_agent_core.md)) relies on the complete and ordered parts provided by this manager to decide on subsequent actions, execute tools, or formulate responses to the user.
*   **UI/Observability**: Downstream components, such as user interfaces or logging systems, consume the `ModelResponseStreamEvent`s yielded by the manager to provide real-time feedback on the model's progress, showing thinking steps, tool calls, and generated text as they become available.
*   **Tool Execution Handling**: The processed `ToolCallPart`s are passed to the [tool_execution_handling](tool_execution_handling.md) module for actual execution.

This module acts as a critical intermediary, abstracting away the complexities of various model streaming protocols and presenting a consistent interface for handling incremental responses.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "manager", "label": "ModelResponsePartsManager", "type": "component", "link": null},
        {"id": "get_parts_method", "label": "get_parts()", "type": "component", "link": null},
        {"id": "get_part_by_vendor_id_method", "label": "get_part_by_vendor_id()", "type": "component", "link": null},
        {"id": "handle_text_delta_method", "label": "handle_text_delta()", "type": "component", "link": null},
        {"id": "handle_thinking_delta_method", "label": "handle_thinking_delta()", "type": "component", "link": null},
        {"id": "handle_tool_call_delta_method", "label": "handle_tool_call_delta()", "type": "component", "link": null},
        {"id": "handle_tool_call_part_method", "label": "handle_tool_call_part()", "type": "component", "link": null},
        {"id": "handle_part_method", "label": "handle_part()", "type": "component", "link": null},
        {"id": "model_response_types", "label": "Model Response Types (pydantic_ai_agent_core)", "type": "external", "link": "pydantic_ai_agent_core.md"},
        {"id": "tool_output_management", "label": "tool_output_management", "type": "external", "link": "tool_output_management.md"},
        {"id": "model_integrations", "label": "Model Integrations", "type": "external", "link": "pydantic_ai_models.md"},
        {"id": "tool_execution_handling_link", "label": "tool_execution_handling", "type": "external", "link": "tool_execution_handling.md"}
    ],
    "edges": [
        {"source": "manager", "target": "get_parts_method"},
        {"source": "manager", "target": "get_part_by_vendor_id_method"},
        {"source": "manager", "target": "handle_text_delta_method"},
        {"source": "manager", "target": "handle_thinking_delta_method"},
        {"source": "manager", "target": "handle_tool_call_delta_method"},
        {"source": "manager", "target": "handle_tool_call_part_method"},
        {"source": "manager", "target": "handle_part_method"},
        {"source": "handle_text_delta_method", "target": "model_response_types"},
        {"source": "handle_thinking_delta_method", "target": "model_response_types"},
        {"source": "handle_tool_call_delta_method", "target": "model_response_types"},
        {"source": "handle_tool_call_part_method", "target": "model_response_types"},
        {"source": "handle_part_method", "target": "model_response_types"},
        {"source": "get_parts_method", "target": "model_response_types"},
        {"source": "get_part_by_vendor_id_method", "target": "model_response_types"},
        {"source": "tool_output_management", "target": "manager"},
        {"source": "model_integrations", "target": "manager"},
        {"source": "manager", "target": "tool_execution_handling_link"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    manager[ModelResponsePartsManager]
    get_parts_method[get_parts()]
    get_part_by_vendor_id_method[get_part_by_vendor_id()]
    handle_text_delta_method[handle_text_delta()]
    handle_thinking_delta_method[handle_thinking_delta()]
    handle_tool_call_delta_method[handle_tool_call_delta()]
    handle_tool_call_part_method[handle_tool_call_part()]
    handle_part_method[handle_part()]
    model_response_types[Model Response Types (pydantic_ai_agent_core)]:::external
    tool_output_management[tool_output_management]:::external
    model_integrations[Model Integrations]:::external
    tool_execution_handling_link[tool_execution_handling]:::external

    manager --> get_parts_method
    manager --> get_part_by_vendor_id_method
    manager --> handle_text_delta_method
    manager --> handle_thinking_delta_method
    manager --> handle_tool_call_delta_method
    manager --> handle_tool_call_part_method
    manager --> handle_part_method

    handle_text_delta_method --> model_response_types
    handle_thinking_delta_method --> model_response_types
    handle_tool_call_delta_method --> model_response_types
    handle_tool_call_part_method --> model_response_types
    handle_part_method --> model_response_types
    get_parts_method --> model_response_types
    get_part_by_vendor_id_method --> model_response_types

    tool_output_management --> manager
    model_integrations --> manager
    manager --> tool_execution_handling_link

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```