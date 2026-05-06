# Dataset Management

This module provides essential tools for managing and preparing datasets for DSPy programs, including functionalities for loading data from diverse sources and splitting it for training and evaluation.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "dataset_management",
            "label": "Dataset Management",
            "type": "module"
        },
        {
            "id": "dataset_operations",
            "label": "Dataset Operations",
            "type": "module",
            "link": "dataset_operations.md"
        }
    ],
    "edges": [],
    "groups": [
        {
            "id": "data_handling",
            "label": "Data Handling",
            "role": "data",
            "nodes": [
                "dataset_operations"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph data_handling["Data Handling"]
        dataset_operations["Dataset Operations"]
    end
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    class dataset_operations data
    click dataset_operations "dataset_operations.md"
```