## Advanced Retrieval Strategies

This module offers advanced retrieval techniques like generating multiple queries, constructing self-queries for structured data, and retrieving parent documents from chunks to enhance search relevance.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "multi_query",
            "label": "Generate Multiple Queries",
            "type": "component",
            "link": null
        },
        {
            "id": "self_query",
            "label": "Construct Self-Query",
            "type": "component",
            "link": null
        },
        {
            "id": "multi_vector",
            "label": "Retrieve Parent Documents",
            "type": "component",
            "link": null
        },
        {
            "id": "base_retriever",
            "label": "Base Retriever",
            "type": "external",
            "link": "base_and_composite_retrievers.md"
        },
        {
            "id": "vector_store",
            "label": "Vector Store",
            "type": "external",
            "link": "vector_stores.md"
        },
        {
            "id": "language_model",
            "label": "Language Model",
            "type": "external",
            "link": "models_and_embeddings.md"
        },
        {
            "id": "document_store",
            "label": "Document Storage",
            "type": "external",
            "link": "caching_and_storage.md"
        },
        {
            "id": "retrieved_docs",
            "label": "Retrieved Documents",
            "type": "data",
            "link": null
        }
    ],
    "edges": [
        {
            "source": "multi_query",
            "target": "language_model",
            "label": "generates queries with"
        },
        {
            "source": "multi_query",
            "target": "base_retriever",
            "label": "uses underlying"
        },
        {
            "source": "self_query",
            "target": "language_model",
            "label": "constructs query with"
        },
        {
            "source": "self_query",
            "target": "vector_store",
            "label": "queries and filters"
        },
        {
            "source": "multi_vector",
            "target": "vector_store",
            "label": "queries chunks in"
        },
        {
            "source": "multi_vector",
            "target": "document_store",
            "label": "retrieves parents from"
        },
        {
            "source": "multi_query",
            "target": "retrieved_docs",
            "label": "returns unique"
        },
        {
            "source": "self_query",
            "target": "retrieved_docs",
            "label": "returns filtered"
        },
        {
            "source": "multi_vector",
            "target": "retrieved_docs",
            "label": "returns parent"
        }
    ],
    "groups": [
        {
            "id": "retrieval_strategies_group",
            "label": "Advanced Retrieval Strategies",
            "role": "analytical",
            "nodes": [
                "multi_query",
                "self_query",
                "multi_vector"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph retrieval_strategies_group["Advanced Retrieval Strategies"]
        multi_query["Generate Multiple Queries"]
        self_query["Construct Self-Query"]
        multi_vector["Retrieve Parent Documents"]
    end

    language_model["Language Model"]
    base_retriever["Base Retriever"]
    vector_store["Vector Store"]
    document_store["Document Storage"]
    retrieved_docs[("Retrieved Documents")]

    multi_query -->|'''generates queries with'''| language_model
    multi_query -->|'''uses underlying'''| base_retriever
    self_query -->|'''constructs query with'''| language_model
    self_query -->|'''queries and filters'''| vector_store
    multi_vector -->|'''queries chunks in'''| vector_store
    multi_vector -->|'''retrieves parents from'''| document_store

    multi_query -->|'''returns unique'''| retrieved_docs
    self_query -->|'''returns filtered'''| retrieved_docs
    multi_vector -->|'''returns parent'''| retrieved_docs

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class multi_query,self_query,multi_vector analytical
    class retrieved_docs data

    click language_model "models_and_embeddings.md" "View Language Models"
    click base_retriever "base_and_composite_retrievers.md" "View Base and Composite Retrievers"
    click vector_store "vector_stores.md" "View Vector Stores"
    click document_store "caching_and_storage.md" "View Caching and Storage"
```