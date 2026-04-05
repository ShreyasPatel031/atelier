# Nebius Provider Module Documentation

## Introduction

The `nebius_provider` module integrates the Nebius AI Studio API with the `pydantic_ai` framework. It provides the `NebiusProvider` class, which acts as an adapter to facilitate communication with Nebius-hosted large language models. This module is essential for applications that need to leverage Nebius AI Studio services within the `pydantic_ai` ecosystem.

## Core Functionality

The primary component of this module is the `NebiusProvider` class. It extends the `Provider` abstract class (from the `pydantic_ai_providers` module) and is specifically typed to work with `AsyncOpenAI` clients, enabling seamless interaction with OpenAI-compatible endpoints provided by Nebius.

### `NebiusProvider` Class

**Purpose**: Manages the connection to the Nebius AI Studio API, including API key handling, base URL configuration, and client instantiation. It also provides a mechanism to map Nebius-hosted model names to appropriate `ModelProfile` configurations.

**Key Features**:

*   **`name` Property**: Returns the provider's identifier, "nebius".
*   **`base_url` Property**: Defines the base endpoint for the Nebius AI Studio API (`https://api.studio.nebius.com/v1`).
*   **`client` Property**: Provides access to the underlying `AsyncOpenAI` client, which is used for making API requests.
*   **`model_profile(model_name: str)` Static Method**: This crucial method determines the appropriate `ModelProfile` for a given Nebius-hosted model. It parses the `model_name` (expected in `provider/model_id` format) and maps it to specific model profiles like `meta_model_profile`, `deepseek_model_profile`, `qwen_model_profile`, `google_model_profile`, `harmony_model_profile` (for gpt-oss models), `mistral_model_profile`, and `moonshotai_model_profile`. If a specific profile is not found or the model name is not prefixed, it defaults to `OpenAIModelProfile` with `OpenAIJsonSchemaTransformer`, ensuring compatibility with the OpenAI API specification.
*   **Constructor (`__init__`)**: Initializes the `NebiusProvider`. It can be instantiated with an `api_key`, an existing `AsyncOpenAI` client, or an `httpx.AsyncClient`. It prioritizes explicit arguments, falls back to the `NEBIUS_API_KEY` environment variable, and uses a cached HTTP client if no specific HTTP client is provided.

## Architecture and Component Relationships

The `nebius_provider` module, specifically the `NebiusProvider` class, acts as a bridge between the generic `pydantic_ai` framework's provider abstraction and the concrete implementation details of the Nebius AI Studio API. It leverages an `AsyncOpenAI` client for communication, aligning with the OpenAI-compatible nature of many modern LLM APIs.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "nebius_provider_class", "label": "NebiusProvider Class", "type": "component", "link": null},
        {"id": "async_openai_client", "label": "AsyncOpenAI Client", "type": "external", "link": "pydantic_ai_models.md"},
        {"id": "model_profile_resolver", "label": "Model Profile Resolver", "type": "component", "link": null},
        {"id": "http_client", "label": "HTTP Client (httpx.AsyncClient)", "type": "external", "link": null},
        {"id": "model_profiles_module", "label": "Model Profiles Module", "type": "external", "link": "model_profiles.md"},
        {"id": "pydantic_ai_models_module", "label": "pydantic_ai_models Module", "type": "external", "link": "pydantic_ai_models.md"},
        {"id": "pydantic_ai_providers_module", "label": "pydantic_ai_providers Module", "type": "external", "link": "pydantic_ai_providers.md"}
    ],
    "edges": [
        {"source": "nebius_provider_class", "target": "async_openai_client"},
        {"source": "nebius_provider_class", "target": "http_client"},
        {"source": "nebius_provider_class", "target": "model_profile_resolver"},
        {"source": "model_profile_resolver", "target": "model_profiles_module"},
        {"source": "nebius_provider_class", "target": "pydantic_ai_models_module"},
        {"source": "nebius_provider_class", "target": "pydantic_ai_providers_module"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    nebius_provider_class[NebiusProvider Class]
    async_openai_client[AsyncOpenAI Client]
    model_profile_resolver[Model Profile Resolver]
    http_client[HTTP Client (httpx.AsyncClient)]
    model_profiles_module[Model Profiles Module]
    pydantic_ai_models_module[pydantic_ai_models Module]
    pydantic_ai_providers_module[pydantic_ai_providers Module]

    nebius_provider_class --> async_openai_client
    nebius_provider_class --> http_client
    nebius_provider_class --> model_profile_resolver
    model_profile_resolver --> model_profiles_module
    nebius_provider_class --> pydantic_ai_models_module
    nebius_provider_class --> pydantic_ai_providers_module

    click async_openai_client "pydantic_ai_models.md"
    click model_profiles_module "model_profiles.md"
    click pydantic_ai_models_module "pydantic_ai_models.md"
    click pydantic_ai_providers_module "pydantic_ai_providers.md"
```

## How the Module Fits into the Overall System

The `nebius_provider` module is a crucial part of the `pydantic_ai_providers` ecosystem, specifically categorized under `openai_compatible_providers`. Its role is to extend the `pydantic_ai` framework's ability to interact with a diverse range of LLM providers by offering native support for Nebius AI Studio. By implementing the `Provider` interface and utilizing the `AsyncOpenAI` client, it seamlessly integrates Nebius models into workflows that might also involve models from other providers. The `model_profile` method ensures that Nebius-specific model behaviors and output transformations are correctly handled, maintaining consistent interaction across different LLM backends.

## References

*   [pydantic_ai_models Module](pydantic_ai_models.md)
*   [pydantic_ai_providers Module](pydantic_ai_providers.md)
*   [model_profiles Module](model_profiles.md)
