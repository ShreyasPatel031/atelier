# message_filtering Module

## Introduction

The `message_filtering` module provides a crucial utility for managing and processing conversational message flows. Its primary function, `filter_messages`, enables developers to selectively include or exclude messages from a sequence based on various criteria, such as message names, types, IDs, and even specific tool calls within AI messages. This capability is essential for building robust and adaptable language model applications that require fine-grained control over message handling.

## Comprehensive Documentation

### `filter_messages` Function

The `filter_messages` function allows for the flexible filtering of message sequences, enabling developers to customize which messages are considered relevant for subsequent processing steps. This is particularly useful in scenarios where only certain types of interactions, specific user inputs, or AI responses with particular characteristics need to be analyzed or passed along in a conversational chain.

#### Parameters:

*   **`messages`** (`Iterable[MessageLikeRepresentation] | PromptValue`): A sequence of message-like objects or a `PromptValue` to be filtered. This can include various forms of chat messages and prompt representations.
*   **`include_names`** (`Sequence[str] | None`): An optional sequence of message names. If provided, only messages with names present in this sequence will be considered for inclusion.
*   **`exclude_names`** (`Sequence[str] | None`): An optional sequence of message names. If provided, messages with names present in this sequence will be excluded.
*   **`include_types`** (`Sequence[str | type[BaseMessage]] | None`): An optional sequence of message types to include. Types can be specified as string names (e.g., `'system'`, `'human'`, `'ai'`) or as `BaseMessage` classes (e.g., `SystemMessage`, `HumanMessage`, `AIMessage`).
*   **`exclude_types`** (`Sequence[str | type[BaseMessage]] | None`): An optional sequence of message types to exclude. Similar to `include_types`, these can be string names or `BaseMessage` classes.
*   **`include_ids`** (`Sequence[str] | None`): An optional sequence of message IDs to include. Only messages with IDs present in this sequence will be considered.
*   **`exclude_ids`** (`Sequence[str] | None`): An optional sequence of message IDs to exclude. Messages with IDs present in this sequence will be excluded.
*   **`exclude_tool_calls`** (`Sequence[str] | bool | None`): Specifies how to handle messages containing tool calls:
    *   `True`: Excludes all `AIMessage` objects that contain tool calls and all `ToolMessage` objects.
    *   `Sequence[str]`: A sequence of specific tool call IDs to exclude. `ToolMessage` objects with a matching `tool_call_id` will be excluded. For `AIMessage` objects, only the specified tool calls will be removed; if all tool calls are filtered out, the entire `AIMessage` is excluded.

#### Returns:

*   **`list[BaseMessage]`**: A new list containing `BaseMessage` objects that satisfy the inclusion criteria and none of the exclusion criteria. If no inclusion criteria are specified, messages are included by default unless explicitly excluded.

#### Raises:

*   **`ValueError`**: If incompatible arguments are provided (e.g., specifying conflicting inclusion and exclusion criteria that cannot be resolved).

#### Example Usage:

```python
from langchain_core.messages import (
    filter_messages,
    AIMessage,
    HumanMessage,
    SystemMessage,
)

messages = [
    SystemMessage("you're a good assistant."),
    HumanMessage("what's your name", id="foo", name="example_user"),
    AIMessage("steve-o", id="bar", name="example_assistant"),
    HumanMessage(
        "what's your favorite color",
        id="baz",
    ),
    AIMessage(
        "silicon blue",
        id="blah",
    ),
]

filtered_messages = filter_messages(
    messages,
    include_names=("example_user", "example_assistant"),
    include_types=("system",),
    exclude_ids=("bar",),
)

# Expected output:
# [
#     SystemMessage("you're a good assistant."),
#     HumanMessage("what's your name", id="foo", name="example_user"),
# ]
```

## Architecture and Component Relationships

The `message_filtering` module is a specialized utility within the broader [core_messages module](core_messages.md) ecosystem, specifically residing under `message_utils` and `message_manipulation`. It leverages core message types defined in [core_messages.md](core_messages.md) and potentially `PromptValue` objects from the [core_prompt_values module](core_prompt_values.md).

Its primary component, `filter_messages`, relies on internal helper functions (such as `_is_message_type` and `convert_to_messages`, which are part of the `message_utils` module) to efficiently process and categorize messages. This modular design ensures that message filtering logic is encapsulated and reusable across various parts of the system that interact with conversational data.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "filter_messages", "label": "filter_messages()", "type": "component", "link": null},
        {"id": "message_manipulation", "label": "message_manipulation Module", "type": "external", "link": "message_manipulation.md"},
        {"id": "message_utils", "label": "message_utils Module", "type": "external", "link": "message_utils.md"},
        {"id": "core_messages", "label": "core_messages Module", "type": "external", "link": "core_messages.md"},
        {"id": "core_prompt_values", "label": "core_prompt_values Module", "type": "external", "link": "core_prompt_values.md"}
    ],
    "edges": [
        {"source": "message_manipulation", "target": "filter_messages"},
        {"source": "filter_messages", "target": "core_messages"},
        {"source": "filter_messages", "target": "core_prompt_values"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    message_manipulation[message_manipulation Module] --> filter_messages(filter_messages())
    filter_messages --> core_messages[core_messages Module]
    filter_messages --> core_prompt_values[core_prompt_values Module]
    click message_manipulation "message_manipulation.md"
    click core_messages "core_messages.md"
    click core_prompt_values "core_prompt_values.md"
```
