# recurrent_gemma_models

## Introduction

The `recurrent_gemma_models` module is responsible for converting Google's Recurrent Gemma model checkpoints and their corresponding tokenizers into the Hugging Face Transformers format. This conversion facilitates the use of Recurrent Gemma models within the Hugging Face ecosystem, enabling seamless integration with existing tools and workflows for model loading, inference, and fine-tuning.

## Architecture and Core Components

The core functionality of the `recurrent_gemma_models` module resides in its `main` component, which orchestrates the conversion process. It handles command-line argument parsing for specifying input checkpoints, tokenizer paths, model size, output directory, and other conversion parameters.

### Core Component: `main`

`src.transformers.models.recurrent_gemma.convert_recurrent_gemma_to_hf.main` is the primary entry point for the model and tokenizer conversion. It parses command-line arguments to configure the conversion process. Depending on the arguments, it calls helper functions to convert the tokenizer and the model weights.

```python
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--input_checkpoint",
        help="Absolute path to the target Gemma weights.",
        default="/home/arthur/transformers_recurrentgemma/google/recurrent-gemma-2b-it/ToBeDeleted/2b-it.pt",
    )
    parser.add_argument(
        "--tokenizer_checkpoint",
        help="Location of Gemma tokenizer model",
    )
    parser.add_argument(
        "--model_size",
        default="2B",
        choices=["2B", "7B", "tokenizer_only"],
        help="'f' models correspond to the finetuned versions, and are specific to the Gemma2 official release. For more details on Gemma2, check out the original repo: https://huggingface.co/google/gemma-7b",
    )
    parser.add_argument(
        "--output_dir",
        default="google/recurrent-gemma-2b-it-hf",
        help="Location to write HF model and tokenizer",
    )
    parser.add_argument(
        "--convert_tokenizer",
        help="Whether or not to convert the tokenizer as well.",
        action="store_true",
        default=False,
    )
    parser.add_argument(
        "--push_to_hub",
        help="Whether or not to push the model to the hub at `output_dir` instead of saving it locally.",
        action="store_true",
        default=False,
    )
    parser.add_argument(
        "--dtype",
        default="float32",
        help="Target dtype of the converted model",
    )
    args = parser.parse_args()

    if args.convert_tokenizer:
        if args.tokenizer_checkpoint is None:
            raise ValueError("Path to the tokenizer is required when passing --convert_tokenizer")

        spm_path = os.path.join(args.tokenizer_checkpoint)
        write_tokenizer(spm_path, args.output_dir, args.push_to_hub)

    config = CONFIG_MAPPING[args.model_size]
    dtype = getattr(torch, args.dtype)
    write_model(
        config=config,
        input_base_path=args.input_checkpoint,
        save_path=args.output_dir,
        push_to_hub=args.push_to_hub,
        dtype=dtype,
    )
```

### Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "main", "label": "main (Conversion Script)", "type": "component", "link": null},
        {"id": "write_tokenizer", "label": "write_tokenizer", "type": "component", "link": null},
        {"id": "write_model", "label": "write_model", "type": "component", "link": null},
        {"id": "config_mapping", "label": "CONFIG_MAPPING", "type": "component", "link": null},
        {"id": "torch", "label": "torch (External Library)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "main", "target": "write_tokenizer"},
        {"source": "main", "target": "write_model"},
        {"source": "main", "target": "config_mapping"},
        {"source": "main", "target": "torch"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    main[main (Conversion Script)]
    write_tokenizer[write_tokenizer]
    write_model[write_model]
    config_mapping[CONFIG_MAPPING]
    torch[torch (External Library)]

    main --> write_tokenizer
    main --> write_model
    main --> config_mapping
    main --> torch
```

## How the module fits into the overall system

This module plays a crucial role in expanding the compatibility of Hugging Face Transformers with Google's Recurrent Gemma models. By converting the original model checkpoints to the Hugging Face format, it enables these models to be easily integrated into any application or workflow that leverages the Hugging Face ecosystem. This promotes interoperability and allows researchers and developers to utilize Recurrent Gemma models alongside other state-of-the-art models available in the Hugging Face Hub, streamlining experimentation and deployment processes.
