# SambaNova Provider Module

## Introduction

The `sambanova_provider` module integrates SambaNova AI models into the system, leveraging their OpenAI-compatible API. This module provides a robust and configurable interface for interacting with various SambaNova-served models, including those based on Meta Llama, DeepSeek, Qwen, and Mistral architectures.

## Purpose and Core Functionality

The primary purpose of the `sambanova_provider` module is to offer a standardized way to access and utilize SambaNova's diverse range of language models. It abstracts away the specifics of connecting to the SambaNova API, providing a consistent `Provider` interface within the larger system.

The core functionality is encapsulated within the `SambaNovaProvider` class:

*   **OpenAI Compatibility**: It utilizes an `AsyncOpenAI` client, making it seamlessly compatible with existing OpenAI API integrations.
*   **Flexible Initialization**: Allows for configuration via constructor parameters (`api_key`, `base_url`, `openai_client`, `http_client`) or environment variables (`SAMBANOVA_API_KEY`, `SAMBANOVA_BASE_URL`).
*   **Dynamic Model Profiling**: The `model_profile` static method intelligently selects and applies the correct model profile based on the requested model's name, supporting various underlying architectures like Meta Llama, DeepSeek, Qwen, and Mistral.
*   **HTTP Client Management**: Integrates with an asynchronous HTTP client (`httpx.AsyncClient`) for efficient and non-blocking API requests.

## Architecture and Component Relationships

The `sambanova_provider` module is centered around the `SambaNovaProvider` class, which acts as the primary interface for SambaNova model interactions. It establishes and manages the connection to the SambaNova API and handles the configuration of model profiles.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "sambanova_provider_class", "label": "SambaNovaProvider", "type": "component", "link": null},
        {"id": "async_openai_client", "label": "AsyncOpenAI Client", "type": "component", "link": null},
        {"id": "model_profile_logic", "label": "Model Profile Logic (static method)", "type": "component", "link": null},
        {"id": "api_key_handler", "label": "API Key Handler", "type": "component", "link": null},
        {"id": "base_url_config", "label": "Base URL Configuration", "type": "component", "link": null},
        {"id": "pydantic_ai_models", "label": "Pydantic AI Models", "type": "external", "link": "pydantic_ai_models.md"},
        {"id": "model_profiles", "label": "Model Profiles", "type": "external", "link": "model_profiles.md"}
    ],
    "edges": [
        {"source": "sambanova_provider_class", "target": "async_openai_client"},
        {"source": "sambanova_provider_class", "target": "model_profile_logic"},
        {"source": "sambanova_provider_class", "target": "api_key_handler"},
        {"source": "sambanova_provider_class", "target": "base_url_config"},
        {"source": "async_openai_client", "target": "api_key_handler"},
        {"source": "async_openai_client", "target": "base_url_config"},
        {"source": "model_profile_logic", "target": "pydantic_ai_models"},
        {"source": "model_profile_logic", "target": "model_profiles"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    sambanova_provider_class[SambaNovaProvider]
    async_openai_client[AsyncOpenAI Client]
    model_profile_logic[Model Profile Logic (static method)]
    api_key_handler[API Key Handler]
    base_url_config[Base URL Configuration]
    pydantic_ai_models[Pydantic AI Models]
    model_profiles[Model Profiles]

    sambanova_provider_class --> async_openai_client
    sambanova_provider_class --> model_profile_logic
    sambanova_provider_class --> api_key_handler
    sambanova_provider_class --> base_url_config
    async_openai_client --> api_key_handler
    async_openai_client --> base_url_config
    model_profile_logic --> pydantic_ai_models
    model_profile_logic --> model_profiles
```

### Components

*   **`SambaNovaProvider`**: The main class that implements the `Provider` interface. It manages the lifecycle of the SambaNova API client and provides methods for interacting with models.
*   **`AsyncOpenAI Client`**: An instance of `openai.AsyncOpenAI` configured to communicate with the SambaNova API endpoint. This client is responsible for sending requests and receiving responses.
*   **`Model Profile Logic`**: This component, specifically the `model_profile` static method, is responsible for determining the appropriate `ModelProfile` for a given SambaNova model. It uses prefix matching to identify the underlying model architecture.
*   **`API Key Handler`**: Manages the retrieval of the SambaNova API key, prioritizing the key provided during initialization over environment variables (`SAMBANOVA_API_KEY`).
*   **`Base URL Configuration`**: Handles the setting of the API base URL, defaulting to `https://api.sambanova.ai/v1` if not explicitly provided.

### Dependencies

The `sambanova_provider` module relies on several external components and modules to fulfill its functionality:

*   **[Pydantic AI Models](pydantic_ai_models.md)**: Provides the `ModelProfile`, `OpenAIModelProfile`, and `OpenAIJsonSchemaTransformer` classes, crucial for defining and adapting model capabilities and output schemas.
*   **[Model Profiles](model_profiles.md)**: Contains various model-specific profiles (e.g., `deepseek_model_profile`, `meta_model_profile`, `qwen_model_profile`, `mistral_model_profile`) that are dynamically applied by the `SambaNovaProvider` based on the model name.
*   **OpenAI Library**: The `AsyncOpenAI` client is a direct dependency, enabling communication with SambaNova's OpenAI-compatible API.
*   **`os` module**: Used for retrieving environment variables (`SAMBANOVA_API_KEY`, `SAMBANOVA_BASE_URL`).
*   **`httpx` library**: Utilized by the `AsyncOpenAI` client for making asynchronous HTTP requests.

## How the Module Fits into the Overall System

The `sambanova_provider` module is a key component within the larger `pydantic_ai_providers` system, specifically categorized under [OpenAI Compatible Providers](pydantic_ai_providers.md#openai-compatible-providers). Its integration allows the system to seamlessly incorporate SambaNova's advanced AI models alongside other providers that adhere to the OpenAI API standard.

By providing a unified `Provider` interface, `sambanova_provider` enables developers to swap between different model providers with minimal code changes, fostering flexibility and extensibility in AI application development. It contributes to the system's ability to leverage a diverse ecosystem of AI models by abstracting provider-specific implementation details.
