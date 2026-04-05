# Data Loading Utilities

The `data_loading_utilities` module provides robust tools for loading and preparing datasets from various sources into the dspy.Example format, essential for bootstrapping and evaluating dspy programs. Its core component, `DataLoader`, streamlines the process of ingesting data from popular formats and integrating with retrieval modules.

## Architecture

The `data_loading_utilities` module, primarily through its `DataLoader` class, plays a crucial role in the data ingestion pipeline within `dspy_datasets`. It extends the `Dataset` class from the `dataset_management` module, inheriting fundamental dataset capabilities. `DataLoader` interacts with external data sources like Hugging Face Datasets, CSV, JSON, Parquet files, Pandas DataFrames, and dspy's configured Retrieval Module to fetch and transform data.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "data_loader", "label": "DataLoader", "type": "component", "link": null},
        {"id": "dataset_base", "label": "Dataset (Base)", "type": "external", "link": "dataset_management.md"},
        {"id": "huggingface", "label": "Hugging Face Datasets", "type": "external", "link": null},
        {"id": "pandas_df", "label": "Pandas DataFrame", "type": "external", "link": null},
        {"id": "retrieval_module", "label": "Retrieval Module", "type": "external", "link": "dspy_retrievers.md"},
        {"id": "csv_json_parquet", "label": "CSV/JSON/Parquet Files", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "data_loader", "target": "dataset_base"},
        {"source": "data_loader", "target": "huggingface"},
        {"source": "data_loader", "target": "pandas_df"},
        {"source": "data_loader", "target": "retrieval_module"},
        {"source": "data_loader", "target": "csv_json_parquet"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    data_loader[DataLoader]
    dataset_base[Dataset (Base)]
    huggingface[Hugging Face Datasets]
    pandas_df[Pandas DataFrame]
    retrieval_module[Retrieval Module]
    csv_json_parquet[CSV/JSON/Parquet Files]

    data_loader --> dataset_base
    data_loader --> huggingface
    data_loader --> pandas_df
    data_loader --> retrieval_module
    data_loader --> csv_json_parquet
```

## Core Functionality

The `DataLoader` class provides a suite of methods for loading and manipulating data:

### `DataLoader` Class

The `DataLoader` class is inherited from `Dataset` and is designed to simplify the process of loading various data formats into `dspy.Example` objects.

#### Data Loading Methods:

*   **`from_huggingface(dataset_name: str, *args, input_keys: tuple[str] = (), fields: tuple[str] | None = None, **kwargs)`**:
    Loads a dataset from the Hugging Face `datasets` library. It can handle various splits and allows specifying which fields to extract and which keys represent the inputs for `dspy.Example` objects.
*   **`from_csv(file_path: str, fields: list[str] | None = None, input_keys: tuple[str] = ())`**:
    Loads data from a CSV file.
*   **`from_pandas(df: "pd.DataFrame", fields: list[str] | None = None, input_keys: tuple[str] = ())`**:
    Loads data from a Pandas DataFrame.
*   **`from_json(file_path: str, fields: list[str] | None = None, input_keys: tuple[str] = ())`**:
    Loads data from a JSON file.
*   **`from_parquet(file_path: str, fields: list[str] | None = None, input_keys: tuple[str] = ())`**:
    Loads data from a Parquet file.
*   **`from_rm(num_samples: int, fields: list[str], input_keys: list[str])`**:
    Loads data directly from the configured dspy Retrieval Module (`dspy_retrievers`), allowing for a direct integration of retrieval-augmented generation (RAG) datasets.

#### Data Manipulation Methods:

*   **`sample(dataset: list[dspy.Example], n: int, *args, **kwargs)`**:
    Randomly samples `n` examples from a given list of `dspy.Example` objects.
*   **`train_test_split(dataset: list[dspy.Example], train_size: int | float = 0.75, test_size: int | float | None = None, random_state: int | None = None)`**:
    Splits a dataset into training and testing sets based on specified sizes or proportions. This method shuffles the dataset and supports reproducibility via `random_state`.

## Relationships to Other Modules

*   **`dataset_management`**: The `DataLoader` class inherits from `dspy.datasets.dataset.Dataset` (documented in [dataset_management.md](dataset_management.md)), providing it with basic dataset functionalities and ensuring consistency across dataset handling within dspy.
*   **`dspy_retrievers`**: The `from_rm` method directly depends on the dspy Retrieval Module (`dspy.settings.rm`). This establishes a critical link for loading datasets that originate from or depend on retrieval mechanisms (documented in [dspy_retrievers.md](dspy_retrievers.md)).
