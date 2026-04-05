# file_accessors Module Documentation

## Introduction

The `file_accessors` module provides synchronous utility functions for retrieving files associated with specific crew executions and individual tasks. It acts as a synchronous interface to an underlying asynchronous file storage system, ensuring that file retrieval operations are straightforward for other parts of the system.

## Architecture and Component Relationships

This module contains two primary functions, `get_files` and `get_task_files`, which serve as access points to the file storage. These functions rely on an internal file storage mechanism and a utility for running asynchronous operations synchronously.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "get_files", "label": "get_files", "type": "component", "link": null},
        {"id": "get_task_files", "label": "get_task_files", "type": "component", "link": null},
        {"id": "_run_sync", "label": "_run_sync (Utility)", "type": "component", "link": null},
        {"id": "_file_store", "label": "_file_store (File Storage Interface)", "type": "external", "link": "crewai_files_cache.md"},
        {"id": "file_input", "label": "FileInput (Type Definition)", "type": "external", "link": "crewai_files_core.md"}
    ],
    "edges": [
        {"source": "get_files", "target": "_run_sync"},
        {"source": "get_files", "target": "_file_store"},
        {"source": "get_files", "target": "file_input"},
        {"source": "get_task_files", "target": "_run_sync"},
        {"source": "get_task_files", "target": "_file_store"},
        {"source": "get_task_files", "target": "file_input"},
        {"source": "_run_sync", "target": "_file_store"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    get_files[get_files]
    get_task_files[get_task_files]
    _run_sync[_run_sync (Utility)]
    _file_store[_file_store (File Storage Interface)]
    file_input[FileInput (Type Definition)]

    get_files --> _run_sync
    get_files --> _file_store
    get_files --> file_input
    get_task_files --> _run_sync
    get_task_files --> _file_store
    get_task_files --> file_input
    _run_sync --> _file_store
```

### Components

#### `get_files(execution_id: UUID) -> dict[str, FileInput] | None`

Retrieves all files associated with a given `execution_id`. It internally calls `aget_files` (an asynchronous function) and executes it synchronously using `_run_sync`.

#### `get_task_files(task_id: UUID) -> dict[str, FileInput] | None`

Retrieves all files associated with a given `task_id`. Similar to `get_files`, it uses `aget_task_files` and `_run_sync` for synchronous execution of the asynchronous file retrieval.

### Dependencies

*   **`_run_sync`**: A utility function within `crewai_utilities.file_storage_utilities` that allows synchronous execution of asynchronous functions. This is crucial for integrating the asynchronous file storage backend with synchronous parts of the system.

*   **`_file_store`**: This is an instance of a file storage client that provides the core `get` operation. Its implementation details are managed by the [crewai_files_cache](crewai_files_cache.md) module, which handles caching and persistence of files.

*   **`FileInput`**: A type definition that specifies the expected structure for file inputs. This type is likely defined in the [crewai_files_core](crewai_files_core.md) module, which deals with the fundamental aspects of file handling.

*   **`UUID`**: (From Python's `uuid` module) Used for uniquely identifying crew executions and tasks.

## How the Module Fits into the Overall System

The `file_accessors` module serves as a critical bridge for file retrieval within the CrewAI system. It provides a consistent and simple synchronous API for other modules, such as `crewai_agent_to_agent_communication` or `crewai_task_management`, to access files without needing to directly manage asynchronous operations. By abstracting the underlying asynchronous file storage (`crewai_files_cache`) and standardizing file input types (`crewai_files_core`), it ensures modularity and ease of maintenance for file-related operations across the system.

This module is a part of the `crewai_utilities.file_storage_utilities.file_retrieval` package, highlighting its role as a foundational utility for file management within the CrewAI framework.