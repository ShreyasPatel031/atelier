# Knowledge Sources Management
This module provides classes for integrating and managing diverse knowledge sources, including base file handling, multi-format document conversion via Docling, and structured data extraction from Excel files.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "base_file_knowledge_source", "label": "Base File Knowledge Source", "type": "module", "link": "base_file_knowledge_source.md"},
        {"id": "docling_integration", "label": "Docling Document Integration", "type": "module", "link": "docling_integration.md"},
        {"id": "excel_data_source", "label": "Excel Data Source", "type": "module", "link": "excel_data_source.md"}
    ],
    "edges": [
        {"source": "docling_integration", "target": "base_file_knowledge_source", "label": "extends"},
        {"source": "excel_data_source", "target": "base_file_knowledge_source", "label": "extends"}
    ],
    "groups": [
        {"id": "knowledge_sources_group", "label": "Knowledge Sources", "role": "data", "nodes": ["base_file_knowledge_source", "docling_integration", "excel_data_source"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph knowledge_sources_group["Knowledge Sources"]
        base_file_knowledge_source["Base File Knowledge Source"]
        docling_integration["Docling Document Integration"]
        excel_data_source["Excel Data Source"]
    end

    docling_integration -->|'''extends'''| base_file_knowledge_source
    excel_data_source -->|'''extends'''| base_file_knowledge_source

    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class base_file_knowledge_source,docling_integration,excel_data_source data

    click base_file_knowledge_source "base_file_knowledge_source.md"
    click docling_integration "docling_integration.md"
    click excel_data_source "excel_data_source.md"
```