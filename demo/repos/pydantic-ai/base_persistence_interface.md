# `base_persistence_interface` Module Documentation

The `base_persistence_interface` module provides the abstract foundation for managing and persisting the state of graph runs within the `pydantic_graph` system. It defines a common interface that all concrete state persistence implementations must adhere to, ensuring consistent interaction with graph run states regardless of the underlying storage mechanism.

### Purpose and Core Functionality

The primary purpose of `base_persistence_interface` is to establish a clear contract for how graph states are saved, loaded, and managed throughout the lifecycle of a graph execution. This module introduces the `BaseStatePersistence` abstract class, which outlines a set of methods for:

*   **Snapshotting Graph State**: Recording the state of a graph at specific points, such as before running a node (`snapshot_node`, `snapshot_node_if_new`) or when the graph run concludes (`snapshot_end`). These snapshots typically involve capturing the current graph state and information about the next node to be executed or the final result.
*   **Recording Node Execution**: Marking the start and end of a node's execution, including status updates (e.g., `'running'`, `'success'`, `'error'`) and duration, through the `record_run` method. This is crucial for tracking the progress and outcome of individual graph steps.
*   **Loading Snapshots**: Retrieving snapshots from persistence, either to find the next pending node to run (`load_next`) or to retrieve the entire history of a graph run (`load_all`).
*   **Type Management**: Providing mechanisms to inform the persistence layer about the types of the graph's state and run end, which can be used for serialization and deserialization purposes (e.g., creating Pydantic `TypeAdapter` instances).

By defining these abstract methods, the `base_persistence_interface` ensures that any persistence backend (like file-based or in-memory) can be seamlessly integrated with the `pydantic_graph` framework, promoting modularity and interchangeability of storage solutions.

### Architecture and Component Relationships

The `base_persistence_interface` module centers around the `BaseStatePersistence` abstract base class. This class serves as the blueprint for all state persistence implementations.

**Key Components:**

*   **`BaseStatePersistence`**: The core abstract class defining the contract for state persistence. It's generic, allowing it to work with different `StateT` (graph state type) and `RunEndT` (run end result type).

**Relationships:**

*   **Implementations**: Concrete persistence modules like [file_state_persistence](file_state_persistence.md) and [in_memory_state_persistence](in_memory_state_persistence.md) inherit from and implement the abstract methods defined in `BaseStatePersistence`.
*   **Graph Interaction**: `BaseStatePersistence` interacts directly with components from the [pydantic_graph_core](pydantic_graph_core.md) module, particularly `Graph` (to get node types and structure) and `BaseNode` (to represent individual steps in the graph).
*   **Data Models**: While not explicitly defined in this module's core component code, the docstrings refer to `NodeSnapshot`, `EndSnapshot`, and `Snapshot` data models. These are implicitly part of the persistence data structure, likely defined elsewhere within the `pydantic_graph.persistence` package, which concrete implementations would use.
*   **Type Adapters**: The `set_types` method hints at a dependency on the `pydantic` library for creating `TypeAdapter` instances to handle serialization/deserialization of graph states and run end types.

### How the Module Fits into the Overall System

The `base_persistence_interface` module is a critical infrastructural component within `pydantic_graph.persistence`. It provides the necessary abstraction layer that allows the `pydantic_graph` core to interact with various persistence backends uniformly.

In the broader `pydantic_graph` system, this module enables:

*   **Durable Execution**: By defining how graph states are saved, it facilitates the interruption and resumption of long-running graph computations.
*   **Debugging and Observability**: Snapshots and run records provide a historical trace of a graph's execution, invaluable for debugging, auditing, and understanding complex workflows.

*   **Flexibility**: Developers can easily swap out persistence strategies (e.g., from in-memory for testing to a file system or database for production) by simply using a different concrete implementation of `BaseStatePersistence`.

It acts as the "plug-in" point for persistence solutions, ensuring that the core graph execution logic remains decoupled from the specifics of data storage.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "BaseStatePersistence", "label": "BaseStatePersistence (Abstract Class)", "type": "component", "link": null},
        {"id": "snapshot_node_method", "label": "snapshot_node()", "type": "component", "link": null},
        {"id": "snapshot_node_if_new_method", "label": "snapshot_node_if_new()", "type": "component", "link": null},
        {"id": "snapshot_end_method", "label": "snapshot_end()", "type": "component", "link": null},
        {"id": "record_run_method", "label": "record_run()", "type": "component", "link": null},
        {"id": "load_next_method", "label": "load_next()", "type": "component", "link": null},
        {"id": "load_all_method", "label": "load_all()", "type": "component", "link": null},
        {"id": "set_graph_types_method", "label": "set_graph_types()", "type": "component", "link": null},
        {"id": "should_set_types_method", "label": "should_set_types()", "type": "component", "link": null},
        {"id": "set_types_method", "label": "set_types()", "type": "component", "link": null},
        {"id": "file_state_persistence", "label": "FileStatePersistence", "type": "external", "link": "file_state_persistence.md"},
        {"id": "in_memory_state_persistence", "label": "FullStatePersistence", "type": "external", "link": "in_memory_state_persistence.md"},
        {"id": "pydantic_graph_core", "label": "pydantic_graph_core", "type": "external", "link": "pydantic_graph_core.md"},
        {"id": "pydantic", "label": "Pydantic Library", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "BaseStatePersistence", "target": "snapshot_node_method"},
        {"source": "BaseStatePersistence", "target": "snapshot_node_if_new_method"},
        {"source": "BaseStatePersistence", "target": "snapshot_end_method"},
        {"source": "BaseStatePersistence", "target": "record_run_method"},
        {"source": "BaseStatePersistence", "target": "load_next_method"},
        {"source": "BaseStatePersistence", "target": "load_all_method"},
        {"source": "BaseStatePersistence", "target": "set_graph_types_method"},
        {"source": "BaseStatePersistence", "target": "should_set_types_method"},
        {"source": "BaseStatePersistence", "target": "set_types_method"},
        {"source": "file_state_persistence", "target": "BaseStatePersistence", "label": "implements"},
        {"source": "in_memory_state_persistence", "target": "BaseStatePersistence", "label": "implements"},
        {"source": "BaseStatePersistence", "target": "pydantic_graph_core", "label": "uses (Graph, BaseNode)"},
        {"source": "BaseStatePersistence", "target": "pydantic", "label": "uses (TypeAdapter)"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    BaseStatePersistence[BaseStatePersistence (Abstract Class)]
    snapshot_node_method[snapshot_node()]
    snapshot_node_if_new_method[snapshot_node_if_new()]
    snapshot_end_method[snapshot_end()]
    record_run_method[record_run()]
    load_next_method[load_next()]
    load_all_method[load_all()]
    set_graph_types_method[set_graph_types()]
    should_set_types_method[should_set_types()]
    set_types_method[set_types()]
    file_state_persistence[FileStatePersistence]
    in_memory_state_persistence[FullStatePersistence]
    pydantic_graph_core[pydantic_graph_core]
    pydantic[Pydantic Library]
    BaseStatePersistence --> snapshot_node_method
    BaseStatePersistence --> snapshot_node_if_new_method
    BaseStatePersistence --> snapshot_end_method
    BaseStatePersistence --> record_run_method
    BaseStatePersistence --> load_next_method
    BaseStatePersistence --> load_all_method
    BaseStatePersistence --> set_graph_types_method
    BaseStatePersistence --> should_set_types_method
    BaseStatePersistence --> set_types_method
    file_state_persistence -- implements --> BaseStatePersistence
    in_memory_state_persistence -- implements --> BaseStatePersistence
    BaseStatePersistence -- uses (Graph, BaseNode) --> pydantic_graph_core
    BaseStatePersistence -- uses (TypeAdapter) --> pydantic
```