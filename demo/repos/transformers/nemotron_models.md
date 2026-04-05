# Nemotron Models Documentation

## Introduction

The `nemotron_models` module provides utilities for converting Nemotron models from the NVIDIA NeMo format to the Hugging Face Transformers format. This enables seamless interoperability of Nemotron models within the Hugging Face ecosystem, allowing users to leverage the extensive tools and functionalities provided by Hugging Face for model loading, fine-tuning, and inference.

## Core Functionality

The primary function of this module is `convert`, which handles the entire process of transforming a NeMo `.nemo` checkpoint file into a Hugging Face-compatible PyTorch state dictionary.

### `convert` Function

```python
def convert(input_nemo_file, output_hf_file, precision=None, cpu_only=False) -> None:
    """
    Convert NeMo weights to HF weights
    """
    # ... (code snippet)
```

**Parameters:**

*   `input_nemo_file`: Path to the input NeMo `.nemo` model checkpoint file.
*   `output_hf_file`: Path where the converted Hugging Face PyTorch state dictionary will be saved.
*   `precision`: Optional. Specifies the precision for the converted weights (e.g., `16`, `bf16`, `32`). If `None`, it defaults to the precision specified in the NeMo model's configuration.
*   `cpu_only`: Optional. If `True`, the model is loaded and converted on the CPU, which can be significantly slower but useful in environments without GPU access.

**Process Overview:**

1.  **Load NeMo Model Configuration:** The function first loads the configuration from the `input_nemo_file` using `MegatronGPTModel.restore_from` in `return_config` mode. It then modifies the configuration to ensure compatibility with Hugging Face (e.g., setting `tensor_model_parallel_size` and `pipeline_model_parallel_size` to 1, disabling `sequence_parallel`).
2.  **Load NeMo Model Weights:** The full NeMo model is then loaded using `MegatronGPTModel.restore_from`. The `map_location` is set to `cpu` if `cpu_only` is true.
3.  **Determine Precision:** The precision for the output weights is determined based on the `precision` argument or the NeMo model's configuration, supporting `float32`, `float16`, and `bfloat16`.
4.  **Weight Extraction and Remapping:** The core of the conversion involves iterating through the NeMo model's state dictionary and remapping the weights to match the Hugging Face naming conventions and structures.
    *   **Embedding Layer:** The word embeddings are directly extracted.
    *   **Transformer Layers:** For each transformer layer, the attention (QKV, output projection) and MLP (feed-forward, up/down projection) weights are extracted. Special handling is implemented for Grouped Query Attention (GQA) and gated MLP layers.
    *   **Layer Normalization:** Input and post-attention layer normalization weights (and biases if present) are extracted.
5.  **Final Layers:** The final layer normalization and the language model head weights are extracted.
6.  **Save Hugging Face Checkpoint:** The remapped weights are compiled into an `OrderedDict` and saved as a PyTorch `.pt` file at `output_hf_file`.

## Architecture and Component Relationships

This module primarily consists of a single conversion utility that acts as an interface between NeMo and Hugging Face model formats. It depends on external libraries like `torch` for tensor operations and implicitly on `nemo` for loading the source models.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "convert_function", "label": "convert (NeMo to HF)", "type": "component", "link": null},
        {"id": "nemo_megatron_gpt_model", "label": "MegatronGPTModel (NeMo)", "type": "external", "link": null},
        {"id": "torch_library", "label": "torch (Library)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "convert_function", "target": "nemo_megatron_gpt_model"},
        {"source": "convert_function", "target": "torch_library"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    convert_function[convert (NeMo to HF)]
    nemo_megatron_gpt_model[MegatronGPTModel (NeMo)]
    torch_library[torch (Library)]
    convert_function --> nemo_megatron_gpt_model
    convert_function --> torch_library
```

## How the Module Fits into the Overall System

The `nemotron_models` module serves as a critical bridge for users who have trained Nemotron models using NVIDIA's NeMo framework and wish to deploy or further fine-tune them using the Hugging Face Transformers library. It ensures compatibility and facilitates the adoption of Nemotron models within the broader ML ecosystem that relies on Hugging Face standards. This module acts as a standalone utility, providing a direct conversion path without being tightly coupled to other modules within the Transformers library beyond its output format. 
