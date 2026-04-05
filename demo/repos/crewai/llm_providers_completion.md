The `llm_providers_completion` module serves as a central hub for integrating various Large Language Model (LLM) providers into the CrewAI framework, specifically for handling chat completion functionalities. It offers native implementations for popular LLM services, ensuring seamless interaction, consistent API calls, and standardized output processing across different models. This module abstracts away the complexities of individual LLM APIs, allowing CrewAI agents to leverage diverse generative AI capabilities with a unified interface.

### Architecture of the Module

```mermaid
graph TD
    A[llm_providers_completion Module] --> B(AnthropicCompletion)
    A --> C(AzureCompletion)
    A --> D(BedrockCompletion)
    A --> E(GeminiCompletion)
    A --> F(OpenAICompletion)
    A --> G(OpenAICompatibleCompletion)

    B -- inherits --> H(BaseLLM)
    C -- inherits --> H
    D -- inherits --> H
    E -- inherits --> H
    F -- inherits --> H
    G -- inherits --> H

    click B "anthropic_completion.md" "View Anthropic Completion Docs"
    click C "azure_completion.md" "View Azure Completion Docs"
    click D "bedrock_completion.md" "View Bedrock Completion Docs"
    click E "gemini_completion.md" "View Gemini Completion Docs"
    click F "openai_completion.md" "View OpenAI Completion Docs"
    click G "openai_compatible_completion.md" "View OpenAI Compatible Completion Docs"
    click H "llm_base.md" "View Base LLM Docs"
```

### References to Core Components Documentation

*   **`BaseLLM`**: The foundational abstract class that all LLM completion providers inherit from, defining the common interface and core functionalities.
    *   [llm_base.md](llm_base.md)
*   **`AnthropicCompletion`**: Provides native integration with Anthropic's LLM completion services.
    *   [anthropic_completion.md](anthropic_completion.md)
*   **`AzureCompletion`**: Offers robust integration with Azure AI Inference chat completion services.
    *   [azure_completion.md](azure_completion.md)
*   **`BedrockCompletion`**: Implements native support for AWS Bedrock's Converse API for LLM completions.
    *   [bedrock_completion.md](bedrock_completion.md)
*   **`GeminiCompletion`**: Integrates with Google's Gemini large language models, supporting function calling and streaming.
    *   [gemini_completion.md](gemini_completion.md)
*   **`OpenAICompletion`**: Provides flexible integration with OpenAI's Chat Completions and Responses APIs.
    *   [openai_completion.md](openai_completion.md)
*   **`OpenAICompatibleCompletion`**: A generic implementation for LLMs that adhere to the OpenAI API standard.
    *   [openai_compatible_completion.md](openai_compatible_completion.md)