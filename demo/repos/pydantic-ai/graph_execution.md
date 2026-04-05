# Graph Execution Module

The `graph_execution` module is responsible for managing the execution of graphs defined within the Pydantic Graph framework. It provides the core mechanisms for running a graph, iterating through its nodes, handling state, and capturing the final results.

## Architecture Overview

The module is composed of two main sub-modules:

1.  **Graph Run Management**: Handles the actual process of stepping through a graph's nodes.
2.  **Graph Run Results**: Manages the output and final state once a graph run completes.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "graph_run_management", "label": "Graph Run Management", "type": "module", "link": "graph_run_management.md"},
        {"id": "graph_run_results", "label": "Graph Run Results", "type": "module", "link": "graph_run_results.md"}
    ],
    "edges": [
        {"source": "graph_run_management", "target": "graph_run_results"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    graph_run_management[Graph Run Management]
    graph_run_results[Graph Run Results]

    graph_run_management --> graph_run_results

    click graph_run_management "graph_run_management.md" "View Graph Run Management Documentation"
    click graph_run_results "graph_run_results.md" "View Graph Run Results Documentation"
```

## Sub-modules

### Graph Run Management
This sub-module, primarily implemented by the `GraphRun` component, is responsible for the dynamic execution of a graph. It allows developers to iterate over graph nodes, inspect and modify the state during execution, and manually control the flow of the graph.

For more details, refer to the [Graph Run Management](graph_run_management.md) documentation.

### Graph Run Results
This sub-module, centered around the `GraphRunResult` component, provides a structured way to access the final output and state of a completed graph run. It captures the essential information needed to understand the outcome of a graph's execution.

For more details, refer to the [Graph Run Results](graph_run_results.md) documentation.
