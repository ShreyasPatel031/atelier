# `sequence_classification_model`

## Introduction

The `sequence_classification_model` module is dedicated to providing a GPT-2 model specifically adapted for sequence classification and regression tasks. It encapsulates the `GPT2ForSequenceClassification` class, which extends the base GPT-2 transformer with a classification head, enabling it to predict labels for input sequences.

## Architecture and Component Relationships

The core of this module is the `GPT2ForSequenceClassification` class. This class leverages the foundational `GPT2Model` for its transformer capabilities and adds a linear layer for the final classification or regression output. It inherits from `GPT2PreTrainedModel`, establishing its place within the broader GPT-2 model family.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "gpt2_sequence_classification", "label": "GPT2ForSequenceClassification", "type": "component", "link": null},
        {"id": "gpt2_model_internal", "label": "GPT2Model (internal transformer)", "type": "component", "link": null},
        {"id": "classification_head", "label": "Classification Head (nn.Linear)", "type": "component", "link": null},
        {"id": "gpt2_models", "label": "GPT2 Models Module", "type": "external", "link": "gpt2_models.md"}
    ],
    "edges": [
        {"source": "gpt2_sequence_classification", "target": "gpt2_model_internal"},
        {"source": "gpt2_sequence_classification", "target": "classification_head"},
        {"source": "gpt2_sequence_classification", "target": "gpt2_models", "label": "inherits from/uses"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    gpt2_sequence_classification[GPT2ForSequenceClassification]
    gpt2_model_internal[GPT2Model (internal transformer)]
    classification_head[Classification Head (nn.Linear)]
    gpt2_models[GPT2 Models Module]
    gpt2_sequence_classification --> gpt2_model_internal
    gpt2_sequence_classification --> classification_head
    gpt2_sequence_classification --> gpt2_models
```

### Core Components

#### `GPT2ForSequenceClassification`

-   **File:** `src/transformers/models/gpt2/modeling_gpt2.py`
-   **Description:** This class represents a GPT-2 model fine-tuned for sequence classification or regression. It initializes a `GPT2Model` as its transformer backbone and appends a linear layer (`self.score`) to project the transformer's output into the desired number of labels. It supports various problem types (regression, single-label, multi-label classification) and dynamically selects the appropriate loss function.
-   **Key Features:**
    -   **Input Handling:** Accepts `input_ids`, `attention_mask`, `token_type_ids`, `position_ids`, and `inputs_embeds` for flexible input. Supports `past_key_values` for efficient generation.
    -   **Output:** Returns `SequenceClassifierOutputWithPast` including loss, pooled logits, past key values, hidden states, and attentions.
    -   **Padding:** Handles both left and right padding by identifying the last non-padding token for pooling logits.
    -   **Loss Computation:** Automatically determines the problem type (regression, single-label, or multi-label classification) based on `num_labels` and `labels` data type, then applies `MSELoss`, `CrossEntropyLoss`, or `BCEWithLogitsLoss` accordingly.

## How the Module Fits into the Overall System

The `sequence_classification_model` module is a specialized application of the broader [GPT2 Models Module](gpt2_models.md). It provides a ready-to-use architecture for tasks requiring sequence-level predictions, such as sentiment analysis, topic classification, or regression on sequences. It integrates seamlessly with the `transformers` library's training and inference workflows, leveraging the pre-trained weights and architectural flexibility of the GPT-2 family while extending its capabilities to specific downstream tasks.

This module depends on the core transformer functionality provided by the `GPT2Model` and the base utilities from `GPT2PreTrainedModel`, both defined within the `gpt2_models` module. It also relies on standard PyTorch `nn.Module` for its classification head and loss functions. 