# Diverse Model Architectures and Converters
This module integrates a range of advanced models including Gemma for language, PPDocLayout and RTDetr for vision-based object detection, SeamlessM4Tv2 for audio-to-text, and SAM for multimodal video and text-driven image segmentation, alongside a suite of vision model conversion utilities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "gemma_language_models", "label": "Gemma Language Models", "type": "module", "link": "gemma_language_models.md"},
        {"id": "vision_object_detection", "label": "Vision Object Detection", "type": "module", "link": "vision_object_detection.md"},
        {"id": "seamless_audio_models", "label": "Seamless Audio Model", "type": "module", "link": "seamless_audio_models.md"},
        {"id": "sam_multimodal_models", "label": "SAM Multimodal Models", "type": "module", "link": "sam_multimodal_models.md"},
        {"id": "vision_model_converters", "label": "Vision Model Converters", "type": "module", "link": "vision_model_converters.md"}
    ],
    "edges": [
        {"source": "vision_object_detection", "target": "vision_model_converters", "label": "converted by"},
        {"source": "sam_multimodal_models", "target": "vision_model_converters", "label": "vision components converted by"}
    ],
    "groups": [
        {"id": "core_models_group", "label": "Core Models", "role": "surface", "nodes": ["gemma_language_models", "vision_object_detection", "seamless_audio_models", "sam_multimodal_models"]},
        {"id": "utilities_group", "label": "Model Utilities", "role": "analytical", "nodes": ["vision_model_converters"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph core_models_group["Core Models"]
        gemma_language_models[
            "Gemma Language Models"
        ]
        vision_object_detection[
            "Vision Object Detection"
        ]
        seamless_audio_models[
            "Seamless Audio Model"
        ]
        sam_multimodal_models[
            "SAM Multimodal Models"
        ]
    end

    subgraph utilities_group["Model Utilities"]
        vision_model_converters[
            "Vision Model Converters"
        ]
    end

    vision_object_detection -->|
        converted by
    | vision_model_converters
    sam_multimodal_models -->|
        vision components converted by
    | vision_model_converters

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class gemma_language_models,seamless_audio_models,sam_multimodal_models generative
    class vision_object_detection,vision_model_converters analytical

    click gemma_language_models "gemma_language_models.md" "View Gemma Language Models"
    click vision_object_detection "vision_object_detection.md" "View Vision Object Detection"
    click seamless_audio_models "seamless_audio_models.md" "View Seamless Audio Model"
    click sam_multimodal_models "sam_multimodal_models.md" "View SAM Multimodal Models"
    click vision_model_converters "vision_model_converters.md" "View Vision Model Converters"
