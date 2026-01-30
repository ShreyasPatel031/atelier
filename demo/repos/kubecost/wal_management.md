# Wal Management Module

The `wal_management` module is responsible for the Write-Ahead Log (WAL) operations within the metric update and persistence system. It ensures data durability and consistency by managing the writing and processing of metric updates before they are committed to the main storage.

## Architecture

This module primarily revolves around the `Walinator` component, which orchestrates the WAL process. It interacts with various external modules for storage, path formatting, event exporting, and metric updating. The `fileInfo` component is a helper struct used internally to manage metadata about WAL files.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "walinator", "label": "Walinator", "type": "component", "link": null},
        {"id": "file_info", "label": "fileInfo", "type": "component", "link": null},
        {"id": "storage_module", "label": "core_pkg_storage", "type": "external", "link": "core_pkg_storage.md"},
        {"id": "pathing_util", "label": "core_pkg_util (Pathing)", "type": "external", "link": "core_pkg_util.md"},
        {"id": "exporter_module", "label": "core_pkg_exporter", "type": "external", "link": "core_pkg_exporter.md"},
        {"id": "metric_updates_module", "label": "metric_updates", "type": "external", "link": "metric_updates.md"}
    ],
    "edges": [
        {"source": "walinator", "target": "storage_module"},
        {"source": "walinator", "target": "pathing_util"},
        {"source": "walinator", "target": "exporter_module"},
        {"source": "walinator", "target": "metric_updates_module"},
        {"source": "walinator", "target": "file_info"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    walinator[Walinator]
    file_info[fileInfo]
    storage_module[core_pkg_storage]
    pathing_util[core_pkg_util (Pathing)]
    exporter_module[core_pkg_exporter]
    metric_updates_module[metric_updates]
    walinator --> storage_module
    walinator --> pathing_util
    walinator --> exporter_module
    walinator --> metric_updates_module
    walinator --> file_info
```

### Components

#### Walinator
The `Walinator` struct is the central component of this module. It manages the lifecycle of Write-Ahead Logs, including writing metric updates to disk, ensuring their durability, and coordinating with other system components for eventual persistence.

- **`storage storage.Storage`**: An interface for interacting with the underlying storage system, likely provided by the [core_pkg_storage](core_pkg_storage.md) module.
- **`paths pathing.StoragePathFormatter[time.Time]`**: Used to format and manage file paths for WAL segments, potentially leveraging utilities from the [core_pkg_util](core_pkg_util.md) module.
- **`exporter exporter.EventExporter[UpdateSet]`**: Responsible for exporting processed WAL events or update sets to other parts of the system, possibly from the [core_pkg_exporter](core_pkg_exporter.md) module.
- **`limitResolution *util.Resolution`**: Defines the resolution at which metrics are processed or stored, also likely from [core_pkg_util](core_pkg_util.md).
- **`updater Updater`**: An interface that defines how metric updates are applied, likely implemented within the [metric_updates](metric_updates.md) module or closely related to it.

#### fileInfo
The `fileInfo` struct is a simple data structure used to hold metadata about a WAL file, such as its name, timestamp, and extension. This helps in organizing and retrieving WAL segments efficiently.

## System Integration

The `wal_management` module is a critical part of the `metric_update_and_wal` subsystem, which in turn is a key component of the overall `metric_management` system. It acts as a resilient buffer for incoming metric updates, ensuring that no data is lost even in the event of system failures. By providing a durable log of operations, it enables reliable recovery and consistent metric data across the system. It depends on core utility modules for storage, pathing, and exporting, and works closely with the [metric_updates](metric_updates.md) module to process and apply recorded changes.