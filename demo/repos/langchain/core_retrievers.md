# `core_retrievers` Module Documentation

## Introduction

The `core_retrievers` module provides the foundational abstract base class for implementing document retrieval systems within the LangChain Core framework. It defines a standardized interface for retrieving relevant documents based on a given query, supporting both synchronous and asynchronous operations, and integrating with the LangChain callback and runnable systems.

## Purpose and Core Functionality

The primary purpose of the `core_retrievers` module is to offer a robust and extensible abstraction for any system designed to fetch documents. It ensures that all retriever implementations adhere to a common interface, making them interchangeable within LangChain applications.

Its core functionalities include:
- **Standardized Retrieval Interface**: Defines `BaseRetriever` as the base for all retrieval systems, enforcing consistent methods for document retrieval.
- **Synchronous and Asynchronous Operations**: Supports both `invoke` and `ainvoke` methods, allowing for flexible integration into various application contexts.
- **Callback Integration**: Seamlessly integrates with LangChain's callback managers, enabling detailed tracing, logging, and monitoring of retrieval operations.
- **Runnable Compatibility**: Extends `RunnableSerializable`, allowing retrievers to be part of complex chains and graphs within the LangChain Expression Language (LCEL).
- **Extensibility**: Provides abstract methods (`_get_relevant_documents` and `_aget_relevant_documents`) that concrete retriever implementations must override, facilitating custom retrieval logic.

## Architecture and Component Relationships

The `core_retrievers` module primarily revolves around the `BaseRetriever` class, which serves as the central abstraction. It interacts with several other core modules to provide its functionality.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "base_retriever", "label": "BaseRetriever", "type": "component", "link": null},
        {"id": "get_relevant_documents", "label": "_get_relevant_documents()", "type": "component", "link": null},
        {"id": "aget_relevant_documents", "label": "_aget_relevant_documents()", "type": "component", "link": null},
        {"id": "invoke_method", "label": "invoke()", "type": "component", "link": null},
        {"id": "ainvoke_method", "label": "ainvoke()", "type": "component", "link": null},
        {"id": "core_runnables", "label": "core_runnables", "type": "external", "link": "core_runnables.md"},
        {"id": "core_callbacks", "label": "core_callbacks", "type": "external", "link": "core_callbacks.md"},
        {"id": "core_messages", "label": "core_messages", "type": "external", "link": "core_messages.md"}
    ],
    "edges": [
        {"source": "base_retriever", "target": "get_relevant_documents"},
        {"source": "base_retriever", "target": "aget_relevant_documents"},
        {"source": "base_retriever", "target": "invoke_method"},
        {"source": "base_retriever", "target": "ainvoke_method"},
        {"source": "base_retriever", "target": "core_runnables", "label": "Extends RunnableSerializable"},
        {"source": "invoke_method", "target": "core_callbacks", "label": "Uses CallbackManager"},
        {"source": "ainvoke_method", "target": "core_callbacks", "label": "Uses AsyncCallbackManager"},
        {"source": "get_relevant_documents", "target": "core_messages", "label": "Returns Document list"},
        {"source": "aget_relevant_documents", "target": "core_messages", "label": "Returns Document list"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    base_retriever[BaseRetriever]
    get_relevant_documents[_get_relevant_documents()]
    aget_relevant_documents[_aget_relevant_documents()]
    invoke_method[invoke()]
    ainvoke_method[ainvoke()]
    core_runnables[core_runnables]
    core_callbacks[core_callbacks]
    core_messages[core_messages]

    base_retriever --> get_relevant_documents
    base_retriever --> aget_relevant_documents
    base_retriever --> invoke_method
    base_retriever --> ainvoke_method
    base_retriever -- Extends RunnableSerializable --> core_runnables
    invoke_method -- Uses CallbackManager --> core_callbacks
    ainvoke_method -- Uses AsyncCallbackManager --> core_callbacks
    get_relevant_documents -- Returns Document list --> core_messages
    aget_relevant_documents -- Returns Document list --> core_messages
```

### Component Breakdown

#### `BaseRetriever`

The `BaseRetriever` class is the cornerstone of this module. It is an abstract base class that provides the blueprint for all retrieval systems.

-   **Inheritance**: It inherits from `RunnableSerializable`, making it compatible with the LangChain Expression Language (LCEL) and allowing for serialization.
-   **Abstract Methods**:
    -   `_get_relevant_documents(self, query: str, *, run_manager: CallbackManagerForRetrieverRun) -> list[Document]`: An abstract method that concrete implementations must provide for synchronous document retrieval. It takes a query string and a `run_manager` for callback handling, returning a list of `Document` objects.
    -   `_aget_relevant_documents(self, query: str, *, run_manager: AsyncCallbackManagerForRetrieverRun) -> list[Document]`: An abstract method (with a default implementation that defers to `_get_relevant_documents`) for asynchronous document retrieval.
-   **Public Interface**:
    -   `invoke(self, input: str, config: RunnableConfig | None = None, **kwargs: Any) -> list[Document]`: The primary synchronous entry point for using the retriever. It handles callback management and orchestrates the call to `_get_relevant_documents`.
    -   `ainvoke(self, input: str, config: RunnableConfig | None = None, **kwargs: Any) -> list[Document]`: The primary asynchronous entry point, handling asynchronous callback management and calling `_aget_relevant_documents`.
-   **Attributes**:
    -   `tags`: Optional list of strings for tagging retriever calls for tracing.
    -   `metadata`: Optional dictionary for additional metadata associated with retriever calls.

## How the Module Fits into the Overall System

The `core_retrievers` module is a fundamental building block within the LangChain ecosystem. It provides the essential abstraction for any system that needs to retrieve information, such as:

-   **Question Answering Systems**: Retrievers are crucial for fetching relevant context documents to answer user queries.
-   **Retrieval Augmented Generation (RAG)**: They are a core component in RAG architectures, where retrieved documents are used to ground language model generations.
-   **Chatbots and Conversational Agents**: Retrievers can fetch historical conversation snippets or knowledge base articles to inform agent responses.
-   **Search and Information Retrieval**: While abstract, it lays the groundwork for more specific search implementations.

By defining a common `BaseRetriever` interface, this module enables a wide array of specialized retriever implementations (e.g., vector store retrievers, keyword-based retrievers) to be seamlessly integrated and interchanged within larger LangChain applications, such as [classic_retrievers.md](classic_retrievers.md) and those found in various `partners_*_retrievers` modules. Its integration with `core_runnables` means that retrievers can be easily composed with language models, prompt templates, and other runnables to build sophisticated AI applications. The reliance on `core_callbacks` ensures that all retrieval operations are observable and manageable.
