# BLT Causal Language Model Implementation

The `blt_causal_lm_implementation` module provides the concrete implementation of the BLT Causal Language Model within the Transformers library. This module is responsible for handling the forward pass, loss calculation, and text generation for BLT models. It integrates the core BLT model with a language modeling head to enable causal language modeling tasks.

## Architecture

This module is a leaf node in the BLT model architecture, directly implementing the `BltForCausalLM` class. It builds upon a `BltModel` (from the broader BLT architecture) and adds a linear layer (`lm_head`) for predicting the next token in a causal language modeling setup. It also leverages the `GenerationMixin` for text generation capabilities.

## Core Functionality

### `BltForCausalLM`

The `BltForCausalLM` class is the central component of this module. It is designed for tasks such as text generation where the model predicts the next token in a sequence.

**Initialization:**
The model is initialized with a `BltConfig` object, which defines the model's architecture and hyperparameters. It instantiates a `BltModel` and a linear layer `lm_head` for the language modeling task.

**`forward` method:**

The `forward` method processes input sequences and computes the causal language modeling loss (if labels are provided) and logits for token prediction.

```python
def forward(
    self,
    input_ids: torch.LongTensor | None = None,
    attention_mask: torch.Tensor | None = None,
    position_ids: torch.LongTensor | None = None,
    cross_attention_states: torch.LongTensor | None = None,
    cross_attention_mask: torch.LongTensor | None = None,
    full_text_row_masked_out_mask: tuple[torch.Tensor, torch.Tensor] | None = None,
    past_key_values: Cache | None = None,
    inputs_embeds: torch.FloatTensor | None = None,
    labels: torch.LongTensor | None = None,
    use_cache: bool | None = None,
    logits_to_keep: int | torch.Tensor = 0,
    **kwargs: Unpack[TransformersKwargs],
) -> tuple | CausalLMOutputWithPast:
```

**Parameters:**
- `input_ids` (`torch.LongTensor`, *optional*): Input token IDs.
- `attention_mask` (`torch.Tensor`, *optional*): Mask to avoid performing attention on padding token indices.
- `position_ids` (`torch.LongTensor`, *optional*): Positional embeddings.
- `cross_attention_states` (`torch.FloatTensor`, *optional*): Output of the vision model, used for cross-attention. This tensor contains the processed image features that the language model will attend to.
- `cross_attention_mask` (`torch.Tensor` of shape `(batch_size, seq_length, max_num_images, max_num_tiles)`, *optional*): Cross-attention mask to control the interaction between text tokens and image tiles.
- `full_text_row_masked_out_mask` (`tuple[torch.Tensor, torch.Tensor]`, *optional*): A tuple containing two tensors that mask out rows in the cross-attention mechanism.
- `past_key_values` (`Cache`, *optional*): Cached key and value states to speed up decoding.
- `inputs_embeds` (`torch.FloatTensor`, *optional*): Optionally, you can pass pre-computed input embeddings instead of input IDs.
- `labels` (`torch.LongTensor`, *optional*): Labels for computing the masked language modeling loss.
- `use_cache` (`bool`, *optional*): Whether or not the model should return the last key/values attention states (past key/values).
- `logits_to_keep` (`int | torch.Tensor`, *optional*, defaults to 0): Number of logits to keep from the end of the sequence for loss computation.

**Example Usage:**

```python
from transformers import AutoTokenizer, BltForCausalLM

model = BltForCausalLM.from_pretrained("itazap/blt-1b-hf")
tokenizer = AutoTokenizer.from_pretrained("itazap/blt-1b-hf")

prompt = "If I had to write a haiku, it would be:"
inputs = tokenizer(prompt, return_tensors="pt")

# Generate
generate_ids = model.generate(inputs.input_ids, max_length=40, do_sample=True, temperature=0.6)
result = tokenizer.batch_decode(generate_ids, skip_special_tokens=True, clean_up_tokenization_spaces=False)[0]
print(result)
# Expected Output: If I had to write a haiku, it would be: "Snowflakes gently fall" - simple, yet peaceful.
# I love the idea of snowflakes gently falling, each one
```
