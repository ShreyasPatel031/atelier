# Qwen Language Models
This module encompasses various Qwen language models, including multimodal capabilities with audio generation from Qwen2.5 Omni, alongside causal language models like Qwen2 MoE and Qwen3.5 for text generation.
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "multimodal_qwen_models",
            "label": "Multimodal Qwen Models",
            "type": "module",
            "link": "multimodal_qwen_models.md"
        },
        {
            "id": "causal_language_models",
            "label": "Causal Language Models",
            "type": "module",
            "link": "causal_language_models.md"
        }
    ],
    "edges": [],
    "groups": [
        {
            "id": "qwen_implementations",
            "label": "Qwen Model Implementations",
            "role": "generative",
            "nodes": [
                "multimodal_qwen_models",
                "causal_language_models"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph qwen_implementations["Qwen Model Implementations"]
        multimodal_qwen_models["Multimodal Qwen Models"]
        causal_language_models["Causal Language Models"]
    end

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class multimodal_qwen_models,causal_language_models generative

    click multimodal_qwen_models "multimodal_qwen_models.md"
    click causal_language_models "causal_language_models.md"
```