# Module: `conditional_detr_image_processing`

The `conditional_detr_image_processing` module is dedicated to handling the specialized image preprocessing and post-processing requirements for Conditional DETR models. It provides a robust set of functionalities to prepare raw image data and annotations for model inference and training, and to interpret the raw outputs of the models into structured, human-readable results for various computer vision tasks.

## Core Functionality

The primary component of this module is the `ConditionalDetrImageProcessorPil` class. This processor is responsible for:

1.  **Image Preprocessing**: Applying a series of transformations to input images, including resizing, rescaling, normalization, and padding, to meet the input specifications of Conditional DETR models.
2.  **Annotation Preparation**: Converting and adjusting various annotation formats (e.g., COCO detection, COCO panoptic) to align with the transformations applied to the images, ensuring consistency between image and annotation data.
3.  **Model Output Post-processing**: Interpreting the raw logits and predicted masks from Conditional DETR models into final predictions for:
    *   Object Detection: Bounding box predictions with scores and labels.
    *   Semantic Segmentation: Pixel-wise classification of image regions into semantic categories.
    *   Instance Segmentation: Identifying and segmenting individual objects within an image.
    *   Panoptic Segmentation: A unified approach combining semantic and instance segmentation.

## Architecture and Component Relationships

The `ConditionalDetrImageProcessorPil` class extends the `PilBackend` from the [image_utilities](image_utilities.md) module, leveraging its foundational image manipulation capabilities. It encapsulates a comprehensive workflow for both preparing inputs and processing outputs for Conditional DETR models.

The `preprocess` method acts as the orchestrator for input preparation, sequentially calling specialized methods for annotation handling, image resizing, normalization, and padding. Each of these steps also ensures that the corresponding annotations are correctly adjusted.

For post-processing, the module provides distinct methods for different segmentation and detection tasks. These methods take the raw outputs from the [Conditional DETR models](conditional_detr_models.md) and apply logic to convert them into meaningful results, often involving resizing predictions back to the original image dimensions, applying score thresholds, and resolving mask overlaps.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "conditional_detr_image_processor_pil", "label": "ConditionalDetrImageProcessorPil", "type": "component", "link": null},
        {"id": "init", "label": "__init__", "type": "component", "link": null},
        {"id": "prepare_annotation", "label": "prepare_annotation", "type": "component", "link": null},
        {"id": "resize_img", "label": "resize (Image)", "type": "component", "link": null},
        {"id": "resize_anno", "label": "resize_annotation", "type": "component", "link": null},
        {"id": "normalize_anno", "label": "normalize_annotation", "type": "component", "link": null},
        {"id": "update_anno_padded", "label": "_update_annotation_for_padded_image", "type": "component", "link": null},
        {"id": "pad_img", "label": "pad", "type": "component", "link": null},
        {"id": "preprocess", "label": "preprocess", "type": "component", "link": null},
        {"id": "_preprocess", "label": "_preprocess", "type": "component", "link": null},
        {"id": "post_obj_det", "label": "post_process_object_detection", "type": "component", "link": null},
        {"id": "post_sem_seg", "label": "post_process_semantic_segmentation", "type": "component", "link": null},
        {"id": "post_inst_seg", "label": "post_process_instance_segmentation", "type": "component", "link": null},
        {"id": "post_pan_seg", "label": "post_process_panoptic_segmentation", "type": "component", "link": null},
        {"id": "pil_backend", "label": "PilBackend", "type": "external", "link": "image_utilities.md"},
        {"id": "conditional_detr_models_module", "label": "Conditional DETR Models", "type": "external", "link": "conditional_detr_models.md"},
        {"id": "image_utilities_module", "label": "Image Utility Functions", "type": "external", "link": "image_utilities.md"},
        {"id": "numpy", "label": "NumPy", "type": "external", "link": null},
        {"id": "pytorch", "label": "PyTorch", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "conditional_detr_image_processor_pil", "target": "init"},
        {"source": "conditional_detr_image_processor_pil", "target": "preprocess"},
        {"source": "conditional_detr_image_processor_pil", "target": "post_obj_det"},
        {"source": "conditional_detr_image_processor_pil", "target": "post_sem_seg"},
        {"source": "conditional_detr_image_processor_pil", "target": "post_inst_seg"},
        {"source": "conditional_detr_image_processor_pil", "target": "post_pan_seg"},
        {"source": "conditional_detr_image_processor_pil", "target": "numpy"},
        {"source": "conditional_detr_image_processor_pil", "target": "pytorch"},
        {"source": "conditional_detr_image_processor_pil", "target": "pil_backend"},
        {"source": "preprocess", "target": "_preprocess"},
        {"source": "_preprocess", "target": "prepare_annotation"},
        {"source": "_preprocess", "target": "resize_img"},
        {"source": "_preprocess", "target": "resize_anno"},
        {"source": "_preprocess", "target": "normalize_anno"},
        {"source": "_preprocess", "target": "pad_img"},
        {"source": "pad_img", "target": "update_anno_padded"},
        {"source": "post_obj_det", "target": "conditional_detr_models_module"},
        {"source": "post_sem_seg", "target": "conditional_detr_models_module"},
        {"source": "post_inst_seg", "target": "conditional_detr_models_module"},
        {"source": "post_pan_seg", "target": "conditional_detr_models_module"},
        {"source": "prepare_annotation", "target": "image_utilities_module"},
        {"source": "resize_img", "target": "image_utilities_module"},
        {"source": "resize_anno", "target": "image_utilities_module"},
        {"source": "normalize_anno", "target": "image_utilities_module"},
        {"source": "pad_img", "target": "image_utilities_module"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    conditional_detr_image_processor_pil[ConditionalDetrImageProcessorPil]
    init[__init__]
    prepare_annotation[prepare_annotation]
    resize_img[resize (Image)]
    resize_anno[resize_annotation]
    normalize_anno[normalize_annotation]
    update_anno_padded[_update_annotation_for_padded_image]
    pad_img[pad]
    preprocess[preprocess]
    _preprocess[_preprocess]
    post_obj_det[post_process_object_detection]
    post_sem_seg[post_process_semantic_segmentation]
    post_inst_seg[post_process_instance_segmentation]
    post_pan_seg[post_process_panoptic_segmentation]
    pil_backend[PilBackend]:::external
    conditional_detr_models_module[Conditional DETR Models]:::external
    image_utilities_module[Image Utility Functions]:::external
    numpy[NumPy]:::external
    pytorch[PyTorch]:::external

    conditional_detr_image_processor_pil --> init
    conditional_detr_image_processor_pil --> preprocess
    conditional_detr_image_processor_pil --> post_obj_det
    conditional_detr_image_processor_pil --> post_sem_seg
    conditional_detr_image_processor_pil --> post_inst_seg
    conditional_detr_image_processor_pil --> post_pan_seg
    conditional_detr_image_processor_pil --> numpy
    conditional_detr_image_processor_pil --> pytorch
    conditional_detr_image_processor_pil --|> pil_backend
    preprocess --> _preprocess
    _preprocess --> prepare_annotation
    _preprocess --> resize_img
    _preprocess --> resize_anno
    _preprocess --> normalize_anno
    _preprocess --> pad_img
    pad_img --> update_anno_padded
    post_obj_det --> conditional_detr_models_module
    post_sem_seg --> conditional_detr_models_module
    post_inst_seg --> conditional_detr_models_module
    post_pan_seg --> conditional_detr_models_module
    prepare_annotation --> image_utilities_module
    resize_img --> image_utilities_module
    resize_anno --> image_utilities_module
    normalize_anno --> image_utilities_module
    pad_img --> image_utilities_module

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```
