# Flow Analysis Module

This module provides essential utilities for dissecting, visualizing, and diagnosing the execution flow of CrewAI agents. It encompasses tools for understanding the internal graph structure, extracting crucial information from method definitions using AST visitors, and presenting the flow visually through interactive plots.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "graph_utilities", "label": "Flow Graph Utilities", "type": "module", "link": "graph_utilities.md"},
        {"id": "ast_visitors", "label": "AST Analysis Visitors", "type": "module", "link": "ast_visitors.md"},
        {"id": "flow_visualization", "label": "Flow Visualization", "type": "module", "link": "flow_visualization.md"},
        {"id": "tracing_diagnostics", "label": "Tracing Diagnostics", "type": "module", "link": "tracing_diagnostics.md"},
        {"id": "flow_definition_external", "label": "Flow Definition (External)", "type": "external"},
        {"id": "user", "label": "User", "type": "external"}
    ],
    "edges": [
        {"source": "flow_definition_external", "target": "graph_utilities", "label": "defines structure"},
        {"source": "flow_definition_external", "target": "ast_visitors", "label": "defines methods"},
        {"source": "graph_utilities", "target": "flow_visualization", "label": "structural data"},
        {"source": "ast_visitors", "target": "flow_visualization", "label": "method details"},
        {"source": "flow_visualization", "target": "user", "label": "interactive plot"},
        {"source": "tracing_diagnostics", "target": "user", "label": "tracing status messages"}
    ],
    "groups": [
        {"id": "analysis_core", "label": "Analysis Core", "role": "analytical", "nodes": ["graph_utilities", "ast_visitors"]},
        {"id": "output_and_feedback", "label": "Output and Feedback", "role": "surface", "nodes": ["flow_visualization", "tracing_diagnostics"]}
    ]
}
-->
```mermaid
flowchart TD
    user(("User")):::userNode

    subgraph analysis_core["Analysis Core"]
        graph_utilities["Flow Graph Utilities"]
        ast_visitors["AST Analysis Visitors"]
    end

    subgraph output_and_feedback["Output and Feedback"]
        flow_visualization["Flow Visualization"]
        tracing_diagnostics["Tracing Diagnostics"]
    end

    flow_definition_external["Flow Definition (External)"]

    flow_definition_external -->|
    defines structure
    | graph_utilities
    flow_definition_external -->|
    defines methods
    | ast_visitors
    graph_utilities -->|
    structural data
    | flow_visualization
    ast_visitors -->|
    method details
    | flow_visualization
    flow_visualization -->|
    interactive plot
    | user
    tracing_diagnostics -->|
    tracing status messages
    | user

    classDef userNode fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f

    class graph_utilities,ast_visitors analytical
    class flow_visualization,tracing_diagnostics surface

    click graph_utilities "graph_utilities.md"
    click ast_visitors "ast_visitors.md"
    click flow_visualization "flow_visualization.md"
    click tracing_diagnostics "tracing_diagnostics.md"
```