# Core Retrieval Mechanics

This module defines the fundamental components for querying a configured Retrieval Model (RM) to fetch relevant passages from a corpus, handling the input query and formatting the retrieved results.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "query_input", "label": "Incoming Query", "type": "data", "link": null},
        {"id": "retrieve_module", "label": "Retrieve", "type": "component", "link": null},
        {"id": "rm_interface", "label": "Retrieval Model (RM) Interface", "type": "external", "link": "retrievers.md"},
        {"id": "process_passages", "label": "Process Passages", "type": "component", "link": null},
        {"id": "output_passages", "label": "Output Passages (Prediction)", "type": "data", "link": null}
    ],
    "edges": [
        {"source": "query_input", "target": "retrieve_module", "label": "search query"},
        {"source": "retrieve_module", "target": "rm_interface", "label": "delegates query to", "type": "dashed"},
        {"source": "rm_interface", "target": "retrieve_module", "label": "returns raw passages"},
        {"source": "retrieve_module", "target": "process_passages", "label": "formats retrieved passages"},
        {"source": "process_passages", "target": "output_passages", "label": "final formatted output"}
    ],
    "groups": [
        {"id": "retrieval_flow", "label": "Retrieval Pipeline", "role": "analytical", "nodes": ["retrieve_module", "process_passages"]}
    ]
}
-->

```mermaid
flowchart TD
    query_input[("Incoming Query")]
    output_passages[("Output Passages (Prediction)")]

    subgraph retrieval_flow["Retrieval Pipeline"]
        retrieve_module["Retrieve"]
        process_passages["Process Passages"]
    end

    rm_interface["Retrieval Model (RM) Interface"]

    query_input -->|'''search query'''| retrieve_module
    retrieve_module -.->|'''delegates query to'''| rm_interface
    rm_interface -->|'''returns raw passages'''| retrieve_module
    retrieve_module -->|'''formats retrieved passages'''| process_passages
    process_passages -->|'''final formatted output'''| output_passages

    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef external fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class query_input,output_passages data
    class retrieve_module,process_passages analytical
    class rm_interface external

    click rm_interface "retrievers.md" "View Retrieval Model Interface"
```