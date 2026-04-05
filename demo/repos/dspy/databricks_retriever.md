# Databricks Retriever Module

## Introduction

The `databricks_retriever` module provides the `DatabricksRM` class, a specialized retriever for interacting with Databricks Mosaic AI Vector Search Indexes. It enables DSPy programs to efficiently retrieve relevant documents from Databricks Vector Search based on a given query, supporting both text and vector-based queries.

This module abstracts the complexities of querying a Databricks Vector Search Index, offering a unified interface within the DSPy framework. It handles authentication, query execution, and result processing, making it straightforward to integrate Databricks Vector Search into your DSPy applications.

## Architecture and Component Relationships

The `databricks_retriever` module's core component, `DatabricksRM`, extends the base `dspy.Retrieve` class, providing a concrete implementation for Databricks Vector Search. It utilizes either the `databricks-sdk` Python library or the `requests` library for interacting with the Databricks Vector Search API, depending on the environment setup and library availability.

The module's architecture is designed to be flexible, allowing for configuration via explicit parameters or environment variables for Databricks credentials and endpoint information. It also includes utility methods for extracting document IDs and other metadata from search results, and can be configured for compatibility with the Databricks Mosaic Agent Framework.

### Diagram
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "DatabricksRM", "label": "DatabricksRM", "type": "component", "link": null},
        {"id": "_query_via_databricks_sdk", "label": "_query_via_databricks_sdk", "type": "component", "link": null},
        {"id": "_query_via_requests", "label": "_query_via_requests", "type": "component", "link": null},
        {"id": "_extract_doc_ids", "label": "_extract_doc_ids", "type": "component", "link": null},
        {"id": "_get_extra_columns", "label": "_get_extra_columns", "type": "component", "link": null},
        {"id": "query_retrieval", "label": "query_retrieval (dspy.Retrieve Base)", "type": "external", "link": "query_retrieval.md"},
        {"id": "databricks_sdk_lib", "label": "Databricks SDK (External)", "type": "external", "link": null},
        {"id": "requests_lib", "label": "Requests Library (External)", "type": "external", "link": null},
        {"id": "os_lib", "label": "OS Module (External)", "type": "external", "link": null},
        {"id": "json_lib", "label": "JSON Module (External)", "type": "external", "link": null},
        {"id": "mlflow_lib", "label": "MLflow Library (External - Conditional)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "DatabricksRM", "target": "query_retrieval"},
        {"source": "DatabricksRM", "target": "_query_via_databricks_sdk"},
        {"source": "DatabricksRM", "target": "_query_via_requests"},
        {"source": "DatabricksRM", "target": "_extract_doc_ids"},
        {"source": "DatabricksRM", "target": "_get_extra_columns"},
        {"source": "DatabricksRM", "target": "os_lib"},
        {"source": "_query_via_databricks_sdk", "target": "databricks_sdk_lib"},
        {"source": "_query_via_requests", "target": "requests_lib"},
        {"source": "_extract_doc_ids", "target": "json_lib"},
        {"source": "_get_extra_columns", "target": "json_lib"},
        {"source": "DatabricksRM", "target": "mlflow_lib"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    DatabricksRM[DatabricksRM]
    _query_via_databricks_sdk[_query_via_databricks_sdk]
    _query_via_requests[_query_via_requests]
    _extract_doc_ids[_extract_doc_ids]
    _get_extra_columns[_get_extra_columns]
    query_retrieval[query_retrieval (dspy.Retrieve Base)]
    databricks_sdk_lib[Databricks SDK (External)]
    requests_lib[Requests Library (External)]
    os_lib[OS Module (External)]
    json_lib[JSON Module (External)]
    mlflow_lib[MLflow Library (External - Conditional)]

    DatabricksRM --> query_retrieval
    DatabricksRM --> _query_via_databricks_sdk
    DatabricksRM --> _query_via_requests
    DatabricksRM --> _extract_doc_ids
    DatabricksRM --> _get_extra_columns
    DatabricksRM --> os_lib
    _query_via_databricks_sdk --> databricks_sdk_lib
    _query_via_requests --> requests_lib
    _extract_doc_ids --> json_lib
    _get_extra_columns --> json_lib
    DatabricksRM --> mlflow_lib
```

## Core Components

### `DatabricksRM`

`dspy.retrievers.databricks_rm.DatabricksRM` is the main class in this module. It is a retriever that connects to a Databricks Mosaic AI Vector Search Index to fetch documents.

**Key Features:**

*   **Initialization:** Configurable with Databricks index name, endpoint, token, client ID/secret, columns to retrieve, filters, and the number of results (`k`). It can source credentials from environment variables (`DATABRICKS_TOKEN`, `DATABRICKS_HOST`, `DATABRICKS_CLIENT_ID`, `DATABRICKS_CLIENT_SECRET`) or directly from passed arguments.
*   **Querying:** Supports both text-based and vector-based queries. It determines the underlying query mechanism (Databricks SDK or `requests`) based on whether `databricks-sdk` is installed.
*   **Result Processing:** Extracts document IDs, text, and other specified columns from the search results. It can format results for standard DSPy `Prediction` objects or for compatibility with the Databricks Mosaic Agent Framework.
*   **Error Handling:** Includes checks for required environment variables/parameters and for the presence of specified columns in the index schema.
*   **`use_with_databricks_agent_framework`:** A flag to enable specific schema settings for MLflow when integrating with the Databricks Mosaic Agent Framework.

**Dependencies:**

*   Inherits from `dspy.Retrieve` (refer to [query_retrieval.md](query_retrieval.md) for more details on the base retrieval logic).
*   Optionally uses the `databricks-sdk` Python library for querying the Vector Search Index.
*   Uses the `requests` Python library as a fallback for querying the Vector Search Index if `databricks-sdk` is not installed.
*   Interacts with the `os` module for environment variable access.
*   Uses the `json` module for handling JSON filters and metadata.
*   Conditionally interacts with the `mlflow` Python library when `use_with_databricks_agent_framework` is enabled.

**Example Usage:**

```python
from databricks.vector_search.client import VectorSearchClient

# Create a Databricks Vector Search Endpoint (if not already existing)
client = VectorSearchClient()
client.create_endpoint(
    name="your_vector_search_endpoint_name",
    endpoint_type="STANDARD"
)

# Create a Databricks Direct Access Vector Search Index (if not already existing)
index = client.create_direct_access_index(
    endpoint_name="your_vector_search_endpoint_name",
    index_name="your_index_name",
    primary_key="id",
    embedding_dimension=1024,
    embedding_vector_column="text_vector",
    schema={
      "id": "int",
      "field2": "str",
      "field3": "float",
      "text_vector": "array<float>"
    }
)

# Configure a DatabricksRM retriever module
retriever = DatabricksRM(
    databricks_index_name = "your_index_name",
    docs_id_column_name="id",
    text_column_name="field2",
    k=3
)

# Query the index
query_results = retriever(query="Example query text")
print(query_results.docs)
```

### `_extract_doc_ids`

A private helper method within `DatabricksRM` responsible for extracting the document ID from a single search result item, considering cases where the ID might be embedded within a 'metadata' field.

### `_get_extra_columns`

Another private helper method in `DatabricksRM` that extracts all columns from a search result item, excluding the document ID, text, and URI columns. It also handles metadata fields.

### `_query_via_databricks_sdk`

A static private method used by `DatabricksRM` to perform queries against a Databricks Vector Search Index using the `databricks-sdk` library. It handles authentication via tokens or service principals and constructs the query payload.

### `_query_via_requests`

A static private method used by `DatabricksRM` as a fallback to query a Databricks Vector Search Index using the `requests` Python library. It constructs the HTTP request, handles authorization, and processes the JSON response.

## How the Module Fits into the Overall System

The `databricks_retriever` module, through its `DatabricksRM` class, acts as a crucial bridge between DSPy's retrieval abstraction and Databricks' Vector Search capabilities. It allows DSPy programs to seamlessly incorporate highly scalable and performant vector search functionalities hosted on Databricks.

By conforming to the `dspy.Retrieve` interface, `DatabricksRM` can be easily swapped with other retriever implementations within a DSPy program, enabling developers to experiment with different retrieval backends without altering their core DSPy logic.

This integration is particularly valuable for applications requiring enterprise-grade vector search, leveraging Databricks' ecosystem for data management and AI workflows. The conditional `mlflow` integration further highlights its role in a broader Databricks-centric AI development environment.