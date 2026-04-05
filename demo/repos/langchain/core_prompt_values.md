# core_prompt_values Module Documentation

## Introduction

The `core_prompt_values` module defines concrete representations for prompt values, specifically focusing on chat-based interactions. It provides a structured way to encapsulate a sequence of messages as a single, explicit chat prompt value, which is crucial for serialization, validation, and consistent handling across different language models and prompt processing components within the system.

## Architecture and Component Relationships

The `core_prompt_values` module currently features `ChatPromptValueConcrete`, a key component for representing chat prompts. This class builds upon a foundational `ChatPromptValue` (likely defined in `core_prompts` or a related base module) and explicitly defines the structure of a chat prompt as a sequence of messages.

### Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "chat_prompt_value_concrete", "label": "ChatPromptValueConcrete", "type": "component", "link": null},
        {"id": "core_prompts", "label": "core_prompts Module", "type": "external", "link": "core_prompts.md"},
        {"id": "core_messages", "label": "core_messages Module", "type": "external", "link": "core_messages.md"}
    ],
    "edges": [
        {"source": "chat_prompt_value_concrete", "target": "core_prompts", "label": "inherits from ChatPromptValue (assumed)"},
        {"source": "chat_prompt_value_concrete", "target": "core_messages", "label": "uses AnyMessage"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    chat_prompt_value_concrete[ChatPromptValueConcrete]
    core_prompts[core_prompts Module]
    core_messages[core_messages Module]

    chat_prompt_value_concrete -->|inherits from ChatPromptValue (assumed)| core_prompts
    chat_prompt_value_concrete -->|uses AnyMessage| core_messages
```

## Core Components

### `ChatPromptValueConcrete`

`ChatPromptValueConcrete` is a concrete implementation of `ChatPromptValue` designed for explicit declaration of chat prompt messages. It enforces a clear structure, making it suitable for scenarios requiring strict type checking and serialization, especially when interacting with external schemas or APIs.

**Purpose:** To provide a well-defined and explicit structure for chat prompts, facilitating robust handling and interoperability.

**Key Attributes:**

*   `messages`: A sequence of `AnyMessage` objects, representing the individual messages within the chat prompt. This attribute directly links to the functionality provided by the `core_messages` module.
*   `type`: A literal string `"ChatPromptValueConcrete"` used for explicit type identification, particularly useful in serialization and deserialization processes.

```python
class ChatPromptValueConcrete(ChatPromptValue):
    """Chat prompt value which explicitly lists out the message types it accepts.

    For use in external schemas.
    """

    messages: Sequence[AnyMessage]
    """Sequence of messages."""

    type: Literal["ChatPromptValueConcrete"] = "ChatPromptValueConcrete"
```

## Integration with Overall System

The `core_prompt_values` module, through `ChatPromptValueConcrete`, serves as a fundamental building block for constructing and managing chat-based prompts. It integrates with:

*   **`core_prompts`**: It extends foundational prompt classes defined in `core_prompts`, providing concrete implementations for chat scenarios. Other prompt templates or builders within `core_prompts` would leverage this concrete type when generating chat prompts.
*   **`core_messages`**: It relies heavily on the message types defined in the `core_messages` module (e.g., `AnyMessage`) to compose the sequence of messages in a chat prompt. This ensures consistency in message representation across the system.
*   **`core_language_models`**: Language model interfaces in `core_language_models` would consume `ChatPromptValueConcrete` instances as input when processing chat-based queries, translating them into the model-specific input format.
*   **`core_chat_history`**: Modules responsible for managing chat history might store and retrieve chat prompts as `ChatPromptValueConcrete` objects, ensuring a consistent historical record of interactions.

This module ensures that chat prompts are uniformly represented, enabling seamless integration and robust handling throughout the entire system, from prompt creation to language model interaction and history management.
