# T5Gemma Models
This module provides various T5Gemma model implementations for different natural language processing tasks, including sequence classification, token classification, and conditional text generation.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "t5gemma_classification_models", "label": "T5Gemma Classification Models", "type": "module", "link": "t5gemma_classification_models.md"},
        {"id": "t5gemma_generative_model", "label": "T5Gemma Generative Model", "type": "module", "link": "t5gemma_generative_model.md"}
    ],
    "edges": [
        {"source": "t5gemma_classification_models", "target": "t5gemma_generative_model", "label": "can be adapted for"}
    ],
    "groups": [
        {"id": "classification", "label": "Classification Tasks", "role": "analytical", "nodes": ["t5gemma_classification_models"]},
        {"id": "generation", "label": "Generation Tasks", "role": "generative", "nodes": ["t5gemma_generative_model"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph classification["Classification Tasks"]
        t5gemma_classification_models["T5Gemma Classification Models"]
    end
    subgraph generation["Generation Tasks"]
        t5gemma_generative_model["T5Gemma Generative Model"]
    end
    t5gemma_classification_models -->|
can be adapted for
| t5gemma_generative_model
    click t5gemma_classification_models "t5gemma_classification_models.md"
    click t5gemma_generative_model "t5gemma_generative_model.md"
```