# Excel Data Sources

The `excel_data_sources` module offers `ExcelKnowledgeSource`, allowing agents to ingest, preprocess, and query data from Excel files. It converts multiple sheets to CSV, chunks the content, and prepares it for embedding-based retrieval.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "excel_source",
            "label": "ExcelKnowledgeSource",
            "type": "component",
            "link": null
        },
        {
            "id": "excel_files",
            "label": "Excel Files",
            "type": "data",
            "link": null
        },
        {
            "id": "pandas_lib",
            "label": "Pandas Library",
            "type": "external",
            "link": null
        },
        {
            "id": "base_knowledge_source",
            "label": "BaseKnowledgeSource",
            "type": "external",
            "link": "knowledge_sources.md"
        },
        {
            "id": "text_chunker",
            "label": "Text Chunker",
            "type": "component",
            "link": null
        },
        {
            "id": "embedding_storage",
            "label": "Embedding Storage",
            "type": "data",
            "link": null
        }
    ],
    "edges": [
        {
            "source": "excel_files",
            "target": "excel_source",
            "label": "reads"
        },
        {
            "source": "excel_source",
            "target": "pandas_lib",
            "label": "uses to load data"
        },
        {
            "source": "excel_source",
            "target": "base_knowledge_source",
            "label": "inherits from"
        },
        {
            "source": "excel_source",
            "target": "text_chunker",
            "label": "sends content to"
        },
        {
            "source": "text_chunker",
            "target": "embedding_storage",
            "label": "stores chunks in"
        }
    ],
    "groups": [
        {
            "id": "ingestion_pipeline",
            "label": "Excel Data Ingestion",
            "role": "analytical",
            "nodes": [
                "excel_source",
                "text_chunker"
            ]
        },
        {
            "id": "data_artifacts",
            "label": "Data Artifacts",
            "role": "data",
            "nodes": [
                "excel_files",
                "embedding_storage"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph ingestion_pipeline["Excel Data Ingestion"]
        excel_source["ExcelKnowledgeSource"]
        text_chunker["Text Chunker"]
    end

    subgraph data_artifacts["Data Artifacts"]
        excel_files[("Excel Files")]
        embedding_storage[("Embedding Storage")]
    end

    pandas_lib["Pandas Library"]
    base_knowledge_source["BaseKnowledgeSource"]

    excel_files -.->|"reads"| excel_source
    excel_source -->|"uses to load data"| pandas_lib
    excel_source -->|"inherits from"| base_knowledge_source
    excel_source -->|"sends content to"| text_chunker
    text_chunker -->|"stores chunks in"| embedding_storage

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class excel_source,text_chunker analytical
    class excel_files,embedding_storage data

    click base_knowledge_source "knowledge_sources.md" "View BaseKnowledgeSource"
```