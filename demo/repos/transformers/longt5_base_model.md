# `longt5_base_model` Module Documentation

## Introduction

The `longt5_base_model` module provides the core `LongT5Model`, which is the base sequence-to-sequence model for the LongT5 architecture. This model is responsible for both encoding input sequences and decoding output sequences, making it suitable for a wide range of tasks such as summarization, translation, and question answering. It leverages a shared embedding layer and separate encoder and decoder stacks for its operations.

## Architecture and Component Relationships

The `LongT5Model` integrates a shared token embedding layer and distinct encoder and decoder stacks (`LongT5Stack`) to implement the full sequence-to-sequence functionality. It is initialized with a `LongT5Config` to define its architectural parameters and inherits functionalities from `LongT5PreTrainedModel`.

Other related models within the LongT5 family, such as `LongT5EncoderModel` (for encoder-only tasks) and `LongT5ForConditionalGeneration` (which adds a language modeling head for conditional generation), build upon or interact with the foundational concepts present in this base model.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "longt5_model", "label": "LongT5Model", "type": "component", "link": null},
        {"id": "longt5_stack_internal", "label": "LongT5Stack (Internal Encoder/Decoder)", "type": "component", "link": null},
        {"id": "shared_embeddings", "label": "Shared Embeddings", "type": "component", "link": null},
        {"id": "longt5_config", "label": "LongT5Config", "type": "external", "link": "longt5_models.md"},
        {"id": "longt5_pretrained_model", "label": "LongT5PreTrainedModel", "type": "external", "link": "modeling_utilities.md"},
        {"id": "longt5_encoder_model_ref", "label": "LongT5EncoderModel", "type": "external", "link": "longt5_encoder_model.md"},
        {"id": "longt5_conditional_generation_ref", "label": "LongT5ForConditionalGeneration", "type": "external", "link": "longt5_conditional_generation.md"}
    ],
    "edges": [
        {"source": "longt5_model", "target": "longt5_stack_internal"},
        {"source": "longt5_model", "target": "shared_embeddings"},
        {"source": "longt5_model", "target": "longt5_config"},
        {"source": "longt5_pretrained_model", "target": "longt5_model", "type": "inheritance"},
        {"source": "longt5_model", "target": "longt5_encoder_model_ref"},
        {"source": "longt5_model", "target": "longt5_conditional_generation_ref"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    longt5_model[LongT5Model]
    longt5_stack_internal[LongT5Stack (Internal Encoder/Decoder)]
    shared_embeddings[Shared Embeddings]
    longt5_config(LongT5Config)
    longt5_pretrained_model(LongT5PreTrainedModel)
    longt5_encoder_model_ref(LongT5EncoderModel)
    longt5_conditional_generation_ref(LongT5ForConditionalGeneration)

    longt5_model --> longt5_stack_internal
    longt5_model --> shared_embeddings
    longt5_model --> longt5_config
    longt5_pretrained_model --|> longt5_model
    longt5_model --- longt5_encoder_model_ref
    longt5_model --- longt5_conditional_generation_ref
```

## Core Components

### `LongT5Model`

`src.transformers.models.longt5.modeling_longt5.LongT5Model`

This is the central class of the `longt5_base_model` module. It implements the full LongT5 sequence-to-sequence architecture.

**Key Features:**

*   **Encoder-Decoder Architecture**: Comprises an `encoder` and a `decoder`, both instances of `LongT5Stack`, for processing input and generating output sequences.
*   **Shared Embeddings**: Utilizes a `shared` embedding layer for both the encoder and decoder inputs, promoting parameter efficiency.
*   **Flexible Forward Pass**: The `forward` method allows for various input configurations, including direct input IDs, pre-computed encoder outputs, and support for caching past key-value states for efficient generation.
*   **Relative Position Embeddings**: Inherits LongT5's characteristic relative position embeddings, enabling effective handling of long sequences.

**Usage Example:**

```python
>>> from transformers import AutoTokenizer, LongT5Model

>>> tokenizer = AutoTokenizer.from_pretrained("google/long-t5-local-base")
>>> model = LongT5Model.from_pretrained("google/long-t5-local-base")

>>> # Let's try a very long encoder input.
>>> input_ids = tokenizer(
...     100 * "Studies have been shown that owning a dog is good for you", return_tensors="pt"
... ).input_ids  # Batch size 1

>>> decoder_input_ids = tokenizer("Studies show that", return_tensors="pt").input_ids  # Batch size 1

>>> # forward pass
>>> outputs = model(input_ids=input_ids, decoder_input_ids=decoder_input_ids)
>>> last_hidden_states = outputs.last_hidden_state
```
