# lancedb_adapter Module Documentation

## Introduction

The `lancedb_adapter` module provides a specialized adapter for integrating CrewAI with LanceDB, a high-performance, disk-based vector database. This module facilitates efficient storage, retrieval, and management of vectorized data, enabling CrewAI agents to leverage LanceDB for Retrieval Augmented Generation (RAG) tasks. It abstracts away the complexities of LanceDB interactions, offering a streamlined interface for vector search and data addition.

## Architecture and Component Relationships

The `lancedb_adapter` module primarily consists of the `LanceDBAdapter` class, which serves as the main interface for interacting with LanceDB.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "lancedb_adapter", "label": "LanceDBAdapter", "type": "component", "link": null},
        {"id": "_default_embedding_function", "label": "_default_embedding_function", "type": "component", "link": null},
        {"id": "adapter_base", "label": "Adapter (Base Class)", "type": "external", "link": "crewai_tools_adapters.md"},
        {"id": "lancedb_library", "label": "LanceDB Library", "type": "external", "link": null},
        {"id": "store_lock_util", "label": "store_lock (Utility)", "type": "external", "link": "crewai_utilities.md"}
    ],
    "edges": [
        {"source": "lancedb_adapter", "target": "_default_embedding_function"},
        {"source": "lancedb_adapter", "target": "adapter_base"},
        {"source": "lancedb_adapter", "target": "lancedb_library"},
        {"source": "lancedb_adapter", "target": "store_lock_util"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    lancedb_adapter[LanceDBAdapter]
    _default_embedding_function[_default_embedding_function]
    adapter_base[Adapter (Base Class)]
    lancedb_library[LanceDB Library]
    store_lock_util[store_lock (Utility)]

    lancedb_adapter --> _default_embedding_function
    lancedb_adapter --> adapter_base
    lancedb_adapter --> lancedb_library
    lancedb_adapter --> store_lock_util
```

### Core Components

#### `LanceDBAdapter`

The `LanceDBAdapter` class is responsible for managing the connection to a LanceDB database and providing methods for querying and adding data.

**Key Attributes:**

*   `uri` (str | Path): The URI or path to the LanceDB database.
*   `table_name` (str): The name of the table within the LanceDB database to interact with.
*   `embedding_function` (Callable[[list[str]], list[list[float]]]): A callable function used to generate embeddings for text inputs. Defaults to `_default_embedding_function` if not provided.
*   `top_k` (int): The number of top results to retrieve during a vector search query.
*   `vector_column_name` (str): The name of the column storing vector embeddings in the LanceDB table.
*   `text_column_name` (str): The name of the column storing the original text in the LanceDB table.

**Internal Attributes (Private):**

*   `_db`: An instance of the LanceDB connection.
*   `_table`: An instance of the LanceDB table.
*   `_lock_name`: A unique lock name used for concurrency control during data modification operations.

**Key Methods:**

*   **`model_post_init(self, __context: Any) -> None`**:
    *   Initializes the LanceDB connection using the provided `uri`.
    *   Opens the specified `table_name` within the database.
    *   Sets up the `_lock_name` for managing concurrent access.
    *   Calls the parent class's `model_post_init` method.

*   **`query(self, question: str) -> str`**:
    *   Takes a `question` string as input.
    *   Generates an embedding for the question using the configured `embedding_function`.
    *   Performs a vector similarity search on the LanceDB table using the generated embedding.
    *   Limits the results to `top_k` and selects only the `text_column_name`.
    *   Returns the concatenated text values of the top results, separated by newlines.

*   **`add(self, *args: Any, **kwargs: Any) -> None`**:
    *   Adds data to the LanceDB table.
    *   Utilizes a `store_lock` (from [crewai_utilities.md](crewai_utilities.md)) to ensure thread-safe data addition, preventing race conditions.
    *   Passes `*args` and `**kwargs` directly to the underlying LanceDB table's `add` method.

#### `_default_embedding_function`

This is a private helper function, used as the default embedding function if one is not explicitly provided during the initialization of `LanceDBAdapter`. Its specific implementation is external to the provided `LanceDBAdapter` code snippet, but it's crucial for the adapter's core functionality of converting text into vector embeddings.

### External Dependencies

*   **`Adapter`**: The base class from which `LanceDBAdapter` inherits, providing foundational adapter functionalities. Refer to [crewai_tools_adapters.md](crewai_tools_adapters.md) for more details.
*   **LanceDB Library**: The core external library providing the LanceDB database functionalities, including `lancedb_connect` and table operations.
*   **`store_lock`**: A utility function (likely from [crewai_utilities.md](crewai_utilities.md)) used for managing concurrent access to the LanceDB table, particularly during data addition.

## Integration with the Overall System

The `lancedb_adapter` module is a crucial part of the `crewai_tools_adapters.data_retrieval_adapters` subtree. It provides a specific implementation for integrating LanceDB as a vector database for CrewAI agents.

*   **Data Retrieval Adapters**: It fits within the broader `data_retrieval_adapters` framework, offering one of several options for agents to access and retrieve information from external data sources.
*   **RAG System**: By facilitating vector search and data ingestion, it directly supports the Retrieval Augmented Generation (RAG) capabilities of CrewAI, allowing agents to fetch contextually relevant information to enhance their responses.
*   **CrewAI Tools**: As an adapter, it enables the creation of CrewAI tools that can interact with LanceDB, extending the capabilities of agents to perform tasks requiring vector database operations.

This module ensures that CrewAI can seamlessly utilize LanceDB for managing and querying large datasets of vectorized information, enhancing the intelligence and knowledge base of the agents.