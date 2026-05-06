# Gemini Response Conversion Module

This module is responsible for converting responses between the raw format received from the Gemini API and the internal standardized `ModelResponse` format used throughout the system. It acts as a crucial bridge, ensuring that the system can both interpret Gemini's output and format its own outputs in a way that Gemini understands.

## Core Functionality

The `gemini_response_conversion` module provides the logic to:

1.  **Parse Raw Gemini API Responses:** Translate the diverse "parts" (text, function calls, thinking parts) received directly from the Gemini API into a unified `ModelResponse` object. This process extracts relevant information and structures it for internal system consumption.
2.  **Generate Gemini-Compliant Content:** Convert a standardized `ModelResponse` object back into the specific content format (`_GeminiContent`) expected by the Gemini API, particularly handling the transformation of tool calls and the inclusion of necessary metadata like thought signatures.

This bidirectional conversion is essential for seamless integration with Gemini models, allowing the agent to both understand and respond effectively within the Gemini ecosystem.

## Architecture Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "process_incoming_gemini",
            "label": "Process Incoming Gemini Parts",
            "type": "component",
            "link": null
        },
        {
            "id": "generate_outgoing_gemini",
            "label": "Generate Outgoing Gemini Content",
            "type": "component",
            "link": null
        },
        {
            "id": "standard_model_response",
            "label": "Standardized Model Response",
            "type": "external",
            "link": "model_core_interfaces.md"
        },
        {
            "id": "gemini_api_interface",
            "label": "Gemini API Interaction",
            "type": "external",
            "link": "gemini_api_interaction.md"
        },
        {
            "id": "usage_tracking",
            "label": "Usage Tracking",
            "type": "external",
            "link": "agent_utilities.md"
        }
    ],
    "edges": [
        {
            "source": "gemini_api_interface",
            "target": "process_incoming_gemini",
            "label": "raw Gemini parts"
        },
        {
            "source": "process_incoming_gemini",
            "target": "standard_model_response",
            "label": "standardized model response"
        },
        {
            "source": "standard_model_response",
            "target": "generate_outgoing_gemini",
            "label": "model response object"
        },
        {
            "source": "generate_outgoing_gemini",
            "target": "gemini_api_interface",
            "label": "formatted Gemini content"
        },
        {
            "source": "process_incoming_gemini",
            "target": "usage_tracking",
            "label": "updates"
        }
    ],
    "groups": [
        {
            "id": "gemini_conversion_logic",
            "label": "Gemini Response Conversion Logic",
            "role": "analytical",
            "nodes": [
                "process_incoming_gemini",
                "generate_outgoing_gemini"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph gemini_conversion_logic["Gemini Response Conversion Logic"]
        process_incoming_gemini["Process Incoming Gemini Parts"]
        generate_outgoing_gemini["Generate Outgoing Gemini Content"]
    end

    gemini_api_interface["Gemini API Interaction"]
    standard_model_response["Standardized Model Response"]
    usage_tracking["Usage Tracking"]

    gemini_api_interface --"raw Gemini parts"--> process_incoming_gemini
    process_incoming_gemini -->"standardized model response"--> standard_model_response
    standard_model_response -->"model response object"--> generate_outgoing_gemini
    generate_outgoing_gemini --"formatted Gemini content"--> gemini_api_interface
    process_incoming_gemini -.->|"updates"| usage_tracking
```

## Components

### `_process_response_from_parts`

```python
def _process_response_from_parts(
    parts: Sequence[_GeminiPartUnion],
    model_name: GeminiModelName,
    usage: usage.RequestUsage,
    vendor_id: str | None,
    provider_name: str,
    provider_url: str,
    vendor_details: dict[str, Any] | None = None,
) -> ModelResponse:
    items: list[ModelResponsePart] = []
    for part in parts:
        if 'text' in part:
            if part.get('thought'):
                items.append(ThinkingPart(content=part['text']))
            else:
                items.append(TextPart(content=part['text']))
        elif 'function_call' in part:
            items.append(ToolCallPart(tool_name=part['function_call']['name'], args=part['function_call']['args']))
        elif 'function_response' in part:  # pragma: no cover
            raise UnexpectedModelBehavior(
                f'Unsupported response from Gemini, expected all parts to be function calls or text, got: {part!r}'
            )
    return ModelResponse(
        parts=items,
        usage=usage,
        model_name=model_name,
        provider_name=provider_name,
        provider_response_id=vendor_id,
        provider_details=vendor_details,
        provider_url=provider_url,
    )
```

This function takes a sequence of raw parts directly from a Gemini model's response and converts them into a standardized `ModelResponse` object. It iterates through each part, identifying whether it's a text, thinking, or function call part, and then maps it to the corresponding internal `ModelResponsePart` (e.g., `TextPart`, `ThinkingPart`, `ToolCallPart`). This process also integrates `usage` information and other model metadata into the final `ModelResponse`.

### `_content_model_response`

```python
def _content_model_response(m: ModelResponse) -> _GeminiContent:
    parts: list[_GeminiPartUnion] = []
    function_call_requires_signature = True
    for item in m.parts:
        if isinstance(item, ToolCallPart):
            part = _function_call_part_from_call(item)
            if function_call_requires_signature and not part.get('thought_signature'):
                # Per https://ai.google.dev/gemini-api/docs/thought-signatures#faqs:
                # > You can set the following dummy signatures of either "context_engineering_is_the_way_to_go"
                # > or "skip_thought_signature_validator"
                # Per https://cloud.google.com/vertex-ai/generative-ai/docs/thought-signatures#using-rest-or-manual-handling:
                # > You can set thought_signature to skip_thought_signature_validator
                # We use "skip_thought_signature_validator" as it works for both Gemini API and Vertex AI.
                part['thought_signature'] = b'skip_thought_signature_validator'
            # Only the first function call requires a signature
            function_call_requires_signature = False
            parts.append(part)
        elif isinstance(item, ThinkingPart):
            # NOTE: We don't send ThinkingPart to the providers yet. If you are unsatisfied with this,
            # please open an issue. The below code is the code to send thinking to the provider.
            # parts.append(_GeminiTextPart(text=item.content, thought=True))
            pass
        elif isinstance(item, TextPart):
            if item.content:
                parts.append(_GeminiTextPart(text=item.content))
        elif isinstance(item, BuiltinToolCallPart | BuiltinToolReturnPart):  # pragma: no cover
            # This is currently never returned from gemini
            pass
        elif isinstance(item, FilePart):  # pragma: no cover
            # Files generated by models are not sent back to models that don't themselves generate files.
            pass
        else:
            assert_never(item)
    return _GeminiContent(role='model', parts=parts)
```

This function performs the inverse operation of `_process_response_from_parts`. It takes a standardized `ModelResponse` object and converts it into a `_GeminiContent` object, which is the format expected by the Gemini API when sending content (e.g., as part of a multi-turn conversation). A key aspect of this function is its handling of `ToolCallPart` instances, where it ensures that a `thought_signature` is added to the first function call as required by the Gemini API. `ThinkingPart`s are currently filtered out, and other internal `ModelResponsePart` types are translated into their Gemini-specific counterparts.