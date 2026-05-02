# Legacy TensorFlow and Fairseq Model Converters

This module provides scripts to convert legacy model checkpoints from TensorFlow and Fairseq formats into compatible Hugging Face PyTorch models, ensuring seamless integration with the Hugging Face ecosystem.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "source_checkpoint", "label": "Source Model Checkpoint (TF/Fairseq)", "type": "data", "link": null},
        {"id": "model_configuration", "label": "Model Configuration (e.g., JSON)", "type": "data", "link": null},
        {"id": "conversion_process", "label": "Legacy TF/Fairseq to PyTorch Conversion", "type": "component", "link": null},
        {"id": "hf_pytorch_model_output", "label": "Hugging Face PyTorch Model", "type": "data", "link": null},
        {"id": "hf_core_models", "label": "Core Hugging Face Models", "type": "external", "link": "core_models.md"}
    ],
    "edges": [
        {"source": "source_checkpoint", "target": "conversion_process", "label": "reads weights from"},
        {"source": "model_configuration", "target": "conversion_process", "label": "applies configuration"},
        {"source": "conversion_process", "target": "hf_pytorch_model_output", "label": "generates PyTorch model"},
        {"source": "conversion_process", "target": "hf_core_models", "label": "conforms to structure of"}
    ],
    "groups": [
        {"id": "conversion_pipeline", "label": "Model Conversion Pipeline", "role": "analytical", "nodes": ["conversion_process"]}
    ]
}
-->

```mermaid
flowchart TD
    source_checkpoint[("Source Model Checkpoint (TF/Fairseq)")]
    model_configuration[("Model Configuration (e.g., JSON)")]
    hf_pytorch_model_output[("Hugging Face PyTorch Model")]

    subgraph conversion_pipeline["Model Conversion Pipeline"]
        conversion_process["Legacy TF/Fairseq to PyTorch Conversion"]
    end

    hf_core_models["Core Hugging Face Models"]

    source_checkpoint -->|"reads weights from"| conversion_process
    model_configuration -.->|"applies configuration"| conversion_process
    conversion_process -->|"generates PyTorch model"| hf_pytorch_model_output
    conversion_process -.->|"conforms to structure of"| hf_core_models

    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef external fill:#fff7ed,stroke:#fb923c,stroke-width:2px,color:#9a3412

    class source_checkpoint,model_configuration,hf_pytorch_model_output data
    class conversion_process analytical
    class hf_core_models external
```