# MongoDB Vector Search Module


The `mongodb_vector_search` module provides a specialized tool for performing vector searches within a MongoDB database. It integrates with OpenAI or Azure OpenAI for embedding generation, allowing users to store and query text data based on semantic similarity.

## Core Functionality

The primary component of this module is the `MongoDBVectorSearchTool` class, which extends the functionality of a `BaseTool` from the [crewai_tool_base](crewai_tool_base.md) module.

### `MongoDBVectorSearchTool`

This tool is designed to facilitate vector search operations on internal documents stored in a MongoDB database.

**Key Features:**
*   **Vector Search**: Performs similarity searches using vector embeddings.
*   **Embedding Generation**: Utilizes OpenAI or Azure OpenAI models to generate embeddings for text data.
*   **MongoDB Integration**: Connects to specified MongoDB databases and collections to store and retrieve vector data.
*   **Index Management**: Provides a convenience function to create Atlas Vector Search indexes.
*   **Batch Operations**: Supports batch insertion of texts and their corresponding embeddings.
*   **Query Configuration**: Allows flexible configuration for search queries, including limits, oversampling factors, pre-filters, and post-filter pipelines.

**Attributes:**
*   `name`: "MongoDBVectorSearchTool"
*   `description`: Describes the tool's purpose.
*   `args_schema`: Defines the input schema for the tool (MongoDBToolSchema).
*   `query_config`: Optional configuration for vector search queries.
*   `embedding_model`: Specifies the OpenAI embedding model to use (default: "text-embedding-3-large").
*   `vector_index_name`: Name of the Atlas Search vector index (default: "vector_index").
*   `text_key`: MongoDB field for storing document text (default: "text").
*   `embedding_key`: MongoDB field for storing document embeddings (default: "embedding").
*   `database_name`: Name of the MongoDB database.
*   `collection_name`: Name of the MongoDB collection.
*   `connection_string`: Connection string for the MongoDB cluster.
*   `dimensions`: Number of dimensions in the embedding vector (default: 1536).
*   `env_vars`: List of environment variables the tool might use (e.g., BROWSERBASE_API_KEY).
*   `package_dependencies`: Lists required Python packages (e.g., "pymongo").

**Methods:**
*   `__init__(self, **kwargs: Any)`: Initializes the tool, checks for `pymongo` installation, sets up the OpenAI/Azure OpenAI client, and establishes a connection to MongoDB.
*   `create_vector_search_index(self, *, dimensions: int, relevance_score_fn: str = "cosine", auto_index_timeout: int = 15)`: Creates an Atlas Vector Search index with specified dimensions and similarity function.
*   `add_texts(self, texts: Iterable[str], metadatas: list[dict[str, Any]] | None = None, ids: list[str] | None = None, batch_size: int = 100, **kwargs: Any) -> list[str]`: Adds texts to the MongoDB collection, generates embeddings, and inserts them.
*   `_embed_texts(self, texts: list[str]) -> list[list[float]]`: Internal method to generate embeddings for a list of texts using the configured OpenAI client.
*   `_bulk_embed_and_insert_texts(self, texts: list[str], metadatas: list[dict[str, Any]], ids: list[str]) -> list[str]`: Internal method to perform bulk insertion of texts, embeddings, and metadata into MongoDB.
*   `_run(self, query: str) -> str`: Executes a vector search query against the MongoDB collection, applies filters, and returns the results.
*   `__del__(self) -> None`: Cleans up the MongoDB and OpenAI client connections upon object deletion.

## Architecture and Component Relationships

The `mongodb_vector_search` module primarily revolves around the `MongoDBVectorSearchTool`. This tool acts as an interface between the CrewAI ecosystem and a MongoDB Atlas cluster, leveraging vector search capabilities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "mongodb_vector_search_tool", "label": "MongoDBVectorSearchTool", "type": "component", "link": null},
        {"id": "base_tool", "label": "BaseTool", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "pymongo", "label": "pymongo (MongoDB Client)", "type": "external", "link": null},
        {"id": "openai_client", "label": "OpenAI/AzureOpenAI Client", "type": "external", "link": null},
        {"id": "mongodb_atlas", "label": "MongoDB Atlas Database", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "mongodb_vector_search_tool", "target": "base_tool"},
        {"source": "mongodb_vector_search_tool", "target": "pymongo"},
        {"source": "mongodb_vector_search_tool", "target": "openai_client"},
        {"source": "pymongo", "target": "mongodb_atlas"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    mongodb_vector_search_tool[MongoDBVectorSearchTool]
    base_tool[BaseTool]
    pymongo[pymongo (MongoDB Client)]
    openai_client[OpenAI/AzureOpenAI Client]
    mongodb_atlas[MongoDB Atlas Database]

    mongodb_vector_search_tool --> base_tool
    mongodb_vector_search_tool --> pymongo
    mongodb_vector_search_tool --> openai_client
    pymongo --> mongodb_atlas
```

**Explanation:**
*   **`MongoDBVectorSearchTool`**: The central component, responsible for all MongoDB vector search operations.
*   **`BaseTool`**: The foundation class from [crewai_tool_base](crewai_tool_base.md) that `MongoDBVectorSearchTool` inherits from, providing the basic structure for CrewAI tools.
*   **`pymongo (MongoDB Client)`**: An external library used by `MongoDBVectorSearchTool` to interact directly with the MongoDB database.
*   **`OpenAI/AzureOpenAI Client`**: An external dependency used for generating vector embeddings from text, which are crucial for vector search.
*   **`MongoDB Atlas Database`**: The actual database where the data and vector indexes are stored and queried.

## How the Module Fits into the Overall System

The `mongodb_vector_search` module is a specific implementation within the larger [crewai_tools_vector_database](crewai_tools_vector_database.md) ecosystem. It provides a concrete tool for agents to interact with MongoDB as a vector store.

CrewAI agents can leverage the `MongoDBVectorSearchTool` to:
*   **Retrieve Context**: Agents can query the MongoDB database for semantically relevant information based on a given query, enriching their knowledge base.
*   **Store Information**: Agents can also store processed information or generated content into MongoDB, along with their embeddings, making it searchable later.
*   **Data Management**: It allows for the integration of MongoDB Atlas as a persistent and scalable vector database for CrewAI applications.

By abstracting the complexities of MongoDB interactions and vector search, this module allows CrewAI agents to seamlessly access and utilize information stored in MongoDB for various tasks, such as RAG (Retrieval Augmented Generation), knowledge retrieval, and more.
