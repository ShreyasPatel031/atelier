# Language Models for Classification and Generation
This module encompasses various language models specialized in sequence classification, conditional text generation, and causal language modeling, utilizing architectures like MT5, NLLB-MoE, OLMoE, PegasusX, and PLBart.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "sequence_classification",
            "label": "Sequence Classification",
            "type": "module",
            "link": "sequence_classification.md"
        },
        {
            "id": "conditional_generation",
            "label": "Conditional Text Generation",
            "type": "module",
            "link": "conditional_generation.md"
        },
        {
            "id": "causal_language_modeling",
            "label": "Causal Language Modeling",
            "type": "module",
            "link": "causal_language_modeling.md"
        }
    ],
    "edges": [],
    "groups": [
        {
            "id": "language_modeling",
            "label": "Language Model Capabilities",
            "role": "generative",
            "nodes": [
                "sequence_classification",
                "conditional_generation",
                "causal_language_modeling"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph language_modeling["Language Model Capabilities"]
        sequence_classification["Sequence Classification"]
        conditional_generation["Conditional Text Generation"]
        causal_language_modeling["Causal Language Modeling"]
    end

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class sequence_classification,conditional_generation,causal_language_modeling generative

    click sequence_classification "sequence_classification.md"
    click conditional_generation "conditional_generation.md"
    click causal_language_modeling "causal_language_modeling.md"
```