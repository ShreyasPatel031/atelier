# Embedding Services
This module handles the efficient computation and retrieval of embeddings, featuring cached embedding operations and a specialized retriever that provides passages with similarity scores.
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "embedding_services",
            "label": "Embedding Services",
            "type": "module"
        },
        {
            "id": "embedding_caching",
            "label": "Embedding Caching",
            "type": "module",
            "link": "embedding_caching.md"
        },
        {
            "id": "scored_retrieval",
            "label": "Scored Retrieval",
            "type": "module",
            "link": "scored_retrieval.md"
        },
        {
            "id": "lm_clients_module",
            "label": "LM Clients",
            "type": "external",
            "link": "lm_clients.md"
        },
        {
            "id": "retrievers_module",
            "label": "Retrievers",
            "type": "external",
            "link": "retrievers.md"
        }
    ],
    "edges": [
        {
            "source": "lm_clients_module",
            "target": "embedding_caching",
            "label": "computes raw embeddings"
        },
        {
            "source": "embedding_caching",
            "target": "scored_retrieval",
            "label": "provides cached embeddings"
        },
        {
            "source": "scored_retrieval",
            "target": "retrievers_module",
            "label": "integrates into retrieval system"
        }
    ],
    "groups": [
        {
            "id": "embedding_processing",
            "label": "Embedding Processing",
            "role": "analytical",
            "nodes": [
                "embedding_caching",
                "scored_retrieval"
            ]
        },
        {
            "id": "related_modules",
            "label": "Related Modules",
            "role": "surface",
            "nodes": [
                "lm_clients_module",
                "retrievers_module"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph embedding_processing["Embedding Processing"]
        embedding_caching["Embedding Caching"]
        scored_retrieval["Scored Retrieval"]
    end

    subgraph related_modules["Related Modules"]
        lm_clients_module["LM Clients"]
        retrievers_module["Retrievers"]
    end

    lm_clients_module -->|
    computes raw embeddings
    | embedding_caching
    embedding_caching -->|
    provides cached embeddings
    | scored_retrieval
    scored_retrieval -->|
    integrates into retrieval system
    | retrievers_module

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f

    class embedding_caching,scored_retrieval analytical
    class lm_clients_module,retrievers_module surface

    click embedding_caching "embedding_caching.md"
    click scored_retrieval "scored_retrieval.md"
    click lm_clients_module "lm_clients.md"
    click retrievers_module "retrievers.md"
```