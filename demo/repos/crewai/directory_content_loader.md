# directory_content_loader

## Introduction

 The `directory_content_loader` module provides the `DirectoryLoader` class, a robust utility for recursively loading and processing files from a local directory. It is a critical component within the RAG (Retrieval-Augmented Generation) system, enabling the ingestion of various file types from a specified directory path into a unified content format for further processing.

## Module Architecture and Component Relationships

The `DirectoryLoader` class is the primary component of this module. It extends the `BaseLoader` and orchestrates the discovery, filtering, and processing of individual files within a given directory. It leverages other loader components for specific file type handling, ensuring a flexible and extensible content ingestion pipeline.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "directory_loader", "label": "DirectoryLoader", "type": "component", "link": null},
        {"id": "process_directory", "label": "_process_directory()", "type": "component", "link": null},
        {"id": "find_files", "label": "_find_files()", "type": "component", "link": null},
        {"id": "should_include_file", "label": "_should_include_file()", "type": "component", "link": null},
        {"id": "process_single_file", "label": "_process_single_file()", "type": "component", "link": null},
        {"id": "base_loader", "label": "BaseLoader", "type": "external", "link": "base_components.md"},
        {"id": "source_content", "label": "SourceContent", "type": "external", "link": "base_components.md"},
        {"id": "loader_result", "label": "LoaderResult", "type": "external", "link": "base_components.md"},
        {"id": "data_types", "label": "DataTypes", "type": "external", "link": "rag_loaders_and_chunkers.md"}
    ],
    "edges": [
        {"source": "directory_loader", "target": "base_loader", "label": "inherits"},
        {"source": "directory_loader", "target": "process_directory", "label": "calls"},
        {"source": "process_directory", "target": "find_files", "label": "calls"},
        {"source": "process_directory", "target": "process_single_file", "label": "calls"},
        {"source": "find_files", "target": "should_include_file", "label": "calls"},
        {"source": "process_single_file", "target": "data_types", "label": "uses"},
        {"source": "directory_loader", "target": "source_content", "label": "uses"},
        {"source": "directory_loader", "target": "loader_result", "label": "returns"},
        {"source": "process_single_file", "target": "loader_result", "label": "returns"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    directory_loader[DirectoryLoader]
    process_directory[_process_directory()]
    find_files[_find_files()]
    should_include_file[_should_include_file()]
    process_single_file[_process_single_file()]
    base_loader[BaseLoader]
    source_content[SourceContent]
    loader_result[LoaderResult]
    data_types[DataTypes]

    directory_loader -- inherits --> base_loader
    directory_loader -- calls --> process_directory
    process_directory -- calls --> find_files
    process_directory -- calls --> process_single_file
    find_files -- calls --> should_include_file
    process_single_file -- uses --> data_types
    directory_loader -- uses --> source_content
    directory_loader -- returns --> loader_result
    process_single_file -- returns --> loader_result

    click base_loader "base_components.md"
    click source_content "base_components.md"
    click loader_result "base_components.md"
    click data_types "rag_loaders_and_chunkers.md"
```

## Core Functionality

### DirectoryLoader Class

- **Purpose**: Facilitates the loading of content from a specified local directory, supporting recursive scanning and file type filtering.
- **Inherits From**: `BaseLoader` (see [base_components.md](base_components.md))

#### Methods:

- `load(self, source_content: SourceContent, **kwargs: Any) -> LoaderResult`
  - **Description**: The main entry point for loading directory content. It validates the input `source_content` (expecting a local directory path, not a URL) and delegates to `_process_directory`.
  - **Parameters**:
    - `source_content` (SourceContent): The path to the directory to be loaded.
    - `**kwargs`:
      - `recursive` (bool, default `True`): If `True`, searches directories recursively.
      - `include_extensions` (list[str]): A list of file extensions to include (e.g., `[".txt", ".md"]`).
      - `exclude_extensions` (list[str]): A list of file extensions to exclude.
      - `max_files` (int): Maximum number of files to process.
  - **Returns**: `LoaderResult` (see [base_components.md](base_components.md)) containing the combined content, metadata, and source information.

- `_process_directory(self, dir_path: str, kwargs: dict[str, Any]) -> LoaderResult`
  - **Description**: Handles the core logic of iterating through the directory, finding files, processing them individually, and aggregating the results and any errors.

- `_find_files(self, dir_path: str, recursive: bool, include_ext: list[str] | None = None, exclude_ext: list[str] | None = None) -> list[str]`
  - **Description**: Locates files within the specified directory based on recursion, inclusion, and exclusion criteria.

- `_should_include_file(filename: str, include_ext: list[str] | None = None, exclude_ext: list[str] | None = None) -> bool`
  - **Description**: A static method that determines whether a given file should be processed based on its extension and the provided include/exclude lists. It also filters out hidden files (starting with `.`).

- `_process_single_file(file_path: str) -> LoaderResult`
  - **Description**: A static method responsible for loading the content of a single file. It uses `DataTypes.from_content` (from [rag_loaders_and_chunkers.md](rag_loaders_and_chunkers.md)) to dynamically select the appropriate loader for the file's type and then loads its content.
  - **Dependencies**: Relies on the `DataTypes` utility to identify and instantiate specific file loaders.

## How it Fits into the Overall System

This `directory_content_loader` module is a fundamental part of the `crewai_tools_rag_loaders_and_chunkers.data_loaders.utility_loaders` package, providing a general-purpose mechanism for ingesting local directory content into the RAG system. It acts as an abstraction layer, allowing agents to easily consume data from file systems without needing to manage individual file types or traversal logic. By leveraging the `DataTypes` and other specialized loaders, it ensures that diverse content can be processed uniformly, contributing to the system's ability to build comprehensive knowledge bases from varied sources.