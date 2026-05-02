# Knowledge Sources
This module provides a unified interface for integrating diverse knowledge sources, enabling agents to retrieve and utilize information from various file types like documents and spreadsheets.
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "document_file_sources", "label": "Document File Sources", "type": "module", "link": "document_file_sources.md"},
        {"id": "excel_data_sources", "label": "Excel Data Sources", "type": "module", "link": "excel_data_sources.md"},
        {"id": "rag_vector_stores", "label": "RAG Vector Stores", "type": "module", "link": "rag_vector_stores.md"}
    ],
    "edges": [
        {"source": "document_file_sources", "target": "rag_vector_stores", "label": "processed documents"},
        {"source": "excel_data_sources", "target": "rag_vector_stores", "label": "structured data"}
    ],
    "groups": [
        {"id": "input_sources", "label": "Input Sources", "role": "surface", "nodes": ["document_file_sources", "excel_data_sources"]},
        {"id": "knowledge_storage", "label": "Knowledge Storage", "role": "data", "nodes": ["rag_vector_stores"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph input_sources["Input Sources"]
        document_file_sources["Document File Sources"]
        excel_data_sources["Excel Data Sources"]
    end

    subgraph knowledge_storage["Knowledge Storage"]
        rag_vector_stores["RAG Vector Stores"]
    end

    document_file_sources -->|''processed documents''| rag_vector_stores
    excel_data_sources -->|''structured data''| rag_vector_stores

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class document_file_sources,excel_data_sources surface
    class rag_vector_stores data

    click document_file_sources "document_file_sources.md"
    click excel_data_sources "excel_data_sources.md"
    click rag_vector_stores "rag_vector_stores.md"
```