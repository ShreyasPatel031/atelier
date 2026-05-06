# Graph Definition Module

The `graph_definition` module, centered around the `Graph` class, is the core component for defining and orchestrating directed graphs within the `pydantic-graph` framework. It provides the mechanisms to structure complex workflows as a series of interconnected nodes, manage their execution, and visualize their structure.

This module is fundamental for building agent behaviors, data processing pipelines, or any system that benefits from a clear, sequential, or branching execution flow based on a defined state and dependencies.

## Key Features

*   **Node-based Graph Construction**: Define graphs by providing a sequence of `BaseNode` instances, where each node encapsulates a specific unit of work.
*   **Edge Validation**: Automatically validates the connections between nodes to ensure a coherent graph structure, preventing references to undefined nodes.
*   **Flexible Execution**: Supports both synchronous and asynchronous execution patterns, allowing integration into various application environments.
*   **Iterative Execution Control**: Provides an advanced API (`iter`) for fine-grained control over graph execution, enabling monitoring, pausing, and resuming of workflows.
*   **State Persistence Integration**: Seamlessly integrates with state persistence mechanisms (`BaseStatePersistence`) to save and restore graph execution progress.
*   **Visual Diagram Generation**: Generates Mermaid diagrams to visually represent the graph's architecture, aiding in understanding and debugging.
*   **Auto-instrumentation**: Integrates with observability tools (like Logfire) to automatically instrument graph runs and node executions, providing insights into performance and flow.

## How it Works

The `Graph` class acts as a blueprint for an executable workflow. When initialized, it takes a collection of `BaseNode` types. Each `BaseNode` defines its logic (via the `run` method) and specifies which other nodes it can transition to (its outgoing edges).

During execution, the `Graph` traverses these nodes, managing the shared `StateT` object and injecting `DepsT` dependencies into each node's `run` method. The execution continues until a node returns an `End` signal, indicating the graph's completion. The `iter` method offers a powerful way to observe and control this traversal step-by-step.

For visualization, the `Graph` can generate Mermaid syntax, allowing developers to render clear diagrams of their workflows.

## Architecture Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "graph_definition",
            "label": "Graph Definition",
            "type": "module"
        },
        {
            "id": "c0",
            "label": "Graph",
            "type": "component"
        }
    ],
    "edges": [
        {
            "source": "graph_definition",
            "target": "c0"
        }
    ],
    "groups": [],
    "_auto_generated": true
}
-->
```mermaid
flowchart TD
    %% Main Graph component
    graph_class["Graph Class"]

    %% Internal Components/Methods
    subgraph Graph Lifecycle
        init_graph["Initialize Graph"]
        run_async["Run Graph (Async)"]
        run_sync["Run Graph (Sync)"]
        iterate_graph["Iterate Graph (iter, iter_from_persistence)"]
        initialize_persistence["Initialize Persistence"]
    end

    subgraph Visualization
        generate_mermaid_code["Generate Mermaid Code"]
        generate_mermaid_image["Generate Mermaid Image/Save"]
    end

    %% External Dependencies
    base_node["BaseNode"]:::external
    graph_run["GraphRun / GraphRunResult"]:::external
    state_persistence["BaseStatePersistence"]:::external
    mermaid_utils["Mermaid Utilities"]:::external
    observability["Observability (Logfire)"]:::external

    %% Connections
    init_graph -->|"creates"| graph_class
    init_graph -->|"defines graph nodes"| base_node

    graph_class -->|"executes via"| run_async
    graph_class -->|"executes via (sync)"| run_sync
    graph_class -->|"iterates via"| iterate_graph
    graph_class -->|"prepares run via"| initialize_persistence
    graph_class -->|"visualizes via"| generate_mermaid_code
    graph_class -->|"renders/saves via"| generate_mermaid_image

    run_async -->|"starts with"| base_node
    run_async -.->|"manages state with"| state_persistence
    run_async -->|"returns"| graph_run
    run_async -.->|"instruments with"| observability

    run_sync -->|"delegates to"| run_async

    iterate_graph -->|"starts with / executes"| base_node
    iterate_graph -.->|"manages state with"| state_persistence
    iterate_graph -->|"yields"| graph_run
    iterate_graph -.->|"instruments with"| observability

    initialize_persistence -->|"stores start node"| base_node
    initialize_persistence -.->|"uses"| state_persistence

    generate_mermaid_code -->|"uses to generate code"| mermaid_utils
    generate_mermaid_image -->|"uses to render image"| mermaid_utils

    %% Styling
    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```