# modernbert_decoder_causal_lm_model

The `modernbert_decoder_causal_lm_model` module provides the `ModernBertDecoderForCausalLM` class, which is a ModernBertDecoder model specifically designed for causal language modeling tasks. It extends the base `ModernBertDecoderPreTrainedModel` and incorporates `GenerationMixin` for text generation capabilities.

## Core Functionality

The `ModernBertDecoderForCausalLM` class is an end-to-end model for causal language modeling. It leverages the ModernBertDecoder's architecture for sequence processing and adds a language modeling head on top to predict the next token in a sequence.

### `ModernBertDecoderForCausalLM`

`src.transformers.models.modernbert_decoder.modeling_modernbert_decoder.ModernBertDecoderForCausalLM`

This class is responsible for:

-   **Initialization**: Setting up the core `ModernBertDecoderModel`, a prediction head (`ModernBertDecoderPredictionHead`), and a linear decoder layer.
-   **Output Embeddings**: Managing the output embeddings for vocabulary prediction.
-   **Forward Pass**: Processing input IDs, attention masks, and other parameters through the `ModernBertDecoderModel` and then through the language modeling head to produce logits. It also computes the causal language modeling loss if `labels` are provided.
-   **Text Generation**: Inheriting from `GenerationMixin`, it provides methods for generating text sequences.

```python
class ModernBertDecoderForCausalLM(ModernBertDecoderPreTrainedModel, GenerationMixin):
    _tied_weights_keys = {"decoder.weight": "model.embeddings.tok_embeddings.weight"}

    def __init__(self, config: ModernBertDecoderConfig):
        super().__init__(config)
        self.config = config
        self.model = ModernBertDecoderModel(config)
        self.lm_head = ModernBertDecoderPredictionHead(config)
        self.decoder = nn.Linear(config.hidden_size, config.vocab_size, bias=config.decoder_bias)
        self.post_init()

    def get_output_embeddings(self): ...

    def set_output_embeddings(self, new_embeddings): ...

    def forward(self, ...): ...
```

## Architecture and Component Relationships

This module integrates several components to perform causal language modeling.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "modernbert_decoder_for_causal_lm", "label": "ModernBertDecoderForCausalLM", "type": "component", "link": null},
        {"id": "modernbert_decoder_model", "label": "ModernBertDecoderModel", "type": "external", "link": "modernbert_decoder_models.md"},
        {"id": "modernbert_decoder_prediction_head", "label": "ModernBertDecoderPredictionHead", "type": "external", "link": "modernbert_decoder_models.md"},
        {"id": "nn_linear", "label": "nn.Linear (Decoder)", "type": "component", "link": null},
        {"id": "generation_mixin", "label": "GenerationMixin", "type": "external", "link": "generation_mixins.md"}
    ],
    "edges": [
        {"source": "modernbert_decoder_for_causal_lm", "target": "modernbert_decoder_model"},
        {"source": "modernbert_decoder_for_causal_lm", "target": "modernbert_decoder_prediction_head"},
        {"source": "modernbert_decoder_for_causal_lm", "target": "nn_linear"},
        {"source": "modernbert_decoder_for_causal_lm", "target": "generation_mixin"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    modernbert_decoder_for_causal_lm[ModernBertDecoderForCausalLM]
    modernbert_decoder_model[ModernBertDecoderModel]
    modernbert_decoder_prediction_head[ModernBertDecoderPredictionHead]
    nn_linear[nn.Linear (Decoder)]
    generation_mixin[GenerationMixin]

    modernbert_decoder_for_causal_lm --> modernbert_decoder_model
    modernbert_decoder_for_causal_lm --> modernbert_decoder_prediction_head
    modernbert_decoder_for_causal_lm --> nn_linear
    modernbert_decoder_for_causal_lm --> generation_mixin
```

## How it Fits into the Overall System

The `modernbert_decoder_causal_lm_model` module is a specialized model within the larger `modernbert_decoder_models` family. It specifically provides the causal language modeling capability for the ModernBertDecoder architecture. It depends on core components from the parent `modernbert_decoder_models` module for its base model and prediction head, and it utilizes the `generation_mixins` module to enable text generation features.

## Usage Example

```python
>>> from transformers import AutoTokenizer, ModernBertDecoderForCausalLM

>>> model = ModernBertDecoderForCausalLM.from_pretrained("blab-jhu/test-32m-dec")
>>> tokenizer = AutoTokenizer.from_pretrained("blab-jhu/test-32m-dec")

>>> prompt = "The capital of France is"
>>> inputs = tokenizer(prompt, return_tensors="pt")

>>> # Generate
>>> generate_ids = model.generate(inputs.input_ids, max_length=1)
>>> tokenizer.batch_decode(generate_ids, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
"The capital of France is Paris"
```