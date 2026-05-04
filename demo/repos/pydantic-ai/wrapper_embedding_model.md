# Wrapper Embedding Model

This module introduces the `WrapperEmbeddingModel`, a versatile base class designed for creating custom embedding model wrappers. It allows developers to extend or modify the behavior of existing embedding models without altering their core implementation, enabling functionalities such as caching, logging, or rate limiting.

## Core Functionality

The `WrapperEmbeddingModel` works by encapsulating an underlying `EmbeddingModel` instance. By default, all embedding operations and property accessors (like `embed`, `max_input_tokens`, `model_name`, `system`, and `settings`) are delegated directly to the wrapped model. This pass-through mechanism ensures that the wrapper behaves identically to the underlying model unless specific methods are overridden.

### Customizing Behavior

Developers can inherit from `WrapperEmbeddingModel` and override any of its methods to introduce custom logic. For example, one could override the `embed` method to implement a caching layer, or the `max_input_tokens` method to enforce specific rate limits before delegating to the `wrapped` model.

### Initialization

The wrapper can be initialized with an `EmbeddingModel` instance or a string representing a model name. If a string is provided, the module uses the `infer_embedding_model` utility to resolve and instantiate the appropriate embedding model, ensuring flexible configuration.

## Architecture Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "wrapper_embedding_model",
            "label": "Custom Embedding Model Wrapper",
            "type": "component",
            "link": null
        },
        {
            "id": "wrapped_model",
            "label": "Underlying Embedding Model",
            "type": "component",
            "link": null
        },
        {
            "id": "infer_embedding_model",
            "label": "Determine Embedding Model",
            "type": "external",
            "link": "embedding_interface.md"
        },
        {
            "id": "base_embedding_model",
            "label": "Define Base Embedding Behavior",
            "type": "external",
            "link": "base_embedding_model.md"
        }
    ],
    "edges": [
        {
            "source": "wrapper_embedding_model",
            "target": "wrapped_model",
            "label": "delegates operations to"
        },
        {
            "source": "wrapper_embedding_model",
            "target": "infer_embedding_model",
            "label": "initializes wrapped model via"
        },
        {
            "source": "wrapper_embedding_model",
            "target": "base_embedding_model",
            "label": "inherits functionality from"
        }
    ],
    "groups": []
}
-->
```mermaid
flowchart TD
    %% Main components of the Wrapper Embedding Model
    wrapper_embedding_model["Custom Embedding Model Wrapper"]
    wrapped_model["Underlying Embedding Model"]

    %% External Dependencies
    infer_embedding_model["Determine Embedding Model"]
    base_embedding_model["Define Base Embedding Behavior"]

    %% Relationships
    wrapper_embedding_model -->|"delegates operations to"| wrapped_model
    wrapper_embedding_model -.->|"initializes wrapped model via"| infer_embedding_model
    wrapper_embedding_model --|>|"inherits functionality from"| base_embedding_model

    %% Links to other documentation
    click infer_embedding_model "embedding_interface.md"
    click base_embedding_model "base_embedding_model.md"
```

## Integration with Other Modules

- **Embedding Interface**: The `WrapperEmbeddingModel` relies on the `infer_embedding_model` function, which is part of the [embedding_interface](embedding_interface.md) module, for dynamic resolution of embedding models during initialization.
- **Base Embedding Model**: It extends the core capabilities defined in the [base_embedding_model](base_embedding_model.md), adhering to the standard interface for all embedding models within the system. This ensures compatibility and allows wrappers to be used interchangeably with any standard embedding model implementation.
