# Data Management Tools
This module provides a comprehensive suite of tools for data interaction, including querying various databases, performing vector searches, integrating with Contextual AI RAG agents, and managing file compression.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "database_query_tools", "label": "Database Query Tools", "type": "module", "link": "database_query_tools.md"},
        {"id": "vector_database_tools", "label": "Vector Database Tools", "type": "module", "link": "vector_database_tools.md"},
        {"id": "contextual_ai_rag", "label": "Contextual AI RAG Integration", "type": "module", "link": "contextual_ai_rag.md"},
        {"id": "file_compression_utility", "label": "File Compression Utility", "type": "module", "link": "file_compression_utility.md"},
        {"id": "rag_core_utilities", "label": "RAG Core Utilities", "type": "module", "link": "rag_core_utilities.md"}
    ],
    "edges": [
        {"source": "contextual_ai_rag", "target": "rag_core_utilities", "label": "uses internal components"}
    ],
    "groups": [
        {"id": "data_access", "label": "Data Access and Retrieval", "role": "analytical", "nodes": ["database_query_tools", "vector_database_tools"]},
        {"id": "ai_data_management", "label": "AI-Enhanced Data Management", "role": "generative", "nodes": ["contextual_ai_rag", "rag_core_utilities"]},
        {"id": "file_ops", "label": "File System Operations", "role": "surface", "nodes": ["file_compression_utility"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph data_access["Data Access and Retrieval"]
        database_query_tools["Database Query Tools"]
        vector_database_tools["Vector Database Tools"]
    end

    subgraph ai_data_management["AI-Enhanced Data Management"]
        contextual_ai_rag["Contextual AI RAG Integration"]
        rag_core_utilities["RAG Core Utilities"]
    end

    subgraph file_ops["File System Operations"]
        file_compression_utility["File Compression Utility"]
    end

    contextual_ai_rag -->|'''uses internal components'''| rag_core_utilities

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f

    class database_query_tools,vector_database_tools analytical
    class contextual_ai_rag generative
    class rag_core_utilities analytical
    class file_compression_utility surface

    click database_query_tools "database_query_tools.md"
    click vector_database_tools "vector_database_tools.md"
    click contextual_ai_rag "contextual_ai_rag.md"
    click file_compression_utility "file_compression_utility.md"
    click rag_core_utilities "rag_core_utilities.md"
```