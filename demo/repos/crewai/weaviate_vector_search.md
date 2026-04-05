# weaviate_vector_search Module Documentation

## Introduction
The `weaviate_vector_search` module provides a specialized tool for interacting with Weaviate vector databases. It enables agents to perform vector-based searches, retrieve relevant documents, and manage Weaviate collections directly within their workflows.

## Purpose and Core Functionality
The primary purpose of this module is to offer a robust and easy-to-use interface for integrating Weaviate as a knowledge source for AI agents. Its core functionality revolves around the `WeaviateVectorSearchTool` class, which encapsulates the logic for:
-   Connecting to a Weaviate cluster.
-   Managing (creating if non-existent) and querying specific Weaviate collections.
-   Performing hybrid searches (combining keyword and vector search).
-   Handling authentication and API key management for Weaviate and OpenAI (for embeddings).
-   Automatically installing the `weaviate-client` package if it's missing.

This tool is crucial for scenarios where agents need to retrieve contextual information from internal documents stored in a Weaviate database, enhancing their ability to respond accurately and informatively.

## Architecture and Component Relationships

The `weaviate_vector_search` module primarily consists of the `WeaviateVectorSearchTool` class and its internal helper functions. It integrates with the broader `crewai_tools` ecosystem.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "weaviate_vector_search_tool", "label": "WeaviateVectorSearchTool", "type": "component", "link": null},
        {"id": "_set_vectorizer", "label": "_set_vectorizer()", "type": "component", "link": null},
        {"id": "_set_generative_model", "label": "_set_generative_model()", "type": "component", "link": null},
        {"id": "crewai_tool_base", "label": "crewai_tool_base", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "crewai_tools_vector_database", "label": "crewai_tools_vector_database", "type": "external", "link": "crewai_tools_vector_database.md"},
        {"id": "weaviate_client_pkg", "label": "weaviate-client Package", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "weaviate_vector_search_tool", "target": "_set_vectorizer"},
        {"source": "weaviate_vector_search_tool", "target": "_set_generative_model"},
        {"source": "weaviate_vector_search_tool", "target": "crewai_tool_base"},
        {"source": "weaviate_vector_search_tool", "target": "weaviate_client_pkg"},
        {"source": "crewai_tools_vector_database", "target": "weaviate_vector_search_tool"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    weaviate_vector_search_tool[WeaviateVectorSearchTool]
    _set_vectorizer[_set_vectorizer()]
    _set_generative_model[_set_generative_model()]
    crewai_tool_base[crewai_tool_base]:::external
    crewai_tools_vector_database[crewai_tools_vector_database]:::external
    weaviate_client_pkg[weaviate-client Package]:::external

    weaviate_vector_search_tool --> _set_vectorizer
    weaviate_vector_search_tool --> _set_generative_model
    weaviate_vector_search_tool --> crewai_tool_base
    weaviate_vector_search_tool --> weaviate_client_pkg
    crewai_tools_vector_database --> weaviate_vector_search_tool
```

### Component Breakdown

#### `WeaviateVectorSearchTool`
-   **Description**: The primary class in this module, inheriting from `BaseTool` (from [crewai_tool_base.md](crewai_tool_base.md)). It serves as an interface for performing vector searches against a Weaviate database.
-   **Key Attributes**:
    -   `collection_name`: Specifies the Weaviate collection to be queried.
    -   `weaviate_cluster_url`, `weaviate_api_key`: Credentials for connecting to the Weaviate cluster.
    -   `openai_api_key`: Required for embedding generation.
    -   `limit`, `alpha`: Parameters for controlling query results and hybrid search weighting.
    -   `vectorizer`, `generative_model`: Internal configurations for Weaviate's vectorization and generative capabilities, set by helper functions `_set_vectorizer` and `_set_generative_model`.
-   **Core Methods**:
    -   `__init__`: Initializes the tool, checks for `weaviate-client` installation, and sets up OpenAI API key for headers. It also offers to install `weaviate-client` if missing.
    -   `_run(query: str) -> str`: Executes the search against the Weaviate collection. It connects to the Weaviate cluster, retrieves or creates the specified collection, performs a hybrid query, and formats the results into a JSON string.

#### Internal Helper Functions (`_set_vectorizer`, `_set_generative_model`)
-   These functions (not fully provided in the core components but referenced) are responsible for configuring the `vectorizer_config` and `generative_config` for Weaviate collections, ensuring proper setup for vector embeddings and potentially generative AI capabilities within Weaviate.

### External Dependencies
-   **`weaviate-client`**: The official Python client library for Weaviate, essential for all interactions with the Weaviate database.
-   **[crewai_tool_base.md](crewai_tool_base.md)**: Provides the `BaseTool` class, which `WeaviateVectorSearchTool` extends, defining the standard interface for tools within the CrewAI framework.
-   **[crewai_tools_vector_database.md](crewai_tools_vector_database.md)**: This module is part of the `crewai_tools_vector_database` family, which groups various vector database integration tools.

## How the Module Fits into the Overall System
The `weaviate_vector_search` module is a vital part of the `crewai_tools` ecosystem, specifically within the `crewai_tools_vector_database` sub-package. It allows CrewAI agents to leverage Weaviate as a powerful external knowledge source. By providing a standardized tool interface (`BaseTool`), it enables agents to:
-   **Retrieve Information**: Agents can use `WeaviateVectorSearchTool` to query Weaviate collections and retrieve relevant documents, augmenting their knowledge base for complex tasks.
-   **Contextual Understanding**: By fetching up-to-date and specific information from Weaviate, agents can gain deeper contextual understanding, leading to more accurate and informed decision-making.
-   **Pluggable Knowledge Source**: It offers a plug-and-play solution for integrating Weaviate, allowing developers to easily incorporate vector search capabilities without deep knowledge of Weaviate's underlying API.

This module contributes to the CrewAI framework's ability to create more intelligent and capable agents by connecting them to external, specialized data stores.