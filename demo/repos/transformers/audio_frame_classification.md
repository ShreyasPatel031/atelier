# Module: `audio_frame_classification`

## Introduction

The `audio_frame_classification` module provides the `Wav2Vec2ForAudioFrameClassification` model, specifically designed for audio frame classification tasks. This module leverages the powerful `Wav2Vec2Model` as its backbone, extending it with a classification head to predict labels for individual audio frames. It supports flexible training by allowing freezing of different parts of the model.

## Purpose and Core Functionality

The primary purpose of this module is to enable fine-grained classification across audio frames. This is crucial for tasks where understanding the content or characteristics of small segments of an audio signal is necessary, rather than just a single label for the entire audio clip.

The core functionality is encapsulated in the `Wav2Vec2ForAudioFrameClassification` class, which:
- Initializes a `Wav2Vec2Model` for extracting rich audio features.
- Adds a linear classification head (`nn.Linear`) on top of the `Wav2Vec2Model`'s hidden states.
- Provides methods to freeze the feature encoder or the entire base `Wav2Vec2Model` for transfer learning or fine-tuning scenarios.
- Computes classification logits and, optionally, a Cross-Entropy loss based on provided labels.
- Supports weighted sum of hidden states from different layers of the `Wav2Vec2Model` for enhanced feature representation.

## Architecture and Component Relationships

The `audio_frame_classification` module's architecture is centered around the `Wav2Vec2ForAudioFrameClassification` class, which builds upon the foundational `Wav2Vec2` architecture.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "audio_frame_classification_model", "label": "Wav2Vec2ForAudioFrameClassification", "type": "component", "link": null},
        {"id": "wav2vec2_core_model", "label": "Wav2Vec2Model Instance", "type": "component", "link": null},
        {"id": "classifier_head", "label": "nn.Linear Classifier", "type": "component", "link": null},
        {"id": "pytorch_loss_function", "label": "CrossEntropyLoss", "type": "component", "link": null},
        {"id": "wav2vec2_base_models", "label": "Wav2Vec2 Models (Base/Core)", "type": "external", "link": "wav2vec2_models.md"},
        {"id": "modeling_outputs", "label": "TokenClassifierOutput", "type": "external", "link": "modeling_utilities.md"}
    ],
    "edges": [
        {"source": "audio_frame_classification_model", "target": "wav2vec2_base_models", "label": "inherits from / uses"},
        {"source": "audio_frame_classification_model", "target": "wav2vec2_core_model", "label": "instantiates"},
        {"source": "audio_frame_classification_model", "target": "classifier_head", "label": "uses"},
        {"source": "audio_frame_classification_model", "target": "pytorch_loss_function", "label": "uses for loss"},
        {"source": "audio_frame_classification_model", "target": "modeling_outputs", "label": "returns"},
        {"source": "wav2vec2_core_model", "target": "classifier_head", "label": "outputs hidden states to"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    audio_frame_classification_model[Wav2Vec2ForAudioFrameClassification]
    wav2vec2_core_model[Wav2Vec2Model Instance]
    classifier_head[nn.Linear Classifier]
    pytorch_loss_function[CrossEntropyLoss]
    wav2vec2_base_models[Wav2Vec2 Models (Base/Core)]
    modeling_outputs[TokenClassifierOutput]

    audio_frame_classification_model -- "inherits from / uses" --> wav2vec2_base_models
    audio_frame_classification_model -- "instantiates" --> wav2vec2_core_model
    audio_frame_classification_model -- "uses" --> classifier_head
    audio_frame_classification_model -- "uses for loss" --> pytorch_loss_function
    audio_frame_classification_model -- "returns" --> modeling_outputs
    wav2vec2_core_model -- "outputs hidden states to" --> classifier_head
```

### `Wav2Vec2ForAudioFrameClassification` Class

-   **Purpose:** Extends the `Wav2Vec2` model for audio frame-level classification.
-   **Initialization:**
    -   Takes a `config` object which defines the model's architecture, including `num_hidden_layers`, `use_weighted_layer_sum`, `hidden_size`, and `num_labels`.
    -   Instantiates a `Wav2Vec2Model` as its base.
    -   Creates a linear layer (`self.classifier`) mapping the `hidden_size` of `Wav2Vec2` outputs to `num_labels`.
    -   If `config.use_weighted_layer_sum` is true, initializes `layer_weights` for combining hidden states from multiple layers.
-   **Methods:**
    -   `freeze_feature_encoder()`: Disables gradient computation for the `Wav2Vec2Model`'s feature encoder, allowing only the transformer layers and classification head to be updated.
    -   `freeze_base_model()`: Disables gradient computation for the entire `Wav2Vec2Model`, focusing updates solely on the classification head.
    -   `forward(...)`:
        -   Processes `input_values` through the internal `Wav2Vec2Model` to obtain hidden states.
        -   If `config.use_weighted_layer_sum` is enabled, computes a weighted sum of hidden states across all layers. Otherwise, uses the final hidden state.
        -   Passes the aggregated hidden states through `self.classifier` to get `logits`.
        -   If `labels` are provided, calculates the `CrossEntropyLoss` (for `num_labels > 1`) or Mean-Square loss (for `num_labels == 1`).
        -   Returns a `TokenClassifierOutput` object (or a tuple if `return_dict` is `False`), containing `loss`, `logits`, `hidden_states`, and `attentions`.

## How the module fits into the overall system

The `audio_frame_classification` module is a specialized extension within the broader [wav2vec2_models](wav2vec2_models.md) family. It provides a concrete implementation for a specific downstream task – audio frame classification – building directly on the core `Wav2Vec2` architecture.

It depends on:
-   The foundational components defined within the [wav2vec2_models](wav2vec2_models.md) module, specifically `Wav2Vec2Model` and `Wav2Vec2PreTrainedModel`.
-   Common utility structures like `TokenClassifierOutput`, which is typically part of a [modeling_utilities](modeling_utilities.md) module for standardized model outputs.

This module is designed to be easily integrated into training pipelines that require per-frame predictions from audio data, acting as a direct application layer on top of the robust `Wav2Vec2` feature extraction capabilities.

