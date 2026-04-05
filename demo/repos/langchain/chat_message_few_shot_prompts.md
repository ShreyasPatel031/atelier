# chat_message_few_shot_prompts Module Documentation

## Introduction

The `chat_message_few_shot_prompts` module provides the `FewShotChatMessagePromptTemplate` class, a specialized prompt template designed to incorporate few-shot examples into chat-based language model interactions. This module is crucial for enhancing the conversational capabilities of models by providing in-context learning through examples, either static or dynamically selected.

## Purpose and Core Functionality

The primary purpose of `FewShotChatMessagePromptTemplate` is to construct a sequence of chat messages that include a series of example interactions. These examples guide the language model in understanding the desired response format, style, or specific task, thereby improving the quality and relevance of its outputs.

### FewShotChatMessagePromptTemplate

This class extends `BaseChatPromptTemplate` and `_FewShotPromptTemplateMixin`, making it suitable for building chat prompts with few-shot examples. It supports two main modes of operation:

1.  **Fixed Examples**: A predefined list of examples is provided and directly inserted into the prompt.
2.  **Dynamic Example Selection**: An `example_selector` (e.g., based on semantic similarity) is used to retrieve the most relevant examples for a given input, allowing for more adaptive and context-aware prompting.

**Key Parameters:**

*   `input_variables`: A list of variable names that will be passed to the `example_selector` for dynamic example retrieval.
*   `example_prompt`: A `BaseMessagePromptTemplate` or `BaseChatPromptTemplate` instance used to format each individual example into one or more chat messages (e.g., a human message followed by an AI response).
*   `examples`: (When using fixed examples) A list of dictionaries, where each dictionary represents an example and its keys correspond to the `input_variables` of the `example_prompt`.
*   `example_selector`: (When using dynamic examples) An object conforming to the `BaseExampleSelector` interface, responsible for selecting relevant examples based on the current input.

**Core Methods:**

*   `format_messages(**kwargs: Any) -> list[BaseMessage]`: Formats the given keyword arguments into a list of chat messages, incorporating the few-shot examples.
*   `aformat_messages(**kwargs: Any) -> Awaitable[list[BaseMessage]]`: Asynchronous version of `format_messages`.
*   `format(**kwargs: Any) -> str`: Formats the prompt into a single string representation, useful for debugging or models that accept string inputs.
*   `aformat(**kwargs: Any) -> Awaitable[str]`: Asynchronous version of `format`.

## Architecture and Component Relationships

The `FewShotChatMessagePromptTemplate` acts as an orchestrator for combining a system message, dynamically selected or fixed examples, and the current user input into a cohesive chat prompt. Its primary dependencies are on mechanisms for formatting individual examples (`example_prompt`) and, optionally, for selecting examples (`example_selector`).

```mermaid
graph TD
    few_shot_chat_message_prompt_template[FewShotChatMessagePromptTemplate]
    example_selector[Example Selector (core_example_selectors.md)]
    example_prompt[BaseMessagePromptTemplate / BaseChatPromptTemplate (core_prompts.md)]
    base_message[BaseMessage (core_messages.md)]
    message_utils[Message Utils (core_messages.md)]

    few_shot_chat_message_prompt_template -- "uses" --> example_selector
    few_shot_chat_message_prompt_template -- "formats examples via" --> example_prompt
    example_prompt -- "generates" --> base_message
    few_shot_chat_message_prompt_template -- "outputs list of" --> base_message
    few_shot_chat_message_prompt_template -- "uses for string output" --> message_utils

    subgraph Parent Prompt Templates
        chat_prompt_template[ChatPromptTemplate (core_prompts.md)]
    end

    chat_prompt_template -- "can contain" --> few_shot_chat_message_prompt_template

    subgraph Example Selection Dependencies
        embedding_module[Embeddings (classic_embeddings.md)]
        vectorstore_module[Vectorstore (core_vectorstores.md)]

        example_selector -- "relies on" --> embedding_module
        example_selector -- "relies on" --> vectorstore_module
    end


```

## How the Module Fits into the Overall System

The `chat_message_few_shot_prompts` module is a vital component within the broader `core_prompts` ecosystem. It enables sophisticated prompt engineering for chat models by facilitating the inclusion of few-shot examples, a technique proven to significantly improve model performance on various tasks.

It typically works in conjunction with:

*   **[core_prompts.md](core_prompts.md)**: `ChatPromptTemplate` is often used to wrap `FewShotChatMessagePromptTemplate` along with system and human messages to form a complete prompt.
*   **[core_example_selectors.md](core_example_selectors.md)**: When dynamic example selection is required, modules from `core_example_selectors` (e.g., `SemanticSimilarityExampleSelector`) are integrated to select the most relevant examples.
*   **[core_messages.md](core_messages.md)**: The module fundamentally operates with `BaseMessage` objects, representing the building blocks of chat conversations. It also leverages `message_utils` for converting messages to string formats.
*   **[core_vectorstores.md](core_vectorstores.md)** and **[classic_embeddings.md](classic_embeddings.md)**: These modules are implicitly used when `SemanticSimilarityExampleSelector` is employed for dynamic example selection, as it relies on vector databases and embedding models.
*   **[partners_anthropic_chat_models.md](partners_anthropic_chat_models.md)** (or other chat model integrations): The final constructed prompt messages are typically passed to a chat model for inference.

This module plays a key role in creating robust and intelligent conversational AI systems by allowing developers to control and optimize how examples are presented to large language models, leading to more accurate and contextually appropriate responses.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "few_shot_chat_message_prompt_template", "label": "FewShotChatMessagePromptTemplate", "type": "component", "link": null},
        {"id": "example_selector", "label": "Example Selector", "type": "external", "link": "core_example_selectors.md"},
        {"id": "example_prompt", "label": "BaseMessagePromptTemplate / BaseChatPromptTemplate", "type": "external", "link": "core_prompts.md"},
        {"id": "base_message", "label": "BaseMessage", "type": "external", "link": "core_messages.md"},
        {"id": "message_utils", "label": "Message Utils", "type": "external", "link": "core_messages.md"},
        {"id": "chat_prompt_template", "label": "ChatPromptTemplate", "type": "external", "link": "core_prompts.md"},
        {"id": "embedding_module", "label": "Embeddings", "type": "external", "link": "classic_embeddings.md"},
        {"id": "vectorstore_module", "label": "Vectorstore", "type": "external", "link": "core_vectorstores.md"},
        {"id": "chat_model", "label": "Chat Model", "type": "external", "link": "partners_anthropic_chat_models.md"}
    ],
    "edges": [
        {"source": "few_shot_chat_message_prompt_template", "target": "example_selector"},
        {"source": "few_shot_chat_message_prompt_template", "target": "example_prompt"},
        {"source": "example_prompt", "target": "base_message"},
        {"source": "few_shot_chat_message_prompt_template", "target": "base_message"},
        {"source": "few_shot_chat_message_prompt_template", "target": "message_utils"},
        {"source": "chat_prompt_template", "target": "few_shot_chat_message_prompt_template"},
        {"source": "example_selector", "target": "embedding_module"},
        {"source": "example_selector", "target": "vectorstore_module"},
        {"source": "chat_prompt_template", "target": "chat_model"}
    ],
    "groups": [
        {"id": "parent_prompt_templates", "label": "Parent Prompt Templates", "nodes": ["chat_prompt_template"]},
        {"id": "example_selection_dependencies", "label": "Example Selection Dependencies", "nodes": ["embedding_module", "vectorstore_module"]}
    ]
}
-->

```mermaid
graph TD
    few_shot_chat_message_prompt_template[FewShotChatMessagePromptTemplate]
    example_selector[Example Selector (core_example_selectors.md)]
    example_prompt[BaseMessagePromptTemplate / BaseChatPromptTemplate (core_prompts.md)]
    base_message[BaseMessage (core_messages.md)]
    message_utils[Message Utils (core_messages.md)]

    few_shot_chat_message_prompt_template -- "uses" --> example_selector
    few_shot_chat_message_prompt_template -- "formats examples via" --> example_prompt
    example_prompt -- "generates" --> base_message
    few_shot_chat_message_prompt_template -- "outputs list of" --> base_message
    few_shot_chat_message_prompt_template -- "uses for string output" --> message_utils

    subgraph Parent Prompt Templates
        chat_prompt_template[ChatPromptTemplate (core_prompts.md)]
    end

    chat_prompt_template -- "can contain" --> few_shot_chat_message_prompt_template

    subgraph Example Selection Dependencies
        embedding_module[Embeddings (classic_embeddings.md)]
        vectorstore_module[Vectorstore (core_vectorstores.md)]

        example_selector -- "relies on" --> embedding_module
        example_selector -- "relies on" --> vectorstore_module
    end


```