# node_abstractions

The `node_abstractions` module provides the fundamental building blocks for defining nodes within the `pydantic_graph` framework. It centers around the `BaseNode` abstract class, which serves as the base for all executable units in a graph. This module is critical for structuring the logic and flow of graph operations by defining how individual steps are executed and how they connect to subsequent steps or terminate the graph.

## Core Functionality

The primary component of this module is the `BaseNode` abstract class.

### `BaseNode`

The `BaseNode` class is an abstract base class that defines the interface for all nodes in a graph. Subclasses must implement the `run` method, which encapsulates the node's specific logic.

*   **`run(self, ctx: GraphRunContext[StateT, DepsT]) -> BaseNode[StateT, DepsT, Any] | End[NodeRunEndT]`**:
    This abstract method is the core of any node. It defines the execution logic of the node and must return either the next `BaseNode` to be executed or an `End` signal to terminate the graph's execution. The return types are crucial as they are used at runtime by `pydantic_graph` to determine valid transitions in the graph.

*   **`get_node_id(cls) -> str`**:
    A class method that returns a unique identifier for the node, typically its class name.

*   **`get_note(cls) -> str | None`**:
    Returns a descriptive note for the node, which can be rendered in Mermaid diagrams. By default, it uses the class's docstring if `docstring_notes` is enabled.

*   **`get_node_def(cls, local_ns: dict[str, Any] | None) -> NodeDef[StateT, DepsT, NodeRunEndT]`**:
    Analyzes the `run` method's return type hints to determine the possible next nodes and termination conditions. It constructs a `NodeDef` object that contains information about the node, its ID, notes, and the edges leading to subsequent nodes or an end state. This method leverages type introspection utilities to correctly parse return types.

*   **`get_snapshot_id(self) -> str` and `set_snapshot_id(self, snapshot_id: str) -> None`**:
    Methods for managing a unique snapshot ID for each node instance, used for tracking and persistence within the graph's execution.

*   **`deep_copy(self) -> Self`**:
    Provides a way to create a deep copy of the node instance.

## Architecture and Component Relationships

The `node_abstractions` module, with `BaseNode` at its center, forms the foundation upon which graphs are built and executed.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "base_node", "label": "BaseNode", "type": "component", "link": null},
        {"id": "run_method", "label": "run()", "type": "component", "link": null},
        {"id": "get_node_def_method", "label": "get_node_def()", "type": "component", "link": null},
        {"id": "graph_run_context", "label": "GraphRunContext", "type": "external", "link": "graph_execution.md"},
        {"id": "graph_definition", "label": "Graph Definition", "type": "external", "link": "graph_definition.md"},
        {"id": "graph_execution", "label": "Graph Execution", "type": "external", "link": "graph_execution.md"},
        {"id": "type_introspection", "label": "Type Introspection", "type": "external", "link": "type_introspection.md"}
    ],
    "edges": [
        {"source": "base_node", "target": "run_method"},
        {"source": "base_node", "target": "get_node_def_method"},
        {"source": "run_method", "target": "graph_run_context", "label": "uses"},
        {"source": "get_node_def_method", "target": "type_introspection", "label": "uses"},
        {"source": "graph_definition", "target": "base_node", "label": "defines nodes"},
        {"source": "graph_execution", "target": "run_method", "label": "executes"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    base_node[BaseNode]
    run_method[run()]
    get_node_def_method[get_node_def()]
    graph_run_context[GraphRunContext]
    graph_definition[Graph Definition]
    graph_execution[Graph Execution]
    type_introspection[Type Introspection]
    base_node --> run_method
    base_node --> get_node_def_method
    run_method -- uses --> graph_run_context
    get_node_def_method -- uses --> type_introspection
    graph_definition -- defines nodes --> base_node
    graph_execution -- executes --> run_method
```

*   **`BaseNode`** acts as the blueprint for all custom nodes. Its abstract `run` method is the entry point for node-specific logic.
*   The `get_node_def` method relies on type introspection, linking to the [type_introspection.md](type_introspection.md) module, to dynamically understand the graph's potential execution paths based on the `run` method's return annotations.
*   `BaseNode` instances are composed by the [graph_definition.md](graph_definition.md) module to construct the overall graph structure.
*   During graph execution, the [graph_execution.md](graph_execution.md) module orchestrates the calling of `BaseNode`'s `run` method, providing a `GraphRunContext` for state and dependencies.

## How the Module Fits into the Overall System

The `node_abstractions` module is a core component of `pydantic_graph_core`, providing the essential building blocks for defining the behavior of individual steps within an AI agent's execution flow. By extending `BaseNode`, developers can create custom graph nodes that encapsulate specific tasks, tools, or decision points. This modular approach allows for flexible and extensible graph definitions, enabling complex AI workflows to be constructed and executed. It directly supports the definition of agents and their interaction logic within the broader `pydantic_ai_agent_core` framework.

Developers who wish to create custom nodes for their graphs will primarily interact with and extend the `BaseNode` class. This module ensures consistency and proper wiring of nodes within the graph runtime.
