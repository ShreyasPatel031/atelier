# PaliGemma Models Documentation

The `paligemma_models` module is responsible for providing utilities and model architectures specifically tailored for the PaliGemma and PaliGemma2 models. Its primary function is to facilitate the conversion of pre-trained model weights into a format compatible with the Hugging Face Transformers library, enabling seamless integration and usage within the ecosystem.

## Architecture Overview

The `paligemma_models` module currently consists of a core sub-module focused on checkpoint conversion. This sub-module handles the intricate process of loading and transforming model weights from their original formats (e.g., Flax NPZ files) into a PyTorch-compatible `state_dict`.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "checkpoint_conversion", "label": "Checkpoint Conversion", "type": "module", "link": "checkpoint_conversion.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    checkpoint_conversion[Checkpoint Conversion]

    click checkpoint_conversion "checkpoint_conversion.md" "View Checkpoint Conversion Module"
```

## Sub-modules

### [Checkpoint Conversion](checkpoint_conversion.md)
This sub-module is dedicated to the conversion of PaliGemma and PaliGemma2 model checkpoints. It includes functions to read checkpoint files, rename and reshape parameters, and populate a PyTorch state dictionary. It also handles tokenizer and image processor initialization, as well as model expansion for image tokens.
