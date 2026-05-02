# Example Datasets
This module provides access to a collection of common datasets, including interactive environments like AlfWorld and mathematical reasoning benchmarks such as GSM8K and MATH, facilitating diverse program evaluation.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "alfworld_dataset", "label": "AlfWorld Dataset", "type": "module", "link": "alfworld_dataset.md"},
        {"id": "math_datasets", "label": "Math Benchmarks", "type": "module", "link": "math_datasets.md"},
        {"id": "external_data_source", "label": "External Data Sources", "type": "external"}
    ],
    "edges": [
        {"source": "external_data_source", "target": "alfworld_dataset", "label": "provides data"},
        {"source": "external_data_source", "target": "math_datasets", "label": "provides data"}
    ],
    "groups": [
        {"id": "data_sources", "label": "Data Sources", "role": "data", "nodes": ["external_data_source"]},
        {"id": "example_datasets_group", "label": "Example Datasets", "role": "analytical", "nodes": ["alfworld_dataset", "math_datasets"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph data_sources["Data Sources"]
        external_data_source[("External Data Sources")]
    end

    subgraph example_datasets_group["Example Datasets"]
        alfworld_dataset["AlfWorld Dataset"]
        math_datasets["Math Benchmarks"]
    end

    external_data_source -->|"provides data"| alfworld_dataset
    external_data_source -->|"provides data"| math_datasets

    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class external_data_source data
    class alfworld_dataset,math_datasets analytical

    click alfworld_dataset "alfworld_dataset.md"
    click math_datasets "math_datasets.md"
```