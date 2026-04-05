# query_retrieval Module Documentation

## Introduction

The `query_retrieval` module is a fundamental component within the `dspy.retrievers` ecosystem, specifically designed to abstract and standardize the process of retrieving relevant passages from a corpus based on a given search query. It acts as an interface to various underlying Retrieval Models (RMs) configured within the DSPy framework, providing a consistent way to perform retrieval operations.

This module is a leaf module within the `dspy_retrievers.retrieval_logic` sub-hierarchy, focusing solely on the core `Retrieve` functionality.

## Architecture and Component Relationships

The `query_retrieval` module contains the `Retrieve` class, which is responsible for orchestrating the interaction with a configured Retrieval Model. It receives a query and returns processed passages, encapsulating the complexity of different RM implementations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "retrieve_class", "label": "Retrieve Class", "type": "component", "link": null},
        {"id": "retrieval_model_interface", "label": "Retrieval Model (RM) Interface", "type": "external", "link": "dspy_retrievers.md"},
        {"id": "prediction_object", "label": "Prediction Object", "type": "external", "link": "dspy_primitives.md"},
        {"id": "retrieval_logic_module", "label": "Retrieval Logic Module", "type": "external", "link": "retrieval_logic.md"}
    ],
    "edges": [
        {"source": "retrieve_class", "target": "retrieval_model_interface"},
        {"source": "retrieve_class", "target": "prediction_object"},
        {"source": "retrieval_logic_module", "target": "retrieve_class"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    retrieve_class[Retrieve Class]
    retrieval_model_interface[Retrieval Model (RM) Interface]
    prediction_object[Prediction Object]
    retrieval_logic_module[Retrieval Logic Module]

    retrieve_class --> retrieval_model_interface
    retrieve_class --> prediction_object
    retrieval_logic_module --> retrieve_class
```

### How it Fits into the Overall System

The `query_retrieval` module, through its `Retrieve` class, serves as the primary mechanism for integrating external knowledge sources into DSPy programs. When a DSPy program requires information retrieval (e.g., in a RAG pipeline), it calls upon an instance of `Retrieve`. This instance then delegates the actual search operation to the globally configured Retrieval Model (`dspy.settings.rm`), abstracting away the specifics of how the passages are retrieved (e.g., from a vector database, a search API, etc.).

It is a direct child of the [retrieval_logic module](retrieval_logic.md) and relies on the broader [dspy_retrievers module](dspy_retrievers.md) for various Retrieval Model implementations and utilities.

## Core Components

### `dspy.retrievers.retrieve.Retrieve`

The `Retrieve` class is a `Parameter` in DSPy, meaning it can be used directly in `dspy.Module` definitions. It encapsulates the logic for performing a search query and returning relevant passages.

-   **`name`**: "Search" - A descriptive name for the parameter.
-   **`input_variable`**: "query" - Specifies that the primary input to this parameter is a search query.
-   **`desc`**: "takes a search query and returns one or more potentially relevant passages from a corpus" - A brief description of its function.

#### `__init__(self, k=3, callbacks=None)`

Initializes the `Retrieve` instance.

-   **`k`**: The default number of top passages to retrieve. Defaults to 3.
-   **`callbacks`**: A list of callback functions to be executed during the retrieval process.

#### `reset(self)`

Resets the internal state of the `Retrieve` instance. Currently, it's an empty method.

#### `dump_state(self)`

Returns a dictionary containing the current state of the `Retrieve` instance, primarily the `k` value.

#### `load_state(self, state)`

Loads the state of the `Retrieve` instance from a given dictionary, updating attributes like `k`.

#### `@with_callbacks
__call__(self, *args, **kwargs)`

This method makes the `Retrieve` instance callable. It wraps the `forward` method with callback execution, ensuring any registered callbacks are triggered before and after the retrieval operation.

#### `forward(self, query: str, k: int | None = None, **kwargs) -> list[str] | Prediction | list[Prediction]`

The core method that performs the retrieval operation.

-   **`query`**: The search query string.
-   **`k`**: The number of passages to retrieve for this specific call. If not provided, it defaults to the `k` value set during initialization.
-   **`**kwargs`**: Additional keyword arguments passed directly to the underlying `dspy.settings.rm`.

**Process:**

1.  **Determines `k`**: Uses the provided `k` or the instance's default `k`.
2.  **Checks for RM**: Ensures that a Retrieval Model (`dspy.settings.rm`) has been configured. If not, it raises an `AssertionError`.
3.  **Executes RM**: Calls `dspy.settings.rm(query, k=k, **kwargs)` to perform the actual retrieval using the configured RM.
4.  **Processes Passages**: Converts the raw passages returned by the RM into a consistent format (list of `long_text` strings from `Prediction` objects).
5.  **Returns Result**: Encapsulates the retrieved passages within a `Prediction` object (`Prediction(passages=passages)`).
