# Vision Models Part 4

This module encompasses models for object detection with language grounding (MMGroundingDino) and universal image segmentation (OneFormer), enabling tasks like semantic, instance, and panoptic segmentation.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "object_detection", "label": "Object Detection", "type": "module", "link": "object_detection.md"},
        {"id": "universal_segmentation", "label": "Universal Segmentation", "type": "module", "link": "universal_segmentation.md"}
    ],
    "edges": [],
    "groups": [
        {"id": "detection", "label": "Object Detection Models", "role": "generative", "nodes": ["object_detection"]},
        {"id": "segmentation", "label": "Image Segmentation Models", "role": "generative", "nodes": ["universal_segmentation"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph detection["Object Detection Models"]
        object_detection["Object Detection"]
    end
    subgraph segmentation["Image Segmentation Models"]
        universal_segmentation["Universal Segmentation"]
    end

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class object_detection,universal_segmentation generative

    click object_detection "object_detection.md"
    click universal_segmentation "universal_segmentation.md"
```