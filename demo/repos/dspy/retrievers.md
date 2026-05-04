# Retrievers Module
This module provides various retrieval mechanisms, including a core retrieval interface, specialized integrations with ColBERTv2, Databricks Vector Search, and Weaviate, enabling efficient document fetching for language models.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "retrievers",
            "label": "Retrievers",
            "type": "module"
        },
        {
            "id": "core_retrieval_mechanics",
            "label": "Core Retrieval Logic",
            "type": "module",
            "link": "core_retrieval_mechanics.md"
        },
        {
            "id": "colbertv2_integration",
            "label": "ColBERTv2 Retrieval",
            "type": "module",
            "link": "colbertv2_integration.md"
        },
        {
            "id": "databricks_vector_search",
            "label": "Databricks Retriever",
            "type": "module",
            "link": "databricks_vector_search.md"
        },
        {
            "id": "weaviate_vector_search",
            "label": "Weaviate Retriever",
            "type": "module",
            "link": "weaviate_vector_search.md"
        },
        {
            "id": "lm_clients",
            "label": "LM Clients",
            "type": "external",
            "link": "lm_clients.md"
        },
        {
            "id": "embedding_services",
            "label": "Embedding Services",
            "type": "external",
            "link": "embedding_services.md"
        }
    ],
    "edges": [
        {
            "source": "lm_clients",
            "target": "core_retrieval_mechanics",
            "label": "submits query"
        },
        {
            "source": "core_retrieval_mechanics",
            "target": "colbertv2_integration",
            "label": "dispatches query to RM"
        },
        {
            "source": "core_retrieval_mechanics",
            "target": "databricks_vector_search",
            "label": "dispatches query to RM"
        },
        {
            "source": "core_retrieval_mechanics",
            "target": "weaviate_vector_search",
            "label": "dispatches query to RM"
        },
        {
            "source": "colbertv2_integration",
            "target": "embedding_services",
            "label": "generates/uses vector"
        },
        {
            "source": "databricks_vector_search",
            "target": "embedding_services",
            "label": "generates/uses vector"
        },
        {
            "source": "weaviate_vector_search",
            "target": "embedding_services",
            "label": "generates/uses vector"
        }
    ],
    "groups": [
        {
            "id": "retrieval_base",
            "label": "Retrieval Base",
            "role": "analytical",
            "nodes": [
                "core_retrieval_mechanics"
            ]
        },
        {
            "id": "retriever_integrations",
            "label": "Retriever Integrations",
            "role": "generative",
            "nodes": [
                "colbertv2_integration",
                "databricks_vector_search",
                "weaviate_vector_search"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    lm_clients["LM Clients"]
    embedding_services["Embedding Services"]

    subgraph retrieval_base["Retrieval Base"]
        core_retrieval_mechanics["Core Retrieval Logic"]
    end

    subgraph retriever_integrations["Retriever Integrations"]
        colbertv2_integration["ColBERTv2 Retrieval"]
        databricks_vector_search["Databricks Retriever"]
        weaviate_vector_search["Weaviate Retriever"]
    end

    lm_clients -->|"submits query"| core_retrieval_mechanics
    core_retrieval_mechanics -->|"dispatches query to RM"| colbertv2_integration
    core_retrieval_mechanics -->|"dispatches query to RM"| databricks_vector_search
    core_retrieval_mechanics -->|"dispatches query to RM"| weaviate_vector_search
    colbertv2_integration -->|"generates/uses vector"| embedding_services
    databricks_vector_search -->|"generates/uses vector"| embedding_services
    weaviate_vector_search -->|"generates/uses vector"| embedding_services

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class core_retrieval_mechanics analytical
    class colbertv2_integration,databricks_vector_search,weaviate_vector_search generative

    click core_retrieval_mechanics "core_retrieval_mechanics.md"
    click colbertv2_integration "colbertv2_integration.md"
    click databricks_vector_search "databricks_vector_search.md"
    click weaviate_vector_search "weaviate_vector_search.md"
    click lm_clients "lm_clients.md"
    click embedding_services "embedding_services.md"
```
