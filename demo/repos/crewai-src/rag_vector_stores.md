# RAG Vector Stores
This module abstracts various RAG vector store implementations, offering a unified interface for managing and interacting with different vector databases like ChromaDB and Qdrant for efficient data retrieval.
<!-- DIAGRAM_JSON
{
    "direction": "LR",
    "nodes": [
        {"id": "rag_core_interfaces", "label": "RAG Core Interfaces", "type": "module", "link": "rag_core_interfaces.md"},
        {"id": "chromadb_integration", "label": "ChromaDB Integration", "type": "module", "link": "chromadb_integration.md"},
        {"id": "qdrant_integration", "label": "Qdrant Integration", "type": "module", "link": "qdrant_integration.md"}
    ],
    "edges": [
        {"source": "rag_core_interfaces", "target": "chromadb_integration", "label": "creates ChromaDB client"},
        {"source": "rag_core_interfaces", "target": "qdrant_integration", "label": "creates Qdrant client"}
    ],
    "groups": [
        {"id": "core_rag_logic", "label": "Core RAG Logic", "role": "analytical", "nodes": ["rag_core_interfaces"]},
        {"id": "vector_store_providers", "label": "Vector Store Providers", "role": "data", "nodes": ["chromadb_integration", "qdrant_integration"]}
    ]
}
-->