# token_utils

The `token_utils` module provides essential utilities for managing and truncating message sequences based on token limits. It offers functions to approximate token counts and to retrieve a subset of messages that fit within a specified token budget, prioritizing the most recent messages. This module is critical for optimizing performance and managing resource consumption in conversational AI applications by ensuring messages adhere to length constraints.

## Core Functionality

### `_approximate_token_counter`
This utility serves as a wrapper around the `count_tokens_approximately` function, providing a consistent interface to estimate the token count for a given sequence of `BaseMessage` objects. It abstracts the underlying tokenization logic, making it easier to integrate token counting into various parts of the system without needing to know the specific implementation details.

### `_last_max_tokens`
This function intelligently truncates a list of messages from the beginning to ensure that the total token count does not exceed a specified `max_tokens` limit. It prioritizes the retention of the latest messages, which is crucial for maintaining conversational context. Key features include:
-   **Prioritization of Recent Messages**: It processes messages in reverse order to keep the most recent interactions.
-   **System Message Handling**: Optionally preserves the initial system message, ensuring core instructions or context are not lost.
-   **Partial Message Inclusion**: Allows for partial inclusion of the oldest message if `allow_partial` is set, making the most efficient use of the token budget.
-   **Flexible Boundary Conditions**: Supports `start_on` and `end_on` parameters to define specific message types or roles where truncation should begin or end, providing granular control over the message sequence.
-   **Configurable Token Counting and Text Splitting**: Accepts `token_counter` and `text_splitter` callables, enabling adaptability to different tokenization strategies and text processing requirements.

## Architecture and Component Relationships

The `token_utils` module is a leaf module within the `core_messages.message_utils.token_management.token_counting_and_truncation` hierarchy. It plays a crucial role in managing message length, especially in scenarios where context windows or API limits are a concern.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "approximate_token_counter", "label": "_approximate_token_counter", "type": "component", "link": null},
        {"id": "last_max_tokens", "label": "_last_max_tokens", "type": "component", "link": null},
        {"id": "first_max_tokens", "label": "_first_max_tokens (internal utility)", "type": "component", "link": null},
        {"id": "token_counting_and_truncation", "label": "token_counting_and_truncation", "type": "external", "link": "token_counting_and_truncation.md"}
    ],
    "edges": [
        {"source": "last_max_tokens", "target": "approximate_token_counter"},
        {"source": "last_max_tokens", "target": "first_max_tokens"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    approximate_token_counter[_approximate_token_counter]
    last_max_tokens[_last_max_tokens]
    first_max_tokens[_first_max_tokens (internal utility)]
    last_max_tokens --> approximate_token_counter
    last_max_tokens --> first_max_tokens
```

## How the module fits into the overall system

The `token_utils` module is a fundamental part of the message handling and processing pipeline within the `core_messages` ecosystem. By providing robust mechanisms for token counting and message truncation, it ensures that conversational agents and language models operate efficiently within their defined token limits. This is particularly vital for managing conversation history, preventing excessive API costs, and maintaining coherent context for long interactions. It acts as a low-level utility, supporting higher-level components in [token_management.md](token_management.md) and [message_utils.md](message_utils.md) that require precise control over message lengths.

The `_last_max_tokens` function, in particular, is crucial for "sliding window" chat history mechanisms, where older messages are removed to make space for new ones while preserving the most recent context. Its dependency on a generic `token_counter` and `text_splitter` makes it flexible and adaptable to different tokenization strategies and message formats, making it a versatile tool for managing conversational input.
