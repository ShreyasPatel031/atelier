# LongT5 Models
This module provides the core LongT5 model implementations, including variants for conditional generation, the base encoder-decoder architecture, and an encoder-only model, all built upon a shared LongT5 transformer stack for processing long input sequences efficiently.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "conditional_generation", "label": "LongT5ForConditionalGeneration", "type": "component", "link": null},
        {"id": "base_model", "label": "LongT5Model", "type": "component", "link": null},
        {"id": "encoder_only_model", "label": "LongT5EncoderModel", "type": "component", "link": null},
        {"id": "longt5_stack", "label": "LongT5Stack (Encoder/Decoder)", "type": "component", "link": null},
        {"id": "lm_head", "label": "LM Head (Output Layer)", "type": "component", "link": null},
        {"id": "shared_embeddings", "label": "Shared Token Embeddings", "type": "component", "link": null},
        {"id": "longt5_config", "label": "LongT5Config", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "conditional_generation", "target": "longt5_stack", "label": "uses encoder/decoder"},
        {"source": "base_model", "target": "longt5_stack", "label": "uses encoder/decoder"},
        {"source": "encoder_only_model", "target": "longt5_stack", "label": "uses encoder"},
        {"source": "conditional_generation", "target": "lm_head", "label": "generates logits"},
        {"source": "conditional_generation", "target": "shared_embeddings", "label": "initializes with"},
        {"source": "base_model", "target": "shared_embeddings", "label": "initializes with"},
        {"source": "encoder_only_model", "target": "shared_embeddings", "label": "initializes with"},
        {"source": "conditional_generation", "target": "longt5_config", "label": "configures via"},
        {"source": "base_model", "target": "longt5_config", "label": "configures via"},
        {"source": "encoder_only_model", "target": "longt5_config", "label": "configures via"}
    ],
    "groups": [
        {"id": "longt5_model_implementations", "label": "LongT5 Model Implementations", "role": "generative", "nodes": ["conditional_generation", "base_model", "encoder_only_model"]},
        {"id": "core_components", "label": "Core Building Blocks", "role": "analytical", "nodes": ["longt5_stack", "lm_head", "shared_embeddings", "longt5_config"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph longt5_model_implementations["LongT5 Model Implementations"]
        conditional_generation[''LongT5ForConditionalGeneration'']
        base_model[''LongT5Model'']
        encoder_only_model[''LongT5EncoderModel'']
    end

    subgraph core_components["Core Building Blocks"]
        longt5_stack["LongT5Stack (Encoder/Decoder)"]
        lm_head["LM Head (Output Layer)"]
        shared_embeddings["Shared Token Embeddings"]
        longt5_config["LongT5Config"]
    end

    conditional_generation -->|''uses encoder/decoder''| longt5_stack
    base_model -->|''uses encoder/decoder''| longt5_stack
    encoder_only_model -->|''uses encoder''| longt5_stack

    conditional_generation -->|''generates logits''| lm_head

    conditional_generation -->|''initializes with''| shared_embeddings
    base_model -->|''initializes with''| shared_embeddings
    encoder_only_model -->|''initializes with''| shared_embeddings

    conditional_generation -.->|''configures via''| longt5_config
    base_model -.->|''configures via''| longt5_config
    encoder_only_model -.->|''configures via''| longt5_config

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class conditional_generation,base_model,encoder_only_model generative
    class longt5_stack,lm_head,shared_embeddings,longt5_config analytical
```