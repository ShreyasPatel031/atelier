# Module: `cache_metrics`

## Introduction
The `cache_metrics` module is a vital part of the `crewai_files_cache` system, responsible for logging and tracking various file operations. It provides structured metrics that are crucial for monitoring the performance, reliability, and overall health of the file caching mechanism. By capturing detailed information about each file operation, this module enables developers and maintainers to gain insights into how the cache is being utilized and managed.

## Core Functionality

The primary functionality of this module revolves around the `log_file_operation` function, which is designed to standardize the logging of file-related events.

### `log_file_operation`
This function is the main entry point for recording file operation metrics. It captures a wide range of details associated with a file operation, such as the operation type, filename, provider, size, duration, success status, and any errors encountered. This structured logging approach ensures that all relevant data points are consistently captured, facilitating easier analysis and debugging.

**Parameters:**
*   `operation` (str): The name or type of the file operation (e.g., "read", "write", "delete", "upload").
*   `filename` (str, optional): The name of the file involved in the operation.
*   `provider` (str, optional): The name of the storage provider or service handling the file.
*   `size_bytes` (int, optional): The size of the file in bytes.
*   `duration_ms` (float, optional): The duration of the operation in milliseconds.
*   `success` (bool): A flag indicating whether the operation was successful.
*   `error` (str, optional): An error message if the operation failed.
*   `level` (int): The logging level (e.g., `logging.INFO`, `logging.ERROR`).
*   `**extra` (Any): Additional arbitrary metadata to include in the logs.

**Purpose:**
To provide a consistent and detailed logging mechanism for all file-related activities within the caching system. This helps in:
*   **Performance Monitoring:** Tracking `duration_ms` helps identify bottlenecks.
*   **Error Tracking:** `success` and `error` parameters provide immediate visibility into failures.
*   **Usage Analysis:** `operation`, `filename`, `provider`, and `size_bytes` offer insights into cache usage patterns.

## Architecture and Component Relationships

The `cache_metrics` module is relatively focused, with `log_file_operation` being its central component. It relies on an internal data structure (inferred as `FileOperationMetrics`) to consolidate metric data before sending it to the standard Python `logging` system.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "log_file_operation", "label": "log_file_operation()", "type": "component", "link": null},
        {"id": "FileOperationMetrics", "label": "FileOperationMetrics (Data Model)", "type": "component", "link": null},
        {"id": "logging_module", "label": "Logging Module", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "log_file_operation", "target": "FileOperationMetrics"},
        {"source": "log_file_operation", "target": "logging_module"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    log_file_operation[log_file_operation()]
    FileOperationMetrics[FileOperationMetrics (Data Model)]
    logging_module[Logging Module]

    log_file_operation --> FileOperationMetrics
    log_file_operation --> logging_module
```

**Explanation:**
*   **`log_file_operation()`**: This is the core function of the module, responsible for creating and emitting log entries.
*   **`FileOperationMetrics (Data Model)`**: An internal data structure (or a Pydantic model, based on the `to_dict()` method) used by `log_file_operation` to encapsulate all the metrics for a single file operation in a structured format.
*   **`Logging Module`**: The standard Python `logging` module, which is used by `log_file_operation` to dispatch the formatted metric data to configured log handlers.

## Integration with the Overall System

The `cache_metrics` module plays a supportive but critical role within the broader `crewai_files_cache` system. It provides the observability layer for cache operations, enabling other modules to report their activities.

*   **`crewai_files_cache`**: The parent module that orchestrates file caching. `cache_metrics` provides the logging infrastructure for all file-related operations within this system.
*   **`cache_lifecycle`**: Modules responsible for managing the lifecycle of cached files (e.g., creation, access, update, deletion) will utilize `log_file_operation` to record these events. For example, when a file is fetched, stored, or invalidated, `cache_lifecycle` components would call `log_file_operation` to log the event. Refer to the [cache_lifecycle.md](cache_lifecycle.md) documentation for more details.
*   **`cache_cleanup`**: When cached files are removed due to policies like LRU or TTL, components within `cache_cleanup` would log these deletion events using `log_file_operation` to track cache eviction metrics. Refer to the [cache_cleanup.md](cache_cleanup.md) documentation for more details.

By integrating `cache_metrics` across these components, the system gains a holistic view of file caching behavior, which is essential for performance tuning, resource management, and troubleshooting.
