# Language Model Architectures Overview
This module provides an architectural overview of the various language model implementations, data preparation techniques, generation utilities, and model conversion tools within the repository.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "lang_models", "label": "Language Models", "type": "module", "link": "language_models.md"},
        {"id": "data_tokenizers", "label": "Data Tokenizers", "type": "module", "link": "tokenizers.md"},
        {"id": "model_gen", "label": "Model Generation", "type": "module", "link": "generation.md"},
        {"id": "model_converters", "label": "Model Conversion", "type": "module", "link": "text_model_converters.md"}
    ],
    "edges": [
        {"source": "data_tokenizers", "target": "lang_models", "label": "preprocessed data"},
        {"source": "lang_models", "target": "model_gen", "label": "generated text"},
        {"source": "model_converters", "target": "lang_models", "label": "transforms"}
    ],
    "groups": [
        {"id": "model_implementations", "label": "Model Implementations", "role": "generative", "nodes": ["lang_models"]},
        {"id": "data_pipeline", "label": "Data Pipeline", "role": "data", "nodes": ["data_tokenizers"]},
        {"id": "utilities", "label": "Utilities", "role": "analytical", "nodes": ["model_gen", "model_converters"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph model_implementations["Model Implementations"]
        lang_models["Language Models"]
    end
    subgraph data_pipeline["Data Pipeline"]
        data_tokenizers["Data Tokenizers"]
    end
    subgraph utilities["Utilities"]
        model_gen["Model Generation"]
        model_converters["Model Conversion"]
    end

    data_tokenizers -->|'''preprocessed data'''| lang_models
    lang_models -->|'''generated text'''| model_gen
    model_converters -.->|'''transforms'''| lang_models

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class lang_models generative
    class data_tokenizers data
    class model_gen,model_converters analytical

    click lang_models "language_models.md"
    click data_tokenizers "tokenizers.md"
    click model_gen "generation.md"
    click model_converters "text_model_converters.md"
```