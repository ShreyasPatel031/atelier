# model_wrapping

## Introduction

The `model_wrapping` module provides a `WrapperModel` class that acts as a proxy or decorator around another language model. This design allows for the extension or modification of model behavior without altering the core implementation of the wrapped model. It is a fundamental component for building flexible and modular model architectures within the system.

## Architecture and Component Relationships

This module contains the `WrapperModel`, which is designed to encapsulate and delegate calls to an underlying model. It inherits from the `Model` abstract base class, ensuring that any `WrapperModel` instance can be used wherever a `Model` is expected.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "wrapper_model", "label": "WrapperModel", "type": "component", "link": null},
        {"id": "model_interface_definition", "label": "Model (Interface)", "type": "external", "link": "model_interface_definition.md"}
    ],
    "edges": [
        {"source": "wrapper_model", "target": "model_interface_definition", "label": "wraps and inherits from"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    wrapper_model[WrapperModel]
    model_interface_definition[Model (Interface)]
    wrapper_model -- "wraps and inherits from" --> model_interface_definition
```

### `WrapperModel`

`WrapperModel` is the primary component of this module. It serves as a base class for models that need to wrap other models. Its key characteristics include:

-   **Delegation**: All core model operations, such as `request`, `count_tokens`, `request_stream`, `customize_request_parameters`, and `prepare_request`, are delegated directly to the `wrapped` model.
-   **Flexibility**: By wrapping another model, `WrapperModel` enables the creation of decorators that can add logging, caching, rate-limiting, or other cross-cutting concerns without modifying the original model.
-   **Polymorphism**: As it extends the `Model` class (defined in [model_interface_definition](model_interface_definition.md)), `WrapperModel` instances can seamlessly substitute any other `Model` instance.

```python
class WrapperModel(Model):
    """Model which wraps another model.

    Does nothing on its own, used as a base class.
    """

    wrapped: Model
    """The underlying model being wrapped."""

    def __init__(self, wrapped: Model | KnownModelName):
        super().__init__()
        self.wrapped = infer_model(wrapped)

    async def request(
        self,
        messages: list[ModelMessage],
        model_settings: ModelSettings | None,
        model_request_parameters: ModelRequestParameters,
    ) -> ModelResponse:
        return await self.wrapped.request(messages, model_settings, model_request_parameters)

    async def count_tokens(
        self,
        messages: list[ModelMessage],
        model_settings: ModelSettings | None,
        model_request_parameters: ModelRequestParameters,
    ) -> RequestUsage:
        return await self.wrapped.count_tokens(messages, model_settings, model_request_parameters)

    @asynccontextmanager
    async def request_stream(
        self,
        messages: list[ModelMessage],
        model_settings: ModelSettings | None,
        model_request_parameters: ModelRequestParameters,
        run_context: RunContext[Any] | None = None,
    ) -> AsyncIterator[StreamedResponse]:
        async with self.wrapped.request_stream(
            messages, model_settings, model_request_parameters, run_context
        ) as response_stream:
            yield response_stream

    def customize_request_parameters(self, model_request_parameters: ModelRequestParameters) -> ModelRequestParameters:
        return self.wrapped.customize_request_parameters(model_request_parameters)

    def prepare_request(
        self,
        model_settings: ModelSettings | None,
        model_request_parameters: ModelRequestParameters,
    ) -> tuple[ModelSettings | None, ModelRequestParameters]:
        return self.wrapped.prepare_request(model_settings, model_request_parameters)

    @property
    def model_name(self) -> str:
        return self.wrapped.model_name

    @property
    def system(self) -> str:
        return self.wrapped.system

    @property
    def profile(self) -> ModelProfile:  # type: ignore[override]
        return self.wrapped.profile

    @property
    def settings(self) -> ModelSettings | None:
        """Get the settings from the wrapped model."""
        return self.wrapped.settings

    def __getattr__(self, item: str):
        return getattr(self.wrapped, item)
```

## How it fits into the overall system

The `model_wrapping` module, specifically the `WrapperModel`, is a crucial part of the `pydantic_ai_models` ecosystem, which manages various language model integrations. By adhering to the [Model interface](model_interface_definition.md), `WrapperModel` allows for the creation of composite models and enables features like:

-   **Model Composition**: Complex model behaviors can be built by chaining multiple `WrapperModel` instances, each adding a specific functionality.
-   **Abstraction**: It provides a consistent interface to interact with diverse underlying models, abstracting away their specific implementations.
-   **Extensibility**: Developers can easily introduce new functionalities or modify existing ones by creating custom `WrapperModel` subclasses without impacting the core model logic. This promotes a clean and maintainable codebase.

This module plays a vital role in enabling flexible and extensible model handling throughout the `pydantic_ai_agent_core` module and other components that interact with language models. It works in conjunction with other components from [base_model_abstractions](base_model_abstractions.md) to provide a robust and adaptable model management layer. 