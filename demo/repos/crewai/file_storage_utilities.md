# File Storage Utilities Module

## Introduction

The `file_storage_utilities` module provides essential functions for managing and retrieving files associated with crew and task executions within the system. It abstracts the underlying storage mechanisms, offering a consistent interface for accessing stored files.

## Architecture Overview

This module is primarily composed of a single sub-module focused on file retrieval. It ensures that files linked to specific execution IDs or task IDs can be efficiently fetched when needed.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "file_retrieval", "label": "File Retrieval Operations", "type": "module", "link": "file_retrieval.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    file_retrieval[File Retrieval Operations]

    click file_retrieval "file_retrieval.md" "View File Retrieval Operations Documentation"
```

## Sub-modules

### [File Retrieval Operations](file_retrieval.md)
This sub-module provides core functionalities for retrieving files related to crew executions and individual tasks. It includes functions like `get_files` and `get_task_files` to fetch file data based on unique identifiers.