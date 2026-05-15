# Flow Execution and Visualization
This module provides core functionalities for asynchronously executing agent flows and generating interactive visualizations of their underlying structure, enabling better understanding and debugging.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "part_7",
            "label": "Flow Execution and Visualization",
            "type": "module"
        },
        {
            "id": "flow_ops",
            "label": "Flow Operations",
            "type": "module",
            "link": "flow_execution_and_visualization.md"
        },
        {
            "id": "event_system",
            "label": "Event Management System",
            "type": "external"
        },
        {
            "id": "html_renderer",
            "label": "HTML Visualization Renderer",
            "type": "external"
        },
        {
            "id": "async_executor",
            "label": "Asynchronous Flow Executor",
            "type": "external"
        },
        {
            "id": "flow_execution_and_visualization",
            "label": "Flow Execution and Visualization",
            "type": "module",
            "link": "flow_execution_and_visualization.md"
        }
    ],
    "edges": [
        {
            "source": "flow_ops",
            "target": "event_system",
            "label": "emits plot events"
        },
        {
            "source": "flow_ops",
            "target": "html_renderer",
            "label": "generates visualization"
        },
        {
            "source": "flow_ops",
            "target": "async_executor",
            "label": "runs flow asynchronously"
        },
        {
            "source": "part_7",
            "target": "flow_execution_and_visualization"
        }
    ],
    "groups": [
        {
            "id": "core_logic",
            "label": "Core Logic",
            "role": "analytical",
            "nodes": [
                "flow_ops"
            ]
        },
        {
            "id": "data_flow",
            "label": "Data Flow",
            "role": "data",
            "nodes": [
                "event_system"
            ]
        },
        {
            "id": "output_gen",
            "label": "Output Generation",
            "role": "generative",
            "nodes": [
                "html_renderer"
            ]
        },
        {
            "id": "execution",
            "label": "Execution Engine",
            "role": "analytical",
            "nodes": [
                "async_executor"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph core_logic["Core Logic"]
        flow_ops["Flow Operations"]
    end

    subgraph data_flow["Data Flow"]
        event_system["Event Management System"]
    end

    subgraph output_gen["Output Generation"]
        html_renderer["HTML Visualization Renderer"]
    end

    subgraph execution["Execution Engine"]
        async_executor["Asynchronous Flow Executor"]
    end

    flow_ops -->|"emits plot events"| event_system
    flow_ops -->|"generates visualization"| html_renderer
    flow_ops -->|"runs flow asynchronously"| async_executor

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class flow_ops analytical
    class event_system data
    class html_renderer generative
    class async_executor analytical

    click flow_ops "flow_execution_and_visualization.md"
```