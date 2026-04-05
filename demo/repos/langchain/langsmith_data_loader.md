# langsmith_data_loader Module Documentation

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "langsmith_loader", "label": "LangSmithLoader", "type": "component", "link": null},
        {"id": "stringify", "label": "_stringify", "type": "component", "link": null},
        {"id": "base_loader_interface", "label": "BaseLoader Interface", "type": "external", "link": "base_loader_interface.md"},
        {"id": "langsmith_integration", "label": "LangSmith Integration", "type": "external", "link": "langsmith_integration.md"},
        {"id": "core_document_loaders", "label": "Core Document Loaders", "type": "external", "link": "core_document_loaders.md"},
        {"id": "core_api", "label": "Core API (Utils)", "type": "external", "link": "core_api.md"}
    ],
    "edges": [
        {"source": "langsmith_loader", "target": "stringify"},
        {"source": "langsmith_loader", "target": "base_loader_interface"},
        {"source": "langsmith_loader", "target": "langsmith_integration"},
        {"source": "langsmith_loader", "target": "core_document_loaders"},
        {"source": "langsmith_loader", "target": "core_api"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    langsmith_loader[LangSmithLoader]
    stringify[_stringify]
    base_loader_interface[BaseLoader Interface]
    langsmith_integration[LangSmith Integration]
    core_document_loaders[Core Document Loaders]
    core_api[Core API (Utils)]
    langsmith_loader --> stringify
    langsmith_loader --> base_loader_interface
    langsmith_loader --> langsmith_integration
    langsmith_loader --> core_document_loaders
    langsmith_loader --> core_api
```

### 1. Introduction

The `langsmith_data_loader` module provides a specialized document loader for integrating with LangSmith datasets. Its primary function is to fetch examples from LangSmith and convert them into `Document` objects, making it easy to use LangSmith data within LangChain applications, particularly for few-shot example retrieval.

### 2. Architecture and Component Relationships

The module primarily consists of the `LangSmithLoader` class and a utility function `_stringify`.

#### 2.1. `LangSmithLoader`

- **Purpose**: This class is responsible for connecting to the LangSmith platform, querying datasets, and transforming the retrieved examples into `Document` objects. It inherits from `BaseLoader` from the [base_loader_interface](base_loader_interface.md) module, adhering to the standard interface for document loaders.
- **Key Functionality**:
    - Initializes with various parameters for filtering and fetching data from LangSmith, such as `dataset_id`, `dataset_name`, `example_ids`, `as_of`, `splits`, `limit`, and `metadata`.
    - Allows specifying a `content_key` to extract specific nested fields from the LangSmith example's inputs to populate the `Document`'s `page_content`.
    - Supports a custom `format_content` callable to transform the extracted content into a string, defaulting to JSON-encoding via `_stringify`.
    - Utilizes an internal `LangSmithClient` instance (from [langsmith_integration](langsmith_integration.md)) to interact with the LangSmith API.
    - Implements the `lazy_load` method, which yields `Document` objects one by one, allowing for efficient processing of large datasets.
    - Each `Document` contains the extracted content as `page_content` and the entire LangSmith example (inputs, outputs, etc.) within its `metadata`.
- **Dependencies**:
    - Inherits from `BaseLoader` ([base_loader_interface](base_loader_interface.md)).
    - Uses `LangSmithClient` for API interactions ([langsmith_integration](langsmith_integration.md)).
    - Relies on the `Document` object structure, defined within the [core_document_loaders](core_document_loaders.md) module.
    - Employs `_stringify` (internal) for content formatting.
    - Utilizes `pydantic_to_dict` (assumed from [core_api](core_api.md) or a common utility) to convert example objects to dictionaries for metadata.

#### 2.2. `_stringify`

- **Purpose**: A private utility function used by `LangSmithLoader` to convert various input types (string or dictionary) into a string representation.
- **Functionality**:
    - If the input is already a string, it returns it directly.
    - If the input is a dictionary, it attempts to JSON-encode it with an indent of 2 for readability.
    - If JSON encoding fails, it falls back to a simple string conversion.
- **Dependencies**: None, it's a self-contained helper.

### 3. How the Module Fits into the Overall System

The `langsmith_data_loader` module plays a crucial role in the LangChain ecosystem by providing a direct bridge to LangSmith datasets. It enables developers to:
- **Ingest LangSmith Examples**: Easily load examples created or logged in LangSmith into a standardized `Document` format.
- **Few-Shot Learning**: Facilitate the creation of few-shot example retrievers, as the entire example is stored in the `Document`'s metadata. This allows downstream components to access both inputs and expected outputs for in-context learning.
- **Evaluation and Experimentation**: Provide a convenient way to load evaluation datasets from LangSmith for testing and comparing different LLM applications.

This module is situated within the `core_document_loaders` hierarchy, indicating its role as a specialized data source for the broader document processing capabilities of LangChain. It depends on core interfaces like `BaseLoader` and core data structures like `Document`, ensuring consistency and interoperability with other LangChain components.