# cohere_usage_mapping

The `cohere_usage_mapping` module is responsible for translating usage information from Cohere API responses into a standardized `RequestUsage` format used internally by the `pydantic_ai` library. This ensures consistent reporting and handling of resource consumption across different language model providers.

## Architecture and Component Relationships

This module contains the `_map_usage` function, which serves as the primary component for processing Cohere's `V2ChatResponse` objects.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "_map_usage", "label": "_map_usage Function", "type": "component", "link": null},
        {"id": "request_usage", "label": "RequestUsage (from agent_utilities_results)", "type": "external", "link": "agent_utilities_results.md"}
    ],
    "edges": [
        {"source": "_map_usage", "target": "request_usage"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    _map_usage[_map_usage Function]
    request_usage[RequestUsage (from agent_utilities_results)]
    _map_usage --> request_usage
```

### Core Components

#### `_map_usage(response: V2ChatResponse) -> usage.RequestUsage`

This function takes a `V2ChatResponse` object from the Cohere API and extracts detailed usage statistics. It populates an `RequestUsage` object with:
- `input_tokens`: The number of tokens sent in the request.
- `output_tokens`: The number of tokens received in the response.
- `details`: A dictionary containing additional billed units such as `search_units` and `classifications`, if available in the Cohere response.

If no usage information is present in the Cohere response, an empty `RequestUsage` object is returned.

## How it Fits into the Overall System

The `cohere_usage_mapping` module is an integral part of the [pydantic_ai_models](pydantic_ai_models.md) component, specifically within the [provider_usage_mapping](provider_usage_mapping.md) sub-module. Its `_map_usage` function is invoked by the Cohere model integration (e.g., within `pydantic_ai_slim.pydantic_ai.models.cohere.CohereModel`) after receiving a response from the Cohere API. This allows the `pydantic_ai` framework to uniformly track and report usage statistics, regardless of the underlying LLM provider. This mapping is crucial for cost tracking, monitoring, and potentially for implementing usage-based billing or rate limiting within applications built using `pydantic_ai`.