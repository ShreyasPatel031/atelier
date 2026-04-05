# deprecated_openai_aliases

The `deprecated_openai_aliases` module provides backward-compatible aliases for key OpenAI model components. Its primary purpose is to ensure that older codebases using the `OpenAIModel` and `OpenAIModelSettings` names can continue to function without immediate modification, while encouraging migration to the newer, more descriptive `OpenAIChatModel` and `OpenAIChatModelSettings`.

## Core Functionality

This module defines two main aliases:

- `OpenAIModel`: A direct alias for `OpenAIChatModel`. It allows existing code that instantiates `OpenAIModel` to seamlessly use the functionalities of `OpenAIChatModel`.
- `OpenAIModelSettings`: An alias for `OpenAIChatModelSettings`. This ensures that configuration settings previously applied via `OpenAIModelSettings` are correctly mapped to `OpenAIChatModelSettings`.

## Architecture and Component Relationships

The `deprecated_openai_aliases` module acts as a thin compatibility layer, redirecting calls and configurations to the actual implementations in the `openai_model_integration` module.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "openai_model_alias", "label": "OpenAIModel (Deprecated Alias)", "type": "component", "link": null},
        {"id": "openai_model_settings_alias", "label": "OpenAIModelSettings (Deprecated Alias)", "type": "component", "link": null},
        {"id": "openai_chat_model", "label": "OpenAIChatModel", "type": "external", "link": "openai_model_integration.md"},
        {"id": "openai_chat_model_settings", "label": "OpenAIChatModelSettings", "type": "external", "link": "openai_model_integration.md"}
    ],
    "edges": [
        {"source": "openai_model_alias", "target": "openai_chat_model"},
        {"source": "openai_model_settings_alias", "target": "openai_chat_model_settings"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    openai_model_alias[OpenAIModel (Deprecated Alias)]
    openai_model_settings_alias[OpenAIModelSettings (Deprecated Alias)]
    openai_chat_model[OpenAIChatModel]
    openai_chat_model_settings[OpenAIChatModelSettings]

    openai_model_alias --> openai_chat_model
    openai_model_settings_alias --> openai_chat_model_settings

    click openai_chat_model "openai_model_integration.md"
    click openai_chat_model_settings "openai_model_integration.md"
```

## System Integration

This module is part of the `pydantic_ai_models` ecosystem, specifically within the `openai_model_integration` submodule. It provides a transitional mechanism, allowing for a smooth migration path from older naming conventions to the current ones. By aliasing the deprecated names to their modern counterparts, the module ensures that updates to the underlying `OpenAIChatModel` and `OpenAIChatModelSettings` are automatically reflected, without requiring immediate code changes in dependent modules still using the deprecated names. Developers are encouraged to update their imports and usages to the non-deprecated classes for clarity and to avoid future compatibility warnings.