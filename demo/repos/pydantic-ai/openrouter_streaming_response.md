# OpenRouter Streaming Response Module

This module (`openrouter_streaming_response`) provides the specific implementation for handling streamed responses from OpenRouter models. It extends the base streaming response functionality to correctly parse and process the unique chunk formats and reasoning details provided by the OpenRouter API, ensuring seamless integration with the overall agent's output handling.

## Core Components

### `OpenRouterStreamedResponse`

`OpenRouterStreamedResponse` is the central component of this module. It inherits from [OpenAI Streamed Response Base](model_provider_openai.md), adapting its capabilities to the OpenRouter's specific streaming protocol and data structures. This class is responsible for:

*   **Validating Stream Chunks**: It parses incoming raw stream chunks from OpenRouter, converting them into a structured `_OpenRouterChatCompletionChunk` format (defined in [OpenRouter Completion Types](openrouter_nested_completion.md)). It also handles API errors specific to OpenRouter, raising a [Model HTTP Error Handling](model_core_interfaces.md) with relevant details if an issue occurs during validation.
*   **Mapping Thinking Deltas**: It customizes how "thinking" parts of a model's response are processed. If OpenRouter provides `reasoning_details` (which can include various types like text or encrypted data), it extracts these details, creates unique vendor part IDs, and forwards them to the [Model Response Parts Manager](agent_output_handling.md) for further processing into `ModelResponseStreamEvent`s. If no specific reasoning details are present, it falls back to the default `OpenAIStreamedResponse` behavior.
*   **Mapping Provider Details**: It augments the standard provider details with OpenRouter-specific metadata extracted from the response chunks.
*   **Mapping Finish Reasons**: It translates OpenRouter's specific finish reason keys (e.g., 'stop', 'length') into a standardized `FinishReason` enumeration.

## Architecture Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "openrouter_streamed_response",
            "label": "OpenRouter Streamed Response Handler",
            "type": "component",
            "link": null
        },
        {
            "id": "validate_response_stream",
            "label": "Validate Incoming Stream Chunks",
            "type": "component",
            "link": null
        },
        {
            "id": "map_thinking_delta",
            "label": "Map OpenRouter Thinking Delta",
            "type": "component",
            "link": null
        },
        {
            "id": "map_provider_metadata",
            "label": "Map OpenRouter Provider Metadata",
            "type": "component",
            "link": null
        },
        {
            "id": "map_finish_reason",
            "label": "Map OpenRouter Finish Reason",
            "type": "component",
            "link": null
        },
        {
            "id": "openai_streamed_response_base",
            "label": "OpenAI Streamed Response Base",
            "type": "external",
            "link": "model_provider_openai.md"
        },
        {
            "id": "openrouter_completion_types",
            "label": "OpenRouter Completion Types",
            "type": "external",
            "link": "openrouter_nested_completion.md"
        },
        {
            "id": "model_response_parts_manager",
            "label": "Model Response Parts Manager",
            "type": "external",
            "link": "agent_output_handling.md"
        },
        {
            "id": "model_http_error",
            "label": "Model HTTP Error Handling",
            "type": "external",
            "link": "model_core_interfaces.md"
        }
    ],
    "edges": [
        {
            "source": "openrouter_streamed_response",
            "target": "openai_streamed_response_base",
            "label": "inherits from"
        },
        {
            "source": "openrouter_streamed_response",
            "target": "validate_response_stream",
            "label": "uses for validation"
        },
        {
            "source": "validate_response_stream",
            "target": "openrouter_completion_types",
            "label": "validates chunks with"
        },
        {
            "source": "validate_response_stream",
            "target": "model_http_error",
            "label": "raises on API error"
        },
        {
            "source": "openrouter_streamed_response",
            "target": "map_thinking_delta",
            "label": "uses for thinking parts"
        },
        {
            "source": "map_thinking_delta",
            "target": "openrouter_completion_types",
            "label": "parses reasoning details from"
        },
        {
            "source": "map_thinking_delta",
            "target": "model_response_parts_manager",
            "label": "sends thinking events to"
        },
        {
            "source": "openrouter_streamed_response",
            "target": "map_provider_metadata",
            "label": "uses for metadata"
        },
        {
            "source": "map_provider_metadata",
            "target": "openrouter_completion_types",
            "label": "maps details from"
        },
        {
            "source": "openrouter_streamed_response",
            "target": "map_finish_reason",
            "label": "uses for finish reason"
        },
        {
            "source": "map_finish_reason",
            "target": "openrouter_completion_types",
            "label": "looks up reason in"
        }
    ],
    "groups": [
        {
            "id": "openrouter_stream_processing",
            "label": "OpenRouter Stream Processing",
            "role": "data_flow",
            "nodes": [
                "openrouter_streamed_response",
                "validate_response_stream",
                "map_thinking_delta",
                "map_provider_metadata",
                "map_finish_reason"
            ]
        }
    ]
}
-->

```mermaid
flowchart TD
    subgraph openrouter_stream_processing["OpenRouter Stream Processing"]
        openrouter_streamed_response["OpenRouter Streamed Response Handler"]
        validate_response_stream["Validate Incoming Stream Chunks"]
        map_thinking_delta["Map OpenRouter Thinking Delta"]
        map_provider_metadata["Map OpenRouter Provider Metadata"]
        map_finish_reason["Map OpenRouter Finish Reason"]
    end

    openai_streamed_response_base["OpenAI Streamed Response Base"]
    openrouter_completion_types["OpenRouter Completion Types"]
    model_response_parts_manager["Model Response Parts Manager"]
    model_http_error["Model HTTP Error Handling"]

    openrouter_streamed_response --|> openai_streamed_response_base
    openrouter_streamed_response -->|"uses for validation"| validate_response_stream
    validate_response_stream -->|"validates chunks with"| openrouter_completion_types
    validate_response_stream -.->|"raises on API error"| model_http_error
    openrouter_streamed_response -->|"uses for thinking parts"| map_thinking_delta
    map_thinking_delta -->|"parses reasoning details from"| openrouter_completion_types
    map_thinking_delta -->|"sends thinking events to"| model_response_parts_manager
    openrouter_streamed_response -->|"uses for metadata"| map_provider_metadata
    map_provider_metadata -->|"maps details from"| openrouter_completion_types
    openrouter_streamed_response -->|"uses for finish reason"| map_finish_reason
    map_finish_reason -->|"looks up reason in"| openrouter_completion_types
```