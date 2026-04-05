# Swin Models Documentation

The `swin_models` module provides implementations and utilities for Swin Transformer models, primarily focusing on checkpoint conversion for integration with the Hugging Face ecosystem. This module facilitates the use of pre-trained Swin models from various sources for tasks such as masked image modeling and image classification.

## Architecture Overview

The `swin_models` module is structured around its core utility for converting model checkpoints. The primary sub-module handles the conversion logic from external formats into the PyTorch models compatible with the Hugging Face Transformers library.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "checkpoint_conversion_utilities", "label": "Swin Checkpoint Conversion Utilities", "type": "module", "link": "checkpoint_conversion_utilities.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    checkpoint_conversion_utilities[Swin Checkpoint Conversion Utilities]
    click checkpoint_conversion_utilities "checkpoint_conversion_utilities.md" "View Swin Checkpoint Conversion Utilities"
```

## Sub-modules

### [Swin Checkpoint Conversion Utilities](checkpoint_conversion_utilities.md)

This sub-module contains the essential functions for converting Swin Transformer model checkpoints. It supports conversion from different sources like SimMIM and timm, adapting them for use with Hugging Face PyTorch models for various downstream tasks.