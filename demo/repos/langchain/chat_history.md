# Chat History Module
This module provides `InMemoryChatMessageHistory`, a concrete implementation for storing and managing chat messages in memory, supporting synchronous and asynchronous operations for adding, retrieving, and clearing message history.
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "in_memory_history", "label": "In-Memory Chat History", "type": "component", "link": null},
        {"id": "message_types", "label": "BaseMessage (Type)", "type": "external", "link": "messages_and_history.md"},
        {"id": "history_interface", "label": "Base Chat Message History (Interface)", "type": "external", "link": "messages_and_history.md"}
    ],
    "edges": [
        {"source": "in_memory_history", "target": "message_types", "label": "manages"},
        {"source": "in_memory_history", "target": "history_interface", "label": "implements"}
    ],
    "groups": [
        {"id": "chat_history_management", "label": "Chat History Management", "role": "data", "nodes": ["in_memory_history"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph chat_history_management["Chat History Management"]
        in_memory_history["In-Memory Chat History"]
    end

    message_types["BaseMessage (Type)"]
    history_interface["Base Chat Message History (Interface)"]

    in_memory_history -->|"manages"| message_types
    in_memory_history -->|"implements"| history_interface

    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    class in_memory_history data
```