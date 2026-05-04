# Message and History Management
Manages chat messages and conversation history, providing tools to translate content blocks from diverse AI providers. It standardizes message components and includes utilities for message processing, filtering, and token counting.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "external_models",
            "label": "External Language Models",
            "type": "external"
        },
        {
            "id": "content_blocks",
            "label": "Content Block Processing",
            "type": "module",
            "link": "content_blocks.md"
        },
        {
            "id": "chat_history",
            "label": "Chat History Management",
            "type": "module",
            "link": "chat_history.md"
        },
        {
            "id": "message_utilities",
            "label": "Message Utility Functions",
            "type": "module",
            "link": "message_utilities.md"
        }
    ],
    "edges": [
        {
            "source": "external_models",
            "target": "content_blocks",
            "label": "raw messages"
        },
        {
            "source": "content_blocks",
            "target": "chat_history",
            "label": "stores messages"
        },
        {
            "source": "content_blocks",
            "target": "message_utilities",
            "label": "processes content blocks"
        },
        {
            "source": "chat_history",
            "target": "message_utilities",
            "label": "retrieves messages"
        }
    ],
    "groups": [
        {
            "id": "external",
            "label": "External Dependencies",
            "role": "generative",
            "nodes": [
                "external_models"
            ]
        },
        {
            "id": "message_components",
            "label": "Message Components",
            "role": "analytical",
            "nodes": [
                "content_blocks",
                "message_utilities"
            ]
        },
        {
            "id": "data_storage",
            "label": "Data Storage",
            "role": "data",
            "nodes": [
                "chat_history"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph external["External Dependencies"]
        external_models["External Language Models"]
    end
    subgraph message_components["Message Components"]
        content_blocks["Content Block Processing"]
        message_utilities["Message Utility Functions"]
    end
    subgraph data_storage["Data Storage"]
        chat_history["Chat History Management"]
    end

    external_models -->|'''raw messages'''| content_blocks
    content_blocks -->|'''stores messages'''| chat_history
    content_blocks -->|'''processes content blocks'''| message_utilities
    chat_history -->|'''retrieves messages'''| message_utilities

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class external_models generative
    class content_blocks,message_utilities analytical
    class chat_history data

    click content_blocks "content_blocks.md"
    click chat_history "chat_history.md"
    click message_utilities "message_utilities.md"
```