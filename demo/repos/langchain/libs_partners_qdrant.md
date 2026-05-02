# Qdrant Partner Integration
This module integrates with Qdrant, providing advanced and standard vector store implementations for efficient document indexing, similarity search, and maximal marginal relevance (MMR) search with support for dense, sparse, and hybrid embeddings.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "qdrant_vector_store_advanced", "label": "Advanced Qdrant Store", "type": "module", "link": "qdrant_vector_store_advanced.md"},
        {"id": "qdrant_vector_store_standard", "label": "Standard Qdrant Store", "type": "module", "link": "qdrant_vector_store_standard.md"},
        {"id": "qdrant_client", "label": "Qdrant Client", "type": "external"},
        {"id": "embedding_providers", "label": "Embedding Providers", "type": "external"}
    ],
    "edges": [
        {"source": "embedding_providers", "target": "qdrant_vector_store_advanced", "label": "generates embeddings"},
        {"source": "embedding_providers", "target": "qdrant_vector_store_standard", "label": "generates embeddings"},
        {"source": "qdrant_client", "target": "qdrant_vector_store_advanced", "label": "manages collections and points"},
        {"source": "qdrant_client", "target": "qdrant_vector_store_standard", "label": "manages collections and points"}
    ],
    "groups": [
        {"id": "qdrant_integrations", "label": "Qdrant Integrations", "role": "analytical", "nodes": ["qdrant_vector_store_advanced", "qdrant_vector_store_standard"]},
        {"id": "external_deps", "label": "External Dependencies", "role": "data", "nodes": ["qdrant_client", "embedding_providers"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph qdrant_integrations["Qdrant Integrations"]
        qdrant_vector_store_advanced["Advanced Qdrant Store"]
        qdrant_vector_store_standard["Standard Qdrant Store"]
    end

    subgraph external_deps["External Dependencies"]
        qdrant_client["Qdrant Client"]
        embedding_providers["Embedding Providers"]
    end

    embedding_providers -->|"generates embeddings"| qdrant_vector_store_advanced
    embedding_providers -->|"generates embeddings"| qdrant_vector_store_standard
    qdrant_client -->|"manages collections and points"| qdrant_vector_store_advanced
    qdrant_client -->|"manages collections and points"| qdrant_vector_store_standard

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class qdrant_vector_store_advanced,qdrant_vector_store_standard analytical
    class qdrant_client,embedding_providers data

    click qdrant_vector_store_advanced "qdrant_vector_store_advanced.md"
    click qdrant_vector_store_standard "qdrant_vector_store_standard.md"
```