# Retrieval Systems

This module provides various strategies and components for document retrieval, including base retriever implementations, advanced querying techniques, and methods for filtering and re-ranking search results.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "user_query", "label": "User Query", "type": "external", "link": null},
        {"id": "base_and_composite_retrievers", "label": "Base and Composite Retrievers", "type": "module", "link": "base_and_composite_retrievers.md"},
        {"id": "advanced_retrieval_strategies", "label": "Advanced Retrieval Strategies", "type": "module", "link": "advanced_retrieval_strategies.md"},
        {"id": "document_post_processing", "label": "Document Post-Processing", "type": "module", "link": "document_post_processing.md"}
    ],
    "edges": [
        {"source": "user_query", "target": "advanced_retrieval_strategies", "label": "initiates search (complex)"},
        {"source": "user_query", "target": "base_and_composite_retrievers", "label": "initiates search (basic)"},
        {"source": "advanced_retrieval_strategies", "target": "document_post_processing", "label": "retrieved results"},
        {"source": "base_and_composite_retrievers", "target": "document_post_processing", "label": "retrieved results"}
    ],
    "groups": [
        {"id": "retrieval_process", "label": "Retrieval Process", "role": "analytical", "nodes": ["base_and_composite_retrievers", "advanced_retrieval_strategies", "document_post_processing"]}
    ]
}
-->
```mermaid
flowchart TD
    user_query[("User Query")]

    subgraph retrieval_process["Retrieval Process"]
        base_and_composite_retrievers["Base and Composite Retrievers"]
        advanced_retrieval_strategies["Advanced Retrieval Strategies"]
        document_post_processing["Document Post-Processing"]
    end

    user_query -->|"initiates search (complex)"| advanced_retrieval_strategies
    user_query -->|"initiates search (basic)"| base_and_composite_retrievers
    advanced_retrieval_strategies -->|"retrieved results"| document_post_processing
    base_and_composite_retrievers -->|"retrieved results"| document_post_processing

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef external fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e

    class user_query external
    class base_and_composite_retrievers,advanced_retrieval_strategies,document_post_processing analytical

    click base_and_composite_retrievers "base_and_composite_retrievers.md"
    click advanced_retrieval_strategies "advanced_retrieval_strategies.md"
    click document_post_processing "document_post_processing.md"
```