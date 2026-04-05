# Vercel_Provider Module Documentation

## Introduction

The `vercel_provider` module provides an interface for interacting with the Vercel AI Gateway API. It allows the Pydantic AI framework to leverage Vercel's unified API for various AI models, abstracting away the underlying provider-specific implementations.

## Core Functionality

The primary component of this module is the `VercelProvider` class, which extends the `Provider` abstraction. It facilitates communication with the Vercel AI Gateway by configuring an `AsyncOpenAI` client.

### `VercelProvider` Class

-   **Purpose**: Acts as a bridge to the Vercel AI Gateway, enabling access to a multitude of AI models through a single endpoint.
-   **Initialization**: The provider can be initialized with an API key (retrieved from `VERCEL_AI_GATEWAY_API_KEY` or `VERCEL_OIDC_TOKEN` environment variables, or passed directly), and optionally a pre-configured `AsyncOpenAI` client or an `httpx.AsyncClient`. It sets default headers to identify requests originating from `pydantic-ai`.
-   **Properties**:
    -   `name`: Returns `"vercel"`.
    -   `base_url`: Specifies the Vercel AI Gateway endpoint: `https://ai-gateway.vercel.sh/v1`.
    -   `client`: Returns the configured `AsyncOpenAI` client instance.
-   **`model_profile` Method**: This static method is crucial for handling diverse model configurations. It maps incoming model names (e.g., "anthropic/claude-3-opus-20240229") to appropriate `ModelProfile` instances. It supports profiles for Anthropic, Bedrock, Cohere, DeepSeek, Mistral, OpenAI, Vertex (Google), and XAI (Grok). If no specific provider is identified, it defaults to an `OpenAIModelProfile` to ensure consistent JSON schema transformation, maintaining compatibility with `OpenAIChatModel` behavior.

## Architecture and Component Relationships

The `vercel_provider` module is a leaf module within the `pydantic_ai_providers` ecosystem. Its core component, `VercelProvider`, relies on external libraries like `openai` (specifically `AsyncOpenAI`) and `httpx` for its networking capabilities. It also interacts with various model profile definitions to correctly interpret and configure different AI models routed through the Vercel AI Gateway.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "vercel_provider_class", "label": "VercelProvider", "type": "component", "link": null},
        {"id": "async_openai", "label": "AsyncOpenAI (openai)", "type": "external", "link": null},
        {"id": "httpx_client", "label": "httpx.AsyncClient", "type": "external", "link": null},
        {"id": "model_profiles", "label": "Model Profiles (pydantic_ai_providers)", "type": "external", "link": "model_profiles.md"},
        {"id": "openai_json_schema_transformer", "label": "OpenAIJsonSchemaTransformer (pydantic_ai_models)", "type": "external", "link": "pydantic_ai_models.md"},
        {"id": "user_error", "label": "UserError", "type": "external", "link": null},
        {"id": "cached_async_http_client", "label": "cached_async_http_client", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "vercel_provider_class", "target": "async_openai"},
        {"source": "vercel_provider_class", "target": "httpx_client"},
        {"source": "vercel_provider_class", "target": "model_profiles"},
        {"source": "vercel_provider_class", "target": "openai_json_schema_transformer"},
        {"source": "vercel_provider_class", "target": "user_error"},
        {"source": "vercel_provider_class", "target": "cached_async_http_client"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    vercel_provider_class[VercelProvider]
    async_openai[AsyncOpenAI (openai)]
    httpx_client[httpx.AsyncClient]
    model_profiles[Model Profiles (pydantic_ai_providers)]
    openai_json_schema_transformer[OpenAIJsonSchemaTransformer (pydantic_ai_models)]
    user_error[UserError]
    cached_async_http_client[cached_async_http_client]

    vercel_provider_class --> async_openai
    vercel_provider_class --> httpx_client
    vercel_provider_class --> model_profiles
    vercel_provider_class --> openai_json_schema_transformer
    vercel_provider_class --> user_error
    vercel_provider_class --> cached_async_http_client
```

## Integration with the Overall System

The `vercel_provider` module is a part of the `pydantic_ai_providers` module, which centralizes the management and configuration of various AI model providers. By implementing the `Provider` abstract base class, `VercelProvider` seamlessly integrates into the broader Pydantic AI framework, allowing the system to use Vercel's AI Gateway as another source for large language models. This design promotes modularity, enabling easy addition or removal of AI providers without significantly impacting the core agent or model interaction logic. It specifically falls under the `openai_compatible_providers` category within `pydantic_ai_providers`, signifying its ability to work with models that conform to the OpenAI API specification via the Vercel gateway.