# chunk_properties Module Documentation

## Introduction

The `chunk_properties` module, part of the `llama_cpp_mtmd_core` multimodal processing framework, provides essential utilities for querying the fundamental properties of input data chunks. Specifically, it offers functions to determine the number of tokens and positions occupied by various types of multimodal input, including text, images, and audio. This module is critical for managing memory allocation, sequence length calculations, and overall processing flow within the multimodal inference pipeline.

## Module Architecture

The `chunk_properties` module resides within `llama_cpp_mtmd_core.input_chunk_handling.chunk_metadata`. Its core components are focused on abstracting the property retrieval logic for different input types behind a unified interface.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "get_n_tokens", "label": "mtmd_input_chunk_get_n_tokens", "type": "component", "link": null},
        {"id": "get_n_pos", "label": "mtmd_input_chunk_get_n_pos", "type": "component", "link": null},
        {"id": "chunk_metadata", "label": "Chunk Metadata (mtmd_input_chunk)", "type": "external", "link": "chunk_metadata.md"},
        {"id": "clip", "label": "llama_cpp_mtmd_clip (Image Tokens)", "type": "external", "link": "llama_cpp_mtmd_clip.md"},
        {"id": "audio", "label": "llama_cpp_mtmd_audio (Audio Tokens)", "type": "external", "link": "llama_cpp_mtmd_audio.md"},
        {"id": "ggml_core", "label": "GGML Core (GGML_ABORT)", "type": "external", "link": "ggml_core.md"}
    ],
    "edges": [
        {"source": "get_n_tokens", "target": "chunk_metadata"},
        {"source": "get_n_tokens", "target": "clip"},
        {"source": "get_n_tokens", "target": "audio"},
        {"source": "get_n_tokens", "target": "ggml_core"},
        {"source": "get_n_pos", "target": "chunk_metadata"},
        {"source": "get_n_pos", "target": "clip"},
        {"source": "get_n_pos", "target": "audio"},
        {"source": "get_n_pos", "target": "ggml_core"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    get_n_tokens[mtmd_input_chunk_get_n_tokens]
    get_n_pos[mtmd_input_chunk_get_n_pos]
    chunk_metadata[Chunk Metadata (mtmd_input_chunk)]
    clip[llama_cpp_mtmd_clip (Image Tokens)]
    audio[llama_cpp_mtmd_audio (Audio Tokens)]
    ggml_core[GGML Core (GGML_ABORT)]

    get_n_tokens --> chunk_metadata
    get_n_tokens --> clip
    get_n_tokens --> audio
    get_n_tokens --> ggml_core
    get_n_pos --> chunk_metadata
    get_n_pos --> clip
    get_n_pos --> audio
    get_n_pos --> ggml_core
```

### Component Descriptions

This module contains two core functions:

1.  **`mtmd_input_chunk_get_n_tokens`**
    *   **Purpose**: Retrieves the total number of tokens for a given multimodal input chunk.
    *   **Details**: This function inspects the `type` field of the `mtmd_input_chunk` structure. Based on the type (text, image, or audio), it dispatches to the appropriate mechanism to count tokens:
        *   For text chunks, it returns the size of the `tokens_text` vector.
        *   For image chunks, it calls `mtmd_image_tokens_get_n_tokens` (from [llama_cpp_mtmd_clip](llama_cpp_mtmd_clip.md)) to get the number of image tokens.
        *   For audio chunks, it directly accesses `chunk->tokens_audio->n_tokens` (from [llama_cpp_mtmd_audio](llama_cpp_mtmd_audio.md)).
        *   An invalid chunk type results in a `GGML_ABORT` (handled by [ggml_core](ggml_core.md)).

2.  **`mtmd_input_chunk_get_n_pos`**
    *   **Purpose**: Retrieves the total number of positions occupied by a given multimodal input chunk.
    *   **Details**: Similar to `mtmd_input_chunk_get_n_tokens`, this function determines the number of positions based on the chunk's type:
        *   For text chunks, it returns the size of the `tokens_text` vector (assuming one token occupies one position).
        *   For image chunks, it calls `mtmd_image_tokens_get_n_pos` (from [llama_cpp_mtmd_clip](llama_cpp_mtmd_clip.md)) to get the number of positions for image tokens.
        *   For audio chunks, it directly accesses `chunk->tokens_audio->n_tokens` (from [llama_cpp_mtmd_audio](llama_cpp_mtmd_audio.md)), implying that each audio token also occupies one position.
        *   An invalid chunk type results in a `GGML_ABORT` (handled by [ggml_core](ggml_core.md)).

## Relationship to Overall System

This `chunk_properties` module is a fundamental part of the multimodal processing capabilities within `llama_cpp_mtmd_core`. It provides a standardized way for higher-level modules to query the size of input data without needing to know the specific internal representation of text, image, or audio data. This abstraction is crucial for tasks like:

*   **Context Management**: Determining the total sequence length for the `llama_cpp_context`.
*   **Memory Allocation**: Estimating memory requirements for processing multimodal inputs.
*   **Input Handling**: Facilitating the correct processing and integration of different modalities into a unified model input.

It depends on the definitions and helper functions provided by:

*   [chunk_metadata](chunk_metadata.md): For the `mtmd_input_chunk` structure definition.
*   [llama_cpp_mtmd_clip](llama_cpp_mtmd_clip.md): For image-specific token and position counting.
*   [llama_cpp_mtmd_audio](llama_cpp_mtmd_audio.md): For audio-specific token and position counting.
*   [ggml_core](ggml_core.md): For error handling (GGML_ABORT macro).