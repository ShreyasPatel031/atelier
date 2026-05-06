# Image Processors
This module centralizes image processing functionalities, offering both general-purpose utilities and specialized processors tailored for various models to handle diverse image transformations and prepare data for model inference.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "core_image_utilities",
            "label": "Core Image Utilities",
            "type": "module",
            "link": "core_image_utilities.md"
        },
        {
            "id": "model_specific_processors",
            "label": "Model-Specific Processors",
            "type": "module",
            "link": "model_specific_processors.md"
        }
    ],
    "edges": [
        {
            "source": "core_image_utilities",
            "target": "model_specific_processors",
            "label": "provides base functionality"
        }
    ],
    "groups": [
        {
            "id": "foundations",
            "label": "Foundational Processing",
            "role": "analytical",
            "nodes": [
                "core_image_utilities"
            ]
        },
        {
            "id": "specialized_implementations",
            "label": "Specialized Implementations",
            "role": "generative",
            "nodes": [
                "model_specific_processors"
            ]
        }
    ]
}
-->

```mermaid
flowchart TD
    subgraph foundations["Foundational Processing"]
        core_image_utilities["Core Image Utilities"]
    end
    subgraph specialized_implementations["Specialized Implementations"]
        model_specific_processors["Model-Specific Processors"]
    end
    core_image_utilities -->|'''provides base functionality'''| model_specific_processors

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class core_image_utilities analytical
    class model_specific_processors generative

    click core_image_utilities "core_image_utilities.md"
    click model_specific_processors "model_specific_processors.md"
```