# groq_base_profiles Module Documentation

## Introduction

The `groq_base_profiles` module is a crucial component within the `pydantic_ai_providers` ecosystem, specifically designed to define and configure the base `ModelProfile` for various Groq models. It plays a vital role in enabling or disabling certain AI capabilities, such as web search integration and advanced reasoning, based on the specific Groq model being used.

This module ensures that Groq models are correctly initialized with their inherent capabilities and limitations, providing a standardized way to manage their features within the larger AI system.

## Architecture and Component Relationships

The `groq_base_profiles` module contains the core logic for generating a `ModelProfile` specific to Groq models. It identifies model characteristics and applies corresponding configurations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "groq_model_profile_func", "label": "groq_model_profile(model_name)", "type": "component", "link": null},
        {"id": "model_profile_type", "label": "ModelProfile", "type": "external", "link": "pydantic_ai_models.md"},
        {"id": "groq_provider", "label": "GroqProvider (Uses Profile)", "type": "external", "link": "pydantic_ai_providers.md"}
    ],
    "edges": [
        {"source": "groq_model_profile_func", "target": "model_profile_type", "label": "Creates"},
        {"source": "groq_model_profile_func", "target": "groq_provider", "label": "Configures"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    groq_model_profile_func[groq_model_profile(model_name)]
    model_profile_type[ModelProfile]
    groq_provider[GroqProvider (Uses Profile)]

    groq_model_profile_func -->|Creates| model_profile_type
    groq_model_profile_func -->|Configures| groq_provider
```

### Core Components

#### `groq_model_profile(model_name)`

- **Description**: This function is the primary entry point for configuring Groq model profiles. It takes a `model_name` as input and returns a `ModelProfile` object tailored to that specific Groq model.
- **Functionality**:
    - **Reasoning Model Identification**: It checks if the provided `model_name` corresponds to a known reasoning model (e.g., `qwen/qwen3`, `deepseek-r1`, `llama-4-maverick`).
    - **Web Search Capability**: It determines if the model inherently supports a web search built-in tool, specifically for models prefixed with `compound-`.
    - **Thinking Mechanism**: It configures whether the model supports and has thinking mechanisms always enabled, with special handling for `qwen/qwen3` which allows disabling reasoning.
- **Parameters**:
    - `model_name` (str): The name of the Groq model for which to retrieve the profile.
- **Returns**:
    - `ModelProfile`: An object containing the configured capabilities and settings for the specified Groq model.
- **Usage**: Used internally by the Groq provider to set up the correct behaviors for different Groq models.

## How it Fits into the Overall System

The `groq_base_profiles` module is a specialized part of the larger [pydantic_ai_providers](pydantic_ai_providers.md) module. It provides specific configuration logic for Groq models, which are then utilized by the `GroqProvider` (part of [pydantic_ai_providers](pydantic_ai_providers.md)) to instantiate and manage Groq-based AI agents.

By centralizing Groq-specific model profile definitions, this module ensures consistency and simplifies the integration of various Groq models into the `pydantic_ai` framework. It directly influences how an AI agent powered by a Groq model behaves, especially regarding its ability to perform web searches or engage in complex reasoning. The `ModelProfile` returned by this module is a core data structure defined in [pydantic_ai_models](pydantic_ai_models.md).