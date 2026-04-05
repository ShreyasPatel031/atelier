# Model Profiles Module

The `model_profiles` module is responsible for defining and managing specific configurations and capabilities for various AI models across different providers. These profiles are essential for tailoring model behavior, such as supporting tool use, JSON output, or specific response formats, based on the model and its integration.

## Architecture Overview

The `model_profiles` module interacts with individual provider-specific configurations to create a comprehensive profile for each model. It ensures that models are used with their optimal settings and capabilities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "groq_model_configurations", "label": "Groq Model Configurations", "type": "module", "link": "groq_model_configurations.md"},
        {"id": "bedrock_model_configurations", "label": "Bedrock Model Configurations", "type": "module", "link": "bedrock_model_configurations.md"},
        {"id": "harmony_model_configurations", "label": "Harmony Model Configurations", "type": "module", "link": "harmony_model_configurations.md"},
        {"id": "openrouter_model_configurations", "label": "OpenRouter Model Configurations", "type": "module", "link": "openrouter_model_configurations.md"}
    ],
    "edges": [
        {"source": "groq_model_configurations", "target": "pydantic_ai_providers"},
        {"source": "bedrock_model_configurations", "target": "pydantic_ai_providers"},
        {"source": "harmony_model_configurations", "target": "pydantic_ai_models"},
        {"source": "openrouter_model_configurations", "target": "pydantic_ai_providers"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    groq_model_configurations[Groq Model Configurations]
    bedrock_model_configurations[Bedrock Model Configurations]
    harmony_model_configurations[Harmony Model Configurations]
    openrouter_model_configurations[OpenRouter Model Configurations]

    groq_model_configurations --> pydantic_ai_providers[AI Providers]
    bedrock_model_configurations --> pydantic_ai_providers
    harmony_model_configurations --> pydantic_ai_models[AI Models]
    openrouter_model_configurations --> pydantic_ai_providers

    click groq_model_configurations "groq_model_configurations.md" "View Groq Model Configurations"
    click bedrock_model_configurations "bedrock_model_configurations.md" "View Bedrock Model Configurations"
    click harmony_model_configurations "harmony_model_configurations.md" "View Harmony Model Configurations"
    click openrouter_model_configurations "openrouter_model_configurations.md" "View OpenRouter Model Configurations"

    link pydantic_ai_providers "pydantic_ai_providers.md" "See the AI Providers module"
    link pydantic_ai_models "pydantic_ai_models.md" "See the AI Models module"
```

## Sub-modules

Here are the core sub-modules within `model_profiles`:

*   ### [Groq Model Configurations](groq_model_configurations.md)
    Defines model profiles for various Groq-integrated models, including MoonshotAI and Meta models, specifying their capabilities like web search and JSON output support.

*   ### [Bedrock Model Configurations](bedrock_model_configurations.md)
    Manages model profiles for Amazon Bedrock models, outlining features such as tool choice support and prompt caching.

*   ### [Harmony Model Configurations](harmony_model_configurations.md)
    Provides the model profile for OpenAI Harmony Response format, adapting OpenAI model profiles with specific settings for streamed responses and tool choice.

*   ### [OpenRouter Model Configurations](openrouter_model_configurations.md)
    Handles model profiles for Google models accessed via OpenRouter, including adaptations for JSON Schema compatibility.
