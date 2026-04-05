# `rag_adapter` Module Documentation

## Introduction

The `rag_adapter` module provides a crucial interface for integrating Retrieval Augmented Generation (RAG) capabilities within the CrewAI framework. It acts as a specialized adapter that wraps the core RAG system, offering a standardized way for other tools and agents to perform document retrieval and knowledge base interactions.

## Core Functionality and Purpose

At its heart, the `rag_adapter` module exposes the `RAGAdapter` class, designed to facilitate seamless interaction with a knowledge base. This class abstracts away the complexities of the underlying RAG implementation, presenting a clear and concise API for querying and adding information.

### `RAGAdapter` Class

**`lib.crewai-tools.src.crewai_tools.adapters.rag_adapter.RAGAdapter`**

This class serves as the primary entry point for RAG operations. It initializes and manages an internal RAG instance, configuring it based on the provided parameters.

#### Initialization Parameters:

- `collection_name` (str, default: "crewai_knowledge_base"): The name of the collection or index within the RAG system to interact with.
- `persist_directory` (str | None): Optional directory path where the knowledge base data should be persisted.
- `embedding_model` (str, default: "text-embedding-3-small"): The name of the embedding model to use for vectorizing queries and documents.
- `top_k` (int, default: 5): The number of top relevant documents to retrieve during a query.
- `embedding_api_key` (str | None): API key required for the chosen embedding model, if applicable.
- `**embedding_kwargs` (Any): Additional keyword arguments to pass directly to the embedding model configuration.

#### Methods:

- `query(question: str) -> str`:
    Performs a retrieval query against the configured knowledge base using the provided `question`. It returns a string containing the retrieved information.

- `add(*args: Any, **kwargs: Any) -> None`:
    Adds new data or documents to the knowledge base. This method supports flexible arguments to accommodate various data input formats for the underlying RAG system.

## Architecture and Component Relationships

The `rag_adapter` module is designed as a lightweight wrapper around a more comprehensive RAG system. It adheres to the `Adapter` pattern, enabling modularity and interchangeability of RAG implementations.

- **`RAGAdapter`**: The central component of this module, it provides the public interface for RAG operations. It encapsulates the specifics of the `crewai_rag_system`.
- **`RAG` (from `crewai_rag_system`)**: This is the core RAG implementation that `RAGAdapter` utilizes. `RAGAdapter` delegates all actual retrieval and addition logic to an instance of this class. For detailed information, refer to the [crewai_rag_system documentation](crewai_rag_system.md).
- **`Adapter` (from `crewai_tools_adapters`)**: `RAGAdapter` inherits from this base class, ensuring it conforms to the common interface expected of all tool adapters within the CrewAI framework. For more details, see the [crewai_tools_adapters documentation](crewai_tools_adapters.md).

## Module Integration

The `rag_adapter` module is a sub-module of `crewai_tools_adapters.data_retrieval_adapters`, positioning it as a specialized tool adapter for data retrieval using RAG. It allows other CrewAI components, such as agents and tasks, to leverage sophisticated RAG capabilities without needing to directly manage the complexities of vector databases, embedding models, or retrieval algorithms. By abstracting the `crewai_rag_system`, it promotes a cleaner architecture and easier maintenance.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "rag_adapter_class", "label": "RAGAdapter", "type": "component", "link": null},
        {"id": "rag_system_module", "label": "crewai_rag_system", "type": "external", "link": "crewai_rag_system.md"},
        {"id": "adapter_base_class", "label": "Adapter (from crewai_tools_adapters)", "type": "external", "link": "crewai_tools_adapters.md"}
    ],
    "edges": [
        {"source": "rag_adapter_class", "target": "rag_system_module", "label": "uses"},
        {"source": "rag_adapter_class", "target": "adapter_base_class", "label": "inherits from"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    rag_adapter_class[RAGAdapter]
    rag_system_module[crewai_rag_system]
    adapter_base_class[Adapter (from crewai_tools_adapters)]

    rag_adapter_class -- uses --> rag_system_module
    rag_adapter_class -- inherits from --> adapter_base_class
```
