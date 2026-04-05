# `video_model_core` Module Documentation

## Introduction

- The `video_model_core` module, centered around the `Sam2VideoModel` class, provides the core functionality for video object segmentation. It is designed to track and segment objects across video frames, supporting both streamed inference and full video propagation. The module integrates various components for vision encoding, prompt encoding, mask decoding, and a sophisticated memory mechanism to maintain object consistency over time.

## Architecture and Core Components

The `Sam2VideoModel` orchestrates the entire video segmentation process. It leverages a vision encoder to extract image features, a prompt encoder to process user inputs (points, boxes, masks), and a mask decoder to generate segmentation masks. A crucial aspect of this module is its temporal memory system, which uses `Sam2VideoMemoryAttention` and `Sam2VideoMemoryEncoder` to incorporate information from previous frames, enabling robust object tracking.

### `Sam2VideoModel`

The `Sam2VideoModel` is the primary class in this module. It is responsible for:

*   **Initialization**: Setting up the vision encoder, prompt encoder, mask decoder, and memory components based on the provided configuration.
*   **Image Embeddings**: Extracting visual features from video frames using its `vision_encoder`.
*   **Prompt Embeddings**: Encoding user-provided prompts (points, labels, boxes, masks) into sparse and dense embeddings.
*   **Streaming Inference (`forward`)**: Propagating objects through a video frame by frame, managing the inference session, and updating object memories.
*   **Video Propagation (`propagate_in_video_iterator`)**: Providing an iterator for processing an entire video sequence, handling frame-by-frame segmentation and memory updates.
*   **Memory Management**: Utilizing internal memory attention and encoding mechanisms to leverage temporal information for consistent object tracking.

### Key Internal Components

*   **`vision_encoder`**: An `AutoModel` instance responsible for generating multi-scale image features from input pixel values. It produces Feature Pyramid Network (FPN) hidden states and positional encodings.
*   **`prompt_encoder`**: An instance of `Sam2VideoPromptEncoder` that converts various user prompts (points, labels, boxes, masks) into embeddings suitable for the mask decoder.
*   **`mask_decoder`**: An instance of `Sam2VideoMaskDecoder` that takes image embeddings, positional embeddings, and prompt embeddings to produce low-resolution segmentation masks, IoU scores, and object output tokens.
*   **`memory_attention`**: An instance of `Sam2VideoMemoryAttention` that fuses current frame visual features with temporal memory from previous frames, crucial for consistent object tracking.
*   **`memory_encoder`**: An instance of `Sam2VideoMemoryEncoder` which encodes the current frame's image features and predicted masks into memory features, to be used in subsequent frames.

### External Dependencies

*   **`Sam2VideoConfig`**: Provides the configuration parameters for the model.
*   **`Sam2VideoPreTrainedModel`**: The base class from which `Sam2VideoModel` inherits, providing common functionalities for pre-trained models.
*   **`Sam2VideoInferenceSession`**: An external utility class that manages the video frames, object data, and caching during inference.
*   **`Sam2VideoSegmentationOutput`**: The data structure used to return the segmentation results.
*   **`Sam2VideoVisionEncoderOutput`**: The data structure for outputs from the vision encoder.

## Module Relationships

The `video_model_core` module is a crucial part of the `sam2_video_models` ecosystem. It acts as the central processing unit for video object segmentation, relying on configuration defined by `Sam2VideoConfig` and utility provided by `Sam2VideoInferenceSession`.

## Diagrams

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "sam2_video_model", "label": "Sam2VideoModel", "type": "component", "link": null},
        {"id": "vision_encoder", "label": "vision_encoder (AutoModel)", "type": "component", "link": null},
        {"id": "prompt_encoder", "label": "Sam2VideoPromptEncoder", "type": "component", "link": null},
        {"id": "mask_decoder", "label": "Sam2VideoMaskDecoder", "type": "component", "link": null},
        {"id": "memory_attention", "label": "Sam2VideoMemoryAttention", "type": "component", "link": null},
        {"id": "memory_encoder", "label": "Sam2VideoMemoryEncoder", "type": "component", "link": null},
        {"id": "inference_session", "label": "Sam2VideoInferenceSession", "type": "external", "link": "sam2_video_models.md"},
        {"id": "config", "label": "Sam2VideoConfig", "type": "external", "link": "sam2_video_models.md"},
        {"id": "image_embeddings", "label": "Image Embeddings", "type": "component", "link": null},
        {"id": "prompt_embeddings", "label": "Prompt Embeddings", "type": "component", "link": null},
        {"id": "segmentation_output", "label": "Sam2VideoSegmentationOutput", "type": "external", "link": "sam2_video_models.md"},
        {"id": "video_frame", "label": "Video Frame", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "video_frame", "target": "sam2_video_model", "label": "Input"},
        {"source": "sam2_video_model", "target": "vision_encoder", "label": "Extract Features"},
        {"source": "vision_encoder", "target": "image_embeddings", "label": "Outputs"},
        {"source": "sam2_video_model", "target": "prompt_encoder", "label": "Encode Prompts"},
        {"source": "prompt_encoder", "target": "prompt_embeddings", "label": "Outputs"},
        {"source": "image_embeddings", "target": "mask_decoder", "label": "Image Features"},
        {"source": "prompt_embeddings", "target": "mask_decoder", "label": "Prompt Features"},
        {"source": "mask_decoder", "target": "segmentation_output", "label": "Outputs Masks/Scores"},
        {"source": "sam2_video_model", "target": "memory_attention", "label": "Utilizes"},
        {"source": "sam2_video_model", "target": "memory_encoder", "label": "Utilizes"},
        {"source": "memory_encoder", "target": "inference_session", "label": "Updates Memory"},
        {"source": "inference_session", "target": "memory_attention", "label": "Provides Memory"},
        {"source": "sam2_video_model", "target": "inference_session", "label": "Manages Session"},
        {"source": "config", "target": "sam2_video_model", "label": "Configures"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    video_frame[Video Frame]
    sam2_video_model[Sam2VideoModel]
    vision_encoder[vision_encoder (AutoModel)]
    prompt_encoder[Sam2VideoPromptEncoder]
    mask_decoder[Sam2VideoMaskDecoder]
    memory_attention[Sam2VideoMemoryAttention]
    memory_encoder[Sam2VideoMemoryEncoder]
    inference_session[Sam2VideoInferenceSession]
    config[Sam2VideoConfig]
    image_embeddings[Image Embeddings]
    prompt_embeddings[Prompt Embeddings]
    segmentation_output[Sam2VideoSegmentationOutput]

    video_frame --> sam2_video_model
    sam2_video_model --> vision_encoder
    vision_encoder --> image_embeddings
    sam2_video_model --> prompt_encoder
    prompt_encoder --> prompt_embeddings
    image_embeddings --> mask_decoder
    prompt_embeddings --> mask_decoder
    mask_decoder --> segmentation_output
    sam2_video_model --> memory_attention
    sam2_video_model --> memory_encoder
    memory_encoder --> inference_session
    inference_session --> memory_attention
    sam2_video_model --> inference_session
    config --> sam2_video_model
```
