# Vector Stores
This module provides the foundational interfaces and an in-memory implementation for vector databases, enabling efficient storage, retrieval, and similarity search of document embeddings. It supports various search types and integration with embedding functions.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "vector_stores",
            "label": "Vector Stores",
            "type": "module"
        },
        {
            "id": "vector_store_interface",
            "label": "Vector Store Interface",
            "type": "module",
            "link": "vector_store_interface.md"
        },
        {
            "id": "in_memory_store",
            "label": "In-Memory Vector Store",
            "type": "module",
            "link": "in_memory_store.md"
        },
        {
            "id": "models_and_embeddings",
            "label": "Models and Embeddings",
            "type": "external",
            "link": "models_and_embeddings.md"
        },
        {
            "id": "document_management",
            "label": "Document Management",
            "type": "external",
            "link": "document_management.md"
        },
        {
            "id": "retrieval_systems",
            "label": "Retrieval Systems",
            "type": "external",
            "link": "retrieval_systems.md"
        }
    ],
    "edges": [
        {
            "source": "in_memory_store",
            "target": "vector_store_interface",
            "label": "implements"
        },
        {
            "source": "vector_store_interface",
            "target": "models_and_embeddings",
            "label": "uses embeddings"
        },
        {
            "source": "in_memory_store",
            "target": "models_and_embeddings",
            "label": "uses embeddings"
        },
        {
            "source": "document_management",
            "target": "vector_store_interface",
            "label": "provides documents"
        },
        {
            "source": "vector_store_interface",
            "target": "retrieval_systems",
            "label": "converts to retriever"
        }
    ],
    "groups": [
        {
            "id": "core_abstractions",
            "label": "Core Abstractions",
            "role": "analytical",
            "nodes": [
                "vector_store_interface"
            ]
        },
        {
            "id": "implementations",
            "label": "Implementations",
            "role": "generative",
            "nodes": [
                "in_memory_store"
            ]
        },
        {
            "id": "external_modules",
            "label": "External Modules",
            "role": "surface",
            "nodes": [
                "models_and_embeddings",
                "document_management",
                "retrieval_systems"
            ]
        }
    ]
}
-->
```

```mermaid
flowchart TD
    subgraph core_abstractions["Core Abstractions"]
        vector_store_interface["Vector Store Interface"]
    end

    subgraph implementations["Implementations"]
        in_memory_store["In-Memory Vector Store"]
    end

    subgraph external_modules["External Modules"]
        models_and_embeddings["Models and Embeddings"]
        document_management["Document Management"]
        retrieval_systems["Retrieval Systems"]
    end

    in_memory_store -->|
'''implements'''
| vector_store_interface
    vector_store_interface -->|
'''uses embeddings'''
| models_and_embeddings
    in_memory_store -->|
'''uses embeddings'''
| models_and_embeddings
    document_management -->|
'''provides documents'''
| vector_store_interface
    vector_store_interface -->|
'''converts to retriever'''
| retrieval_systems

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class vector_store_interface analytical
    class in_memory_store generative
    class models_and_embeddings analytical
    class document_management data
    class retrieval_systems analytical

    click vector_store_interface "vector_store_interface.md"
    click in_memory_store "in_memory_store.md"
    click models_and_embeddings "models_and_embeddings.md"
    click document_management "document_management.md"
    click retrieval_systems "retrieval_systems.md"
```