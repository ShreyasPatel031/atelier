# math_datasets
This module provides classes for loading and preparing mathematical reasoning datasets, specifically GSM8K and MATH, for use within the DSPy framework. It handles data fetching, preprocessing, and splitting into train, dev, and test sets.

<!-- DIAGRAM_JSON
{
  "nodes": [
    {"id": "GSM8K", "label": "GSM8K", "type": "class"},
    {"id": "MATH", "label": "MATH", "type": "class"},
    {"id": "huggingface_datasets", "label": "huggingface_datasets", "type": "library"},
    {"id": "dspy", "label": "dspy", "type": "library"},
    {"id": "math_equivalence", "label": "math_equivalence", "type": "library"}
  ],
  "edges": [
    {"source": "GSM8K", "target": "huggingface_datasets", "label": "loads data from"},
    {"source": "GSM8K", "target": "dspy", "label": "uses"},
    {"source": "MATH", "target": "huggingface_datasets", "label": "loads data from"},
    {"source": "MATH", "target": "dspy", "label": "uses"},
    {"source": "MATH", "target": "math_equivalence", "label": "uses for metric"}
  ],
  "groups": [
    {"id": "math_datasets", "label": "math_datasets", "contains": ["GSM8K", "MATH"]},
    {"id": "External Libraries", "label": "External Libraries", "contains": ["huggingface_datasets", "dspy", "math_equivalence"]}
  ]
}
-->
```mermaid
flowchart TD
    subgraph math_datasets
        GSM8K[GSM8K]
        MATH[MATH]
    end

    subgraph External Libraries
        huggingface_datasets[(huggingface_datasets)]
        dspy[(dspy)]
        math_equivalence[(math_equivalence)]
    end

    GSM8K -->|loads data from| huggingface_datasets
    GSM8K -->|uses| dspy
    MATH -->|loads data from| huggingface_datasets
    MATH -->|uses| dspy
    MATH -->|uses for metric| math_equivalence

    classDef mathDataset fill:#D2E5FF,stroke:#0066CC,stroke-width:2px;
    classDef library fill:#E0FFE0,stroke:#009900,stroke-width:2px;

    class GSM8K,MATH mathDataset
    class huggingface_datasets,dspy,math_equivalence library
```