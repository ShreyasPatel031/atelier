# heroku_provider

The `heroku_provider` module provides an interface for interacting with Heroku's OpenAI-compatible API. It encapsulates the necessary configuration and client instantiation to allow other parts of the system to seamlessly utilize Heroku's language models.

## Core Functionality

The primary component of this module is the `HerokuProvider` class, which serves as a concrete implementation of a language model provider.

### HerokuProvider

The `HerokuProvider` class facilitates communication with the Heroku inference endpoint. It extends `Provider[AsyncOpenAI]`, indicating its compatibility with the OpenAI client library.

**Key Features:**
*   **Name:** Returns 'heroku' as the provider's identifier.
*   **Base URL:** Dynamically retrieves the base URL of the Heroku API endpoint.
*   **Client Management:** Provides access to an `AsyncOpenAI` client instance, handling its initialization and configuration.
*   **Model Profiling:** Associates models provided by Heroku with an `OpenAIModelProfile`, which includes an `OpenAIJsonSchemaTransformer` to ensure compatibility with OpenAI's function calling mechanisms.
*   **Flexible Initialization:** Allows instantiation with an existing `AsyncOpenAI` client, or by providing an API key and an optional base URL. It prioritizes environment variables (`HEROKU_INFERENCE_KEY`, `HEROKU_INFERENCE_URL`) for configuration if not explicitly provided.

**Code Snippet:**
```python
class HerokuProvider(Provider[AsyncOpenAI]):
    """Provider for Heroku API."""

    @property
    def name(self) -> str:
        return 'heroku'

    @property
    def base_url(self) -> str:
        return str(self.client.base_url)

    @property
    def client(self) -> AsyncOpenAI:
        return self._client

    @staticmethod
    def model_profile(model_name: str) -> ModelProfile | None:
        # As the Heroku API is OpenAI-compatible, let's assume we also need OpenAIJsonSchemaTransformer.
        return OpenAIModelProfile(json_schema_transformer=OpenAIJsonSchemaTransformer)

    @overload
    def __init__(self) -> None: ...

    @overload
    def __init__(self, *, api_key: str) -> None: ...

    @overload
    def __init__(self, *, api_key: str, http_client: httpx.AsyncClient) -> None: ...

    @overload
    def __init__(self, *, openai_client: AsyncOpenAI | None = None) -> None: ...

    def __init__(
        self,
        *,
        base_url: str | None = None,
        api_key: str | None = None,
        openai_client: AsyncOpenAI | None = None,
        http_client: httpx.AsyncClient | None = None,
    ) -> None:
        if openai_client is not None:
            assert http_client is None, 'Cannot provide both `openai_client` and `http_client`'
            assert api_key is None, 'Cannot provide both `openai_client` and `api_key`'
            self._client = openai_client
        else:
            api_key = api_key or os.getenv('HEROKU_INFERENCE_KEY')
            if not api_key:
                raise UserError(
                    'Set the `HEROKU_INFERENCE_KEY` environment variable or pass it via `HerokuProvider(api_key=...)`'
                    'to use the Heroku provider.'
                )

            base_url = base_url or os.getenv('HEROKU_INFERENCE_URL', 'https://us.inference.heroku.com')
            base_url = base_url.rstrip('/') + '/v1'

            if http_client is not None:
                self._client = AsyncOpenAI(api_key=api_key, http_client=http_client, base_url=base_url)
            else:
                http_client = cached_async_http_client(provider='heroku')
                self._client = AsyncOpenAI(api_key=api_key, http_client=http_client, base_url=base_url)
```

## Architecture and Component Relationships

The `heroku_provider` module, centered around the `HerokuProvider` class, integrates with external libraries and other internal modules to provide its functionality.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "heroku_provider_component", "label": "HerokuProvider", "type": "component", "link": null},
        {"id": "async_openai", "label": "AsyncOpenAI (openai library)", "type": "external", "link": null},
        {"id": "model_profile", "label": "OpenAIModelProfile", "type": "external", "link": "pydantic_ai_models.md"},
        {"id": "json_transformer", "label": "OpenAIJsonSchemaTransformer", "type": "external", "link": "pydantic_ai_models.md"},
        {"id": "http_client_utils", "label": "HTTP Client Utilities", "type": "component", "link": null},
        {"id": "environment_vars", "label": "Environment Variables (HEROKU_INFERENCE_KEY, HEROKU_INFERENCE_URL)", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "heroku_provider_component", "target": "async_openai"},
        {"source": "heroku_provider_component", "target": "model_profile"},
        {"source": "heroku_provider_component", "target": "json_transformer"},
        {"source": "heroku_provider_component", "target": "http_client_utils"},
        {"source": "heroku_provider_component", "target": "environment_vars"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    heroku_provider_component[HerokuProvider]
    async_openai[AsyncOpenAI (openai library)]
    model_profile[OpenAIModelProfile]
    json_transformer[OpenAIJsonSchemaTransformer]
    http_client_utils[HTTP Client Utilities]
    environment_vars[Environment Variables (HEROKU_INFERENCE_KEY, HEROKU_INFERENCE_URL)]

    heroku_provider_component --> async_openai
    heroku_provider_component --> model_profile
    heroku_provider_component --> json_transformer
    heroku_provider_component --> http_client_utils
    heroku_provider_component --> environment_vars

    click model_profile "pydantic_ai_models.md"
    click json_transformer "pydantic_ai_models.md"
```

## How the Module Fits into the Overall System

The `heroku_provider` module is a specific implementation within the `pydantic_ai_providers` module family. Its role is to extend the system's capability to interact with various AI model providers by adding support for Heroku's OpenAI-compatible inference endpoints.

It acts as a bridge, allowing the core agent and model components (from [pydantic_ai_core](pydantic_ai_agent_core.md) and [pydantic_ai_models](pydantic_ai_models.md)) to transparently utilize Heroku-hosted models as if they were standard OpenAI models. This modular design ensures that new providers can be integrated with minimal impact on the broader system architecture, promoting flexibility and extensibility. Specifically, its integration as an OpenAI-compatible provider allows it to leverage the existing `openai_model_integration` found in [pydantic_ai_models](pydantic_ai_models.md) and other related OpenAI toolsets and utilities.
