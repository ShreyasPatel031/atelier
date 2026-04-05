# string_buffer_memory Module Documentation

## Introduction

`string_buffer_memory` module provides `ConversationStringBufferMemory`, a basic memory implementation designed to store the entire conversation history as a plain string. It is particularly suited for string-based conversations and serves as a simpler alternative to `ConversationBufferMemory` when chat model specific functionalities are not required.

## Architecture and Component Relationships

This module contains a single core component, `ConversationStringBufferMemory`, which manages the storage and retrieval of conversation history. It interacts with `BaseMemory` for its foundational memory capabilities and utilizes a utility function (`get_prompt_input_key`) to extract input keys from prompts.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "conversation_string_buffer_memory", "label": "ConversationStringBufferMemory", "type": "component", "link": null},
        {"id": "base_memory", "label": "BaseMemory", "type": "external", "link": "classic_base_memory.md"},
        {"id": "get_prompt_input_key", "label": "get_prompt_input_key (Utility)", "type": "external", "link": "core_prompts.md"}
    ],
    "edges": [
        {"source": "conversation_string_buffer_memory", "target": "base_memory"},
        {"source": "conversation_string_buffer_memory", "target": "get_prompt_input_key"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    conversation_string_buffer_memory[ConversationStringBufferMemory]
    base_memory[BaseMemory]
    get_prompt_input_key[get_prompt_input_key (Utility)]
    
    conversation_string_buffer_memory --> base_memory
    conversation_string_buffer_memory --> get_prompt_input_key
```

## Core Functionality

The `ConversationStringBufferMemory` class is responsible for:

*   **Storing Conversation History**: It appends new human and AI messages to an internal `buffer` string.
*   **Retrieving Conversation History**: It exposes the accumulated conversation history through the `memory_variables` property and `load_memory_variables` method.
*   **Context Management**: The `save_context` method extracts input and output keys and formats them into a string, which is then added to the buffer.
*   **Clearing Memory**: The `clear` method resets the conversation buffer.

### `ConversationStringBufferMemory` Class

```python
class ConversationStringBufferMemory(BaseMemory):
    human_prefix: str = "Human"
    ai_prefix: str = "AI"
    buffer: str = ""
    output_key: str | None = None
    input_key: str | None = None
    memory_key: str = "history"

    @pre_init
    def validate_chains(cls, values: dict) -> dict:
        # ... (validation logic)

    @property
    def memory_variables(self) -> list[str]:
        # ... (returns [self.memory_key])

    def load_memory_variables(self, inputs: dict[str, Any]) -> dict[str, str]:
        # ... (returns {self.memory_key: self.buffer})

    async def aload_memory_variables(self, inputs: dict[str, Any]) -> dict[str, str]:
        # ... (async version of load_memory_variables)

    def save_context(self, inputs: dict[str, Any], outputs: dict[str, str]) -> None:
        # ... (formats and appends new messages to buffer)

    async def asave_context(
        self, inputs: dict[str, Any], outputs: dict[str, str]
    ) -> None:
        # ... (async version of save_context)

    def clear(self) -> None:
        # ... (resets buffer)

    @override
    async def aclear(self) -> None:
        # ... (async version of clear)
```

**Key Attributes:**

*   `human_prefix` (str): Prefix used for human messages in the buffer (default: "Human").
*   `ai_prefix` (str): Prefix used for AI messages in the buffer (default: "AI").
*   `buffer` (str): The string that stores the complete conversation history.
*   `output_key` (str | None): Optional key to extract the AI's output from the `outputs` dictionary.
*   `input_key` (str | None): Optional key to extract the human's input from the `inputs` dictionary.
*   `memory_key` (str): The key under which the conversation history is stored in the memory variables (default: "history").

**Key Methods:**

*   `validate_chains`: A pre-initialization validator to ensure `return_messages` is `False`.
*   `memory_variables`: Property returning the list of memory variables (always `[self.memory_key]`).
*   `load_memory_variables`: Retrieves the current conversation `buffer`.
*   `save_context`: Appends the latest human input and AI output to the `buffer`.
*   `clear`: Clears the `buffer`, effectively resetting the conversation history.

## Integration with the Overall System

`ConversationStringBufferMemory` integrates into the broader LangChain system as a fundamental memory component, specifically designed for scenarios where conversation history needs to be maintained as a simple string. It can be used in chains or agents that require a compact, string-based representation of past interactions. Its simplicity makes it suitable for applications where complex message parsing or rich object representations of chat history are not necessary.

This module depends on the [classic_base_memory](classic_base_memory.md) module for its `BaseMemory` inheritance, providing the foundational interface for memory management. It also relies on a utility function, assumed to be from [core_prompts](core_prompts.md), to dynamically extract prompt input keys. 

