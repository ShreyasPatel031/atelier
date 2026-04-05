# usage_metadata_handling Module Documentation

The `usage_metadata_handling` module is responsible for standardizing the token usage metadata received from the Groq API. It parses raw usage data, accommodating different API response formats, and transforms it into a consistent `UsageMetadata` structure, including detailed input and output token breakdowns. This module ensures that usage information from Groq chat models is uniformly represented across the system, facilitating accurate cost tracking and performance analysis.

### Module Architecture

The `usage_metadata_handling` module is a leaf module within the `partners_groq_chat_models` hierarchy. Its primary component, `_create_usage_metadata`, acts as a dedicated processor for Groq API token usage dictionaries. It directly interacts with the raw Groq API response structure and produces a structured `UsageMetadata` object, which is then utilized by the parent `partners_groq_chat_models` module.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "create_usage_metadata_func", "label": "_create_usage_metadata", "type": "component", "link": null},
        {"id": "groq_api_response", "label": "Groq API Token Usage (dict)", "type": "external", "link": null},
        {"id": "usage_metadata_type", "label": "UsageMetadata", "type": "external", "link": null},
        {"id": "input_token_details_type", "label": "InputTokenDetails", "type": "external", "link": null},
        {"id": "output_token_details_type", "label": "OutputTokenDetails", "type": "external", "link": null},
        {"id": "partners_groq_chat_models", "label": "partners_groq_chat_models", "type": "external", "link": "partners_groq_chat_models.md"}
    ],
    "edges": [
        {"source": "groq_api_response", "target": "create_usage_metadata_func", "label": "Input"},
        {"source": "create_usage_metadata_func", "target": "usage_metadata_type", "label": "Output"},
        {"source": "create_usage_metadata_func", "target": "input_token_details_type", "label": "Uses"},
        {"source": "create_usage_metadata_func", "target": "output_token_details_type", "label": "Uses"},
        {"source": "partners_groq_chat_models", "target": "create_usage_metadata_func", "label": "Utilizes"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    create_usage_metadata_func[_create_usage_metadata]
    groq_api_response[Groq API Token Usage (dict)]
    usage_metadata_type[UsageMetadata]
    input_token_details_type[InputTokenDetails]
    output_token_details_type[OutputTokenDetails]
    partners_groq_chat_models[partners_groq_chat_models]

    groq_api_response -->|Input| create_usage_metadata_func
    create_usage_metadata_func -->|Output| usage_metadata_type
    create_usage_metadata_func -->|Uses| input_token_details_type
    create_usage_metadata_func -->|Uses| output_token_details_type
    partners_groq_chat_models -->|Utilizes| create_usage_metadata_func
```

### Component Details

#### `_create_usage_metadata`

The `_create_usage_metadata` function serves as the central logic for parsing Groq's token usage information. It addresses the variability in Groq's API responses by supporting multiple key names for input, output, and total tokens, as well as for detailed token information.

**Core Functionality:**

*   **Token Extraction**: It extracts `input_tokens`, `output_tokens`, and `total_tokens` from the `groq_token_usage` dictionary. It prioritizes newer API fields (`input_tokens`, `output_tokens`) but falls back to older fields (`prompt_tokens`, `completion_tokens`) if the primary fields are not present. The `total_tokens` is calculated if not explicitly provided.
*   **Detailed Token Information**: It retrieves `input_tokens_details` and `output_tokens_details`, again handling different naming conventions (`*_tokens_details` vs `prompt_token_details`/`completion_tokens_details`).
*   **Structured Output**: It populates `input_token_details` with fields like `cached_tokens` and `output_token_details` with `reasoning_tokens`. These are then wrapped in `InputTokenDetails` and `OutputTokenDetails` objects (assuming these are `TypedDict` or similar structures) and conditionally added to the final `UsageMetadata` dictionary if they contain valid values.
*   **Type Conversion**: The function ultimately returns a `UsageMetadata` object, providing a consistent data structure for downstream consumption.

**Usage:**

This function is an internal utility primarily called by the `partners_groq_chat_models` module to process the usage data returned by the Groq API after a chat completion call.

### Integration with the Overall System

The `usage_metadata_handling` module plays a crucial role in providing normalized usage statistics for Groq-based chat models. By centralizing the parsing logic, it decouples the higher-level chat model implementations (in `partners_groq_chat_models`) from the specifics of Groq's API response structure. This ensures that any changes in Groq's usage reporting format can be addressed within this module without impacting other parts of the system that consume `UsageMetadata`. It directly supports the [partners_groq_chat_models](partners_groq_chat_models.md) module by supplying it with a standardized representation of token usage.