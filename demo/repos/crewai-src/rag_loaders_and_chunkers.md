# RAG Loaders and Chunkers
This module provides a diverse set of loaders for ingesting data from various sources (files, web, databases) and chunkers for segmenting text, essential for Retrieval Augmented Generation (RAG) workflows.
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "base_components", "label": "Base RAG Components", "type": "module", "link": "base_components.md"},
        {"id": "file_loaders", "label": "File-Based Loaders", "type": "module", "link": "file_loaders.md"},
        {"id": "web_and_database_loaders", "label": "Web and Database Loaders", "type": "module", "link": "web_and_database_loaders.md"}
    ],
    "edges": [
        {"source": "file_loaders", "target": "base_components", "label": "extends"},
        {"source": "web_and_database_loaders", "target": "base_components", "label": "extends"}
    ],
    "groups": [
        {"id": "abstractions", "label": "Core Abstractions", "role": "analytical", "nodes": ["base_components"]},
        {"id": "data_ingestion", "label": "Data Ingestion", "role": "data", "nodes": ["file_loaders", "web_and_database_loaders"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph abstractions["Core Abstractions"]
        base_components["Base RAG Components"]
    end

    subgraph data_ingestion["Data Ingestion"]
        file_loaders["File-Based Loaders"]
        web_and_database_loaders["Web and Database Loaders"]
    end

    file_loaders -->|"extends"| base_components
    web_and_database_loaders -->|"extends"| base_components

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class base_components analytical
    class file_loaders,web_and_database_loaders data

    click base_components "base_components.md"
    click file_loaders "file_loaders.md"
    click web_and_database_loaders "web_and_database_loaders.md"
```