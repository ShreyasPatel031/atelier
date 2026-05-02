# Core Image Utilities
This module provides essential utilities for image processing, offering both GPU-accelerated batched operations via Torchvision and general-purpose transformations like format conversion, resizing, and normalization for diverse image handling requirements.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "image_processing_backend", "label": "Torchvision Image Backend", "type": "module", "link": "image_processing_backend.md"},
        {"id": "image_transformation_utilities", "label": "General Image Transformations", "type": "module", "link": "image_transformation_utilities.md"}
    ],
    "edges": [
        {"source": "image_transformation_utilities", "target": "image_processing_backend", "label": "provides base transformations"}
    ],
    "groups": [
        {"id": "core_transformations", "label": "Core Transformations", "role": "analytical", "nodes": ["image_transformation_utilities"]},
        {"id": "high_performance_processing", "label": "High-Performance Processing", "role": "analytical", "nodes": ["image_processing_backend"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph core_transformations["Core Transformations"]
        image_transformation_utilities["General Image Transformations"]
    end
    subgraph high_performance_processing["High-Performance Processing"]
        image_processing_backend["Torchvision Image Backend"]
    end
    image_transformation_utilities -->|"provides base transformations"| image_processing_backend
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    class image_transformation_utilities,image_processing_backend analytical
    click image_processing_backend "image_processing_backend.md"
    click image_transformation_utilities "image_transformation_utilities.md"
```