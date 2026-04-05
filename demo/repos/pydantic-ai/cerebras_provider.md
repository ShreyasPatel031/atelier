# cerebras_provider Module Documentation

The `cerebras_provider` module provides the integration for interacting with the Cerebras AI API within the Pydantic AI framework. It enables users to leverage Cerebras models, offering a consistent interface for model interaction, authentication, and configuration.

## Core Functionality

The primary component of this module is the `CerebrasProvider` class, which extends the `Provider` abstract base class. This class is responsible for:

*   **API Client Management**: Instantiating and managing the `AsyncOpenAI` client specifically configured for the Cerebras API endpoint.
*   **Authentication**: Handling API key authentication, retrieving the key from environment variables (`CEREBRAS_API_KEY`) or directly from constructor arguments.
*   **Model Profiling**: Providing specific model profiles for Cerebras models, including mapping common model prefixes (e.g., 'llama', 'qwen', 'gpt-oss', 'zai') to their respective configurations and handling unsupported OpenAI features.
*   **Header Management**: Automatically adding a custom header (`X-Cerebras-3rd-Party-Integration`) for better integration tracking.

### `CerebrasProvider` Class

```python
class CerebrasProvider(Provider[AsyncOpenAI]):
    """Provider for Cerebras API."""

    @property
    def name(self) -> str:
        return 'cerebras'

    @property
    def base_url(self) -> str:
        return 'https://api.cerebras.ai/v1'

    @property
    def client(self) -> AsyncOpenAI:
        return self._client

    @staticmethod
    def model_profile(model_name: str) -> ModelProfile | None:
        # ... (implementation details for model profiling) ...

    def __init__(
        self,
        *,
        api_key: str | None = None,
        openai_client: AsyncOpenAI | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        # ... (implementation details for initialization) ...
```

#### Key Methods and Properties:

*   **`name`**: Returns the provider's identifier, 'cerebras'.
*   **`base_url`**: Specifies the base URL for the Cerebras API, `https://api.cerebras.ai/v1`.
*   **`client`**: Provides access to the configured `AsyncOpenAI` client instance.
*   **`model_profile(model_name: str)`**: A static method that returns a `ModelProfile` for a given Cerebras model name. It intelligently selects an appropriate profile based on model prefixes and applies Cerebras-specific overrides, such as declaring unsupported OpenAI model settings. It also indicates if the model supports "thinking" capabilities.
*   **`__init__`**: The constructor allows flexible initialization, accepting an `api_key`, an existing `AsyncOpenAI` client, or an `httpx.AsyncClient` for custom HTTP request handling. It ensures that an API key is provided either directly or via the `CEREBRAS_API_KEY` environment variable.

## Architecture and Component Relationships

The `cerebras_provider` module primarily consists of the `CerebrasProvider` class, which acts as an adapter for the Cerebras API. It relies on external libraries for HTTP communication and OpenAI-compatible client functionality, and integrates with other Pydantic AI modules for model profiling and base provider abstractions.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "cerebras_provider_class", "label": "CerebrasProvider", "type": "component", "link": null},
        {"id": "pydantic_ai_providers_base", "label": "Provider Base Class", "type": "external", "link": "pydantic_ai_providers.md"},
        {"id": "openai_client_lib", "label": "AsyncOpenAI Client (External)", "type": "external", "link": null},
        {"id": "pydantic_ai_models_module", "label": "Pydantic AI Models", "type": "external", "link": "pydantic_ai_models.md"},
        {"id": "model_profiles_module", "label": "Model Profiles", "type": "external", "link": "model_profiles.md"}
    ],
    "edges": [
        {"source": "cerebras_provider_class", "target": "pydantic_ai_providers_base"},
        {"source": "cerebras_provider_class", "target": "openai_client_lib"},
        {"source": "cerebras_provider_class", "target": "pydantic_ai_models_module"},
        {"source": "cerebras_provider_class", "target": "model_profiles_module"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    cerebras_provider_class[CerebrasProvider]
    pydantic_ai_providers_base[Provider Base Class]:::external
    openai_client_lib[AsyncOpenAI Client (External)]:::external
    pydantic_ai_models_module[Pydantic AI Models]:::external
    model_profiles_module[Model Profiles]:::external

    cerebras_provider_class --> pydantic_ai_providers_base
    cerebras_provider_class --> openai_client_lib
    cerebras_provider_class --> pydantic_ai_models_module
    cerebras_provider_class --> model_profiles_module

    linkStyle 0 stroke-width:2px,fill:none,stroke:black;
    linkStyle 1 stroke-width:2px,fill:none,stroke:black;
    linkStyle 2 stroke-width:2px,fill:none,stroke:black;
    linkStyle 3 stroke-width:2px,fill:none,stroke:black;

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

## Integration with the Overall System

The `cerebras_provider` module seamlessly integrates into the `pydantic_ai_providers` ecosystem by implementing the `Provider` interface. This allows it to be used interchangeably with other AI model providers, offering a unified way to interact with various large language models.

*   **Pydantic AI Providers**: As a sub-module of `pydantic_ai_providers`, it contributes to the overall extensibility of the framework by adding support for Cerebras models. Refer to the [pydantic_ai_providers documentation](pydantic_ai_providers.md) for more details on the provider architecture.
*   **Pydantic AI Models**: The `CerebrasProvider` utilizes concepts and classes from the [pydantic_ai_models documentation](pydantic_ai_models.md), specifically `OpenAIModelProfile` and `OpenAIJsonSchemaTransformer`, to correctly interpret and adapt model responses and capabilities.
*   **Model Profiles**: The `model_profile` static method leverages specific [model_profiles documentation](model_profiles.md) (e.g., `meta_model_profile`, `qwen_model_profile`) to configure models with appropriate settings and behaviors.
