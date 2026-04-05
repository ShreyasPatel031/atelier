# in_memory_state_persistence

## Introduction

The `in_memory_state_persistence` module provides an in-memory implementation for state persistence within the `pydantic_graph` framework. It allows for capturing and managing the state of a graph's execution and its nodes as a history of snapshots. This module is essential for debugging, replaying graph runs, and understanding the flow of data through a graph without requiring external storage.

## Architecture and Core Components

The `in_memory_state_persistence` module centers around the `FullStatePersistence` class, which implements the `BaseStatePersistence` interface, providing a concrete mechanism for storing graph state and run results in memory.

### `FullStatePersistence`

`FullStatePersistence` is a generic class designed to hold a chronological list of snapshots of a graph's state and execution events. It offers the flexibility to deep copy states and nodes upon snapshotting, ensuring that historical records are immutable even if the original objects are modified later in the graph's execution.

**Key Features:**

*   **Snapshot Management**: It provides methods to create `NodeSnapshot` and `EndSnapshot` objects, capturing the graph's state at various points during its execution, including when a node is about to run or when the run concludes.
*   **Run Recording**: An `asynccontextmanager` (`record_run`) is available to monitor and record the status (running, success, error) and duration of individual node executions.
*   **State Loading**: Mechanisms to load the next pending node snapshot (`load_next`) or retrieve the entire history of snapshots (`load_all`) are included.
*   **Type Adaption for Serialization**: It leverages Pydantic's `TypeAdapter` for efficient serialization and deserialization of the entire snapshot history to and from JSON, although this in-memory persistence typically doesn't involve disk I/O directly.
*   **Deep Copying**: Configurable `deep_copy` attribute (defaults to `True`) ensures that snapshots store independent copies of state and nodes, preventing unintended mutations of historical data.

### Component Relationships

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "full_state_persistence", "label": "FullStatePersistence", "type": "component", "link": null},
        {"id": "snapshot_management", "label": "Snapshot Management (snapshot_node, snapshot_end, record_run)", "type": "component", "link": null},
        {"id": "state_loading", "label": "State Loading (load_next, load_all)", "type": "component", "link": null},
        {"id": "serialization_config", "label": "Serialization & Type Configuration (set_types, dump_json, load_json)", "type": "component", "link": null},
        {"id": "base_persistence_interface", "label": "BaseStatePersistence", "type": "external", "link": "base_persistence_interface.md"},
        {"id": "pydantic_graph_core_nodes", "label": "BaseNode (from pydantic_graph_core)", "type": "external", "link": "pydantic_graph_core.md"},
        {"id": "pydantic_library", "label": "Pydantic Library", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "full_state_persistence", "target": "snapshot_management"},
        {"source": "full_state_persistence", "target": "state_loading"},
        {"source": "full_state_persistence", "target": "serialization_config"},
        {"source": "full_state_persistence", "target": "base_persistence_interface", "label": "inherits"},
        {"source": "snapshot_management", "target": "pydantic_graph_core_nodes", "label": "uses BaseNode"},
        {"source": "serialization_config", "target": "pydantic_library", "label": "uses TypeAdapter"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    full_state_persistence[FullStatePersistence]
    snapshot_management[Snapshot Management (snapshot_node, snapshot_end, record_run)]
    state_loading[State Loading (load_next, load_all)]
    serialization_config[Serialization & Type Configuration (set_types, dump_json, load_json)]
    base_persistence_interface[BaseStatePersistence]
    pydantic_graph_core_nodes[BaseNode (from pydantic_graph_core)]
    pydantic_library[Pydantic Library]

    full_state_persistence --> snapshot_management
    full_state_persistence --> state_loading
    full_state_persistence --> serialization_config
    full_state_persistence -- inherits --> base_persistence_interface
    snapshot_management -- uses BaseNode --> pydantic_graph_core_nodes
    serialization_config -- uses TypeAdapter --> pydantic_library
```

## System Integration

The `in_memory_state_persistence` module is a concrete implementation within the larger [pydantic_graph_persistence](pydantic_graph_persistence.md) system. It provides a default, lightweight persistence solution for graph runs, particularly useful in development, testing, or scenarios where persistent storage is not required.

It works in conjunction with the [base_persistence_interface](base_persistence_interface.md), which defines the contract for all persistence mechanisms in `pydantic_graph`. By adhering to this interface, `FullStatePersistence` can be seamlessly swapped with other persistence implementations, such as [file_state_persistence](file_state_persistence.md), without affecting the core graph execution logic.

The ability to deep copy objects during snapshotting is crucial for maintaining integrity when working with mutable graph states and nodes, ensuring that the historical view remains consistent despite subsequent modifications to the live graph objects. Its integration with Pydantic for type adaptation facilitates advanced data handling, particularly when dealing with complex state objects or serialization requirements, even if primarily for internal programmatic use.