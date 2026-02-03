# Prompt Types Documentation

This module (`prompt_types`) defines concrete implementations for various prompt construction strategies, catering to different agent reasoning paradigms and language model capabilities. It provides the necessary logic to format observations, intent, and historical actions into structured inputs for Large Language Models (LLMs).

## Purpose and Core Functionality

The primary purpose of the `prompt_types` module is to offer specialized classes for constructing prompts, each tailored to specific interaction patterns with LLMs. It encapsulates the complexities of formatting textual and multimodal inputs, handling different LLM provider requirements, and managing prompt length constraints.

Key functionalities include:

-   **Multimodal Chain-of-Thought (CoT) Prompt Construction:** The `MultimodalCoTPromptConstructor` enables the creation of prompts that guide an LLM through step-by-step reasoning, incorporating both text and images (like page screenshots and additional input images). This is crucial for agents operating in visual environments.
-   **Direct Prompt Construction:** The `DirectPromptConstructor` facilitates the generation of concise, direct prompts where the LLM is expected to provide a straightforward action or response without explicit intermediate reasoning steps.
-   **LLM Provider Agnosticism (partial):** Both constructors abstract away some differences between LLM providers (e.g., OpenAI, Google) and their respective API input formats, particularly for chat-based vs. completion-based interactions and multimodal inputs.
-   **Observation and Prompt Length Management:** The module handles truncation of observations to fit within specified maximum observation lengths, ensuring prompts remain within model limits.
-   **URL Mapping:** It includes functionality to map internal URLs to real-world URLs, enriching the context provided to the LLM.

## Architecture and Component Relationships

The `prompt_types` module contains two main prompt constructor classes that inherit from a base `PromptConstructor` class (likely defined in the parent [prompt_constructors](prompt_constructors.md) module). These classes are responsible for taking agent state information and an intent, then transforming them into an `APIInput` structure suitable for consumption by various LLMs.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "multimodal_cot_prompt_constructor", "label": "MultimodalCoTPromptConstructor", "type": "component", "link": null},
        {"id": "direct_prompt_constructor", "label": "DirectPromptConstructor", "type": "component", "link": null},
        {"id": "prompt_constructor_base", "label": "PromptConstructor (Base)", "type": "external", "link": "prompt_constructors.md"},
        {"id": "lm_config", "label": "LMConfig (from lm_config)", "type": "external", "link": null},
        {"id": "tokenizer", "label": "Tokenizer", "type": "external", "link": null},
        {"id": "pil_image", "label": "PIL.Image", "type": "external", "link": null},
        {"id": "llm_api_integration_module", "label": "LLM API Integration", "type": "external", "link": "llm_api_integration.md"}
    ],
    "edges": [
        {"source": "multimodal_cot_prompt_constructor", "target": "prompt_constructor_base"},
        {"source": "direct_prompt_constructor", "target": "prompt_constructor_base"},
        {"source": "multimodal_cot_prompt_constructor", "target": "lm_config"},
        {"source": "multimodal_cot_prompt_constructor", "target": "tokenizer"},
        {"source": "multimodal_cot_prompt_constructor", "target": "pil_image"},
        {"source": "multimodal_cot_prompt_constructor", "target": "llm_api_integration_module"},
        {"source": "direct_prompt_constructor", "target": "lm_config"},
        {"source": "direct_prompt_constructor", "target": "tokenizer"},
        {"source": "direct_prompt_constructor", "target": "llm_api_integration_module"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    multimodal_cot_prompt_constructor[MultimodalCoTPromptConstructor]
    direct_prompt_constructor[DirectPromptConstructor]
    prompt_constructor_base[PromptConstructor (Base)]
    lm_config[LMConfig (from lm_config)]
    tokenizer[Tokenizer]
    pil_image[PIL.Image]
    llm_api_integration_module[LLM API Integration]

    multimodal_cot_prompt_constructor --> prompt_constructor_base
    direct_prompt_constructor --> prompt_constructor_base

    multimodal_cot_prompt_constructor --> lm_config
    multimodal_cot_prompt_constructor --> tokenizer
    multimodal_cot_prompt_constructor --> pil_image
    multimodal_cot_prompt_constructor --> llm_api_integration_module

    direct_prompt_constructor --> lm_config
    direct_prompt_constructor --> tokenizer
    direct_prompt_constructor --> llm_api_integration_module

    click prompt_constructor_base "prompt_constructors.md"
    click llm_api_integration_module "llm_api_integration.md"
```

### Component Descriptions

#### `MultimodalCoTPromptConstructor`

-   **Description:** This class extends `CoTPromptConstructor` (which itself extends `PromptConstructor`) and is designed for constructing prompts that enable Chain-of-Thought (CoT) reasoning, specifically for multimodal LLMs. It integrates textual observations with visual inputs like page screenshots and other relevant images.
-   **Key Methods:**
    -   `__init__(self, instruction_path, lm_config, tokenizer)`: Initializes the constructor with paths to instructions, LLM configuration, and a tokenizer. It also extracts the `answer_phrase` from the instruction metadata.
    -   `construct(self, trajectory, intent, page_screenshot_img, images, meta_data)`: The core method for building the prompt. It formats the objective, URL, observation, and previous action into a template. It handles observation truncation based on `lm_config` and then passes the data to `get_lm_api_input`.
    -   `get_lm_api_input(self, intro, examples, current, page_screenshot_img, images)`: Formats the prompt into the specific `APIInput` structure required by different LLM providers (OpenAI, Google) and modes (chat, completion). It encodes images into base64 or other formats as needed by the respective APIs.
-   **Dependencies:** Relies on `lm_config` for LLM-specific configurations, a `Tokenizer` for managing token limits, and `PIL.Image` for handling image data. It prepares inputs for the underlying [LLM API Integration](llm_api_integration.md).

#### `DirectPromptConstructor`

-   **Description:** This class extends `PromptConstructor` and is used for creating direct prompts where the LLM is expected to provide an immediate action or response without intermediate reasoning steps. It primarily focuses on textual inputs.
-   **Key Methods:**
    -   `__init__(self, instruction_path, lm_config, tokenizer)`: Initializes the constructor with instruction paths, LLM configuration, and a tokenizer.
    -   `construct(self, trajectory, intent, meta_data)`: Builds the direct prompt by formatting the objective, URL, observation, and previous action into a predefined template. It also handles observation truncation based on `lm_config`.
    -   `_extract_action(self, response)`: A utility method to parse and extract the agent's action from the raw LLM response using a defined `action_splitter` pattern.
-   **Dependencies:** Similar to `MultimodalCoTPromptConstructor`, it depends on `lm_config` and a `Tokenizer`. It generates inputs that are ultimately processed by the [LLM API Integration](llm_api_integration.md).

## How the Module Fits into the Overall System

The `prompt_types` module is a fundamental part of the agent's `prompt_construction` subsystem. It acts as an interface between the agent's current state (represented by `trajectory`, `intent`, and observations) and the Large Language Models responsible for generating actions or responses.

When an agent needs to decide on its next action, it leverages one of the constructors from this module to transform its current understanding of the environment and its goal into a format that the chosen LLM can process. For visual tasks or complex reasoning, the `MultimodalCoTPromptConstructor` would be employed. For simpler, direct responses, the `DirectPromptConstructor` would be used.

This module ensures that prompts are correctly structured, include all necessary context (textual and visual), adhere to LLM-specific requirements, and respect prompt length constraints, thereby enabling effective communication with the underlying LLMs for task execution. The `APIInput` generated by these constructors is then passed to components within the [LLM API Integration](llm_api_integration.md) module for actual LLM inference.