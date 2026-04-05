# Bedrock Model Configurations

The `bedrock_model_configurations` module is responsible for defining and configuring model profiles specifically for Amazon Bedrock models within the Pydantic AI framework. It extends base model profiles with Bedrock-specific capabilities such as tool choice support and prompt caching.

## Architecture and Component Relationships

This module contains the `bedrock_amazon_model_profile` function, which customizes model profiles for different Amazon Bedrock models. It integrates with more general model profile definitions and utilizes built-in tools.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "bedrock_amazon_model_profile", "label": "bedrock_amazon_model_profile", "type": "component", "link": null},
        {"id": "model_profile_base", "label": "Model Profile (Base)", "type": "external", "link": "pydantic_ai_providers.md"},
        {"id": "code_execution_tool", "label": "CodeExecutionTool", "type": "external", "link": "pydantic_ai_tools.md"},
        {"id": "amazon_model_profile", "label": "amazon_model_profile", "type": "external", "link": "pydantic_ai_providers.md"}
    ],
    "edges": [
        {"source": "bedrock_amazon_model_profile", "target": "model_profile_base"},
        {"source": "bedrock_amazon_model_profile", "target": "code_execution_tool"},
        {"source": "bedrock_amazon_model_profile", "target": "amazon_model_profile"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    bedrock_amazon_model_profile[bedrock_amazon_model_profile]
    model_profile_base[Model Profile (Base)]
    code_execution_tool[CodeExecutionTool]
    amazon_model_profile[amazon_model_profile]

    bedrock_amazon_model_profile --> model_profile_base
    bedrock_amazon_model_profile --> code_execution_tool
    bedrock_amazon_model_profile --> amazon_model_profile
```

### `bedrock_amazon_model_profile`

```python
def bedrock_amazon_model_profile(model_name: str) -> ModelProfile | None:
    """Get the model profile for an Amazon model used via Bedrock."""
    profile = _without_builtin_tools(amazon_model_profile(model_name))
    if 'nova' in model_name:
        profile = BedrockModelProfile(
            bedrock_supports_tool_choice=True,
            bedrock_supports_prompt_caching=True,
        ).update(profile)

    if 'nova-2' in model_name:
        profile.supported_builtin_tools = frozenset({CodeExecutionTool})

    return profile
```

This function retrieves and customizes the `ModelProfile` for a given Amazon Bedrock `model_name`. It first obtains a base Amazon model profile and then applies Bedrock-specific configurations:

-   **Nova Models**: If the `model_name` contains "nova", it sets `bedrock_supports_tool_choice` and `bedrock_supports_prompt_caching` to `True` for the profile.
-   **Nova-2 Models**: If the `model_name` contains "nova-2", it explicitly sets `CodeExecutionTool` as a supported built-in tool.

This customization ensures that the Pydantic AI framework can correctly interact with and leverage the specific features offered by different Amazon Bedrock models.

## How the Module Fits into the Overall System

This module is a leaf module within the `pydantic_ai_providers.model_profiles` hierarchy. It specializes in Bedrock model configurations, building upon more general model profile definitions provided by the [pydantic_ai_providers](pydantic_ai_providers.md) module. It defines how specific Bedrock models behave within the Pydantic AI agent, especially concerning tool usage and performance features like prompt caching.

-   **[pydantic_ai_providers](pydantic_ai_providers.md)**: Provides the overarching framework for model providers and general model profiles, which this module extends.
-   **[pydantic_ai_tools](pydantic_ai_tools.md)**: Defines various built-in tools, such as `CodeExecutionTool`, which are supported by certain Bedrock models as configured here.
