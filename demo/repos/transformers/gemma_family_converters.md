# Gemma Family Model Converters

This module provides comprehensive scripts for converting various Gemma family models, including Gemma2, Gemma3, Gemma4, and RecurrentGemma, along with their respective tokenizers and multimodal assets, into the standard Hugging Face Transformers format.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "original_gemma_weights", "label": "Original Gemma Weights", "type": "data"},
        {"id": "gemma2_converter", "label": "Gemma2 Converter", "type": "analytical"},
        {"id": "gemma3_converter", "label": "Gemma3 Converter", "type": "analytical"},
        {"id": "gemma4_converter", "label": "Gemma4 Converter", "type": "analytical"},
        {"id": "recurrent_gemma_converter", "label": "RecurrentGemma Converter", "type": "analytical"},
        {"id": "hf_model_and_tokenizer", "label": "Hugging Face Model & Assets", "type": "data"}
    ],
    "edges": [
        {"source": "original_gemma_weights", "target": "gemma2_converter", "label": "input weights"},
        {"source": "original_gemma_weights", "target": "gemma3_converter", "label": "input weights"},
        {"source": "original_gemma_weights", "target": "gemma4_converter", "label": "input weights"},
        {"source": "original_gemma_weights", "target": "recurrent_gemma_converter", "label": "input weights"},
        {"source": "gemma2_converter", "target": "hf_model_and_tokenizer", "label": "HF format"},
        {"source": "gemma3_converter", "target": "hf_model_and_tokenizer", "label": "HF format"},
        {"source": "gemma4_converter", "target": "hf_model_and_tokenizer", "label": "HF format"},
        {"source": "recurrent_gemma_converter", "target": "hf_model_and_tokenizer", "label": "HF format"}
    ],
    "groups": [
        {"id": "source_data", "label": "Source Data", "role": "data", "nodes": ["original_gemma_weights"]},
        {"id": "conversion_logic", "label": "Conversion Logic", "role": "analytical", "nodes": ["gemma2_converter", "gemma3_converter", "gemma4_converter", "recurrent_gemma_converter"]},
        {"id": "output_artifacts", "label": "Output Artifacts", "role": "data", "nodes": ["hf_model_and_tokenizer"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph source_data["Source Data"]
        original_gemma_weights[("Original Gemma Weights")]
    end

    subgraph conversion_logic["Conversion Logic"]
        gemma2_converter["Gemma2 Converter"]
        gemma3_converter["Gemma3 Converter"]
        gemma4_converter["Gemma4 Converter"]
        recurrent_gemma_converter["RecurrentGemma Converter"]
    end

    subgraph output_artifacts["Output Artifacts"]
        hf_model_and_tokenizer[("Hugging Face Model & Assets")]
    end

    original_gemma_weights -->|
input weights
| gemma2_converter
    original_gemma_weights -->|
input weights
| gemma3_converter
    original_gemma_weights -->|
input weights
| gemma4_converter
    original_gemma_weights -->|
input weights
| recurrent_gemma_converter

    gemma2_converter -->|
HF format
| hf_model_and_tokenizer
    gemma3_converter -->|
HF format
| hf_model_and_tokenizer
    gemma4_converter -->|
HF format
| hf_model_and_tokenizer
    recurrent_gemma_converter -->|
HF format
| hf_model_and_tokenizer

    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class original_gemma_weights,hf_model_and_tokenizer data
    class gemma2_converter,gemma3_converter,gemma4_converter,recurrent_gemma_converter analytical


```