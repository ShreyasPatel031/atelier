# MBart Sequence Classification
This module implements sequence classification using the MBart model, processing input tokens to generate sentence representations which are then passed to a classification head for predicting labels and calculating loss.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "input_data",
            "label": "Input Data (Tokens, Masks)",
            "type": "component",
            "link": null
        },
        {
            "id": "mbart_model",
            "label": "MBart Encoder-Decoder Model",
            "type": "component",
            "link": null
        },
        {
            "id": "extract_rep",
            "label": "Extract Sentence Representation",
            "type": "component",
            "link": null
        },
        {
            "id": "classification_head",
            "label": "Classification Head",
            "type": "component",
            "link": null
        },
        {
            "id": "loss_calc",
            "label": "Calculate Loss (Optional)",
            "type": "component",
            "link": null
        },
        {
            "id": "output",
            "label": "Classification Output",
            "type": "component",
            "link": null
        },
        {
            "id": "mbart_config",
            "label": "MBart Configuration",
            "type": "external",
            "link": "mbart_models.md"
        }
    ],
    "edges": [
        {
            "source": "input_data",
            "target": "mbart_model",
            "label": "encoded inputs"
        },
        {
            "source": "mbart_model",
            "target": "extract_rep",
            "label": "last hidden state"
        },
        {
            "source": "extract_rep",
            "target": "classification_head",
            "label": "sentence representation"
        },
        {
            "source": "classification_head",
            "target": "loss_calc",
            "label": "logits"
        },
        {
            "source": "classification_head",
            "target": "output",
            "label": "logits"
        },
        {
            "source": "loss_calc",
            "target": "output",
            "label": "loss"
        },
        {
            "source": "mbart_config",
            "target": "mbart_model",
            "label": "model configuration"
        },
        {
            "source": "mbart_config",
            "target": "classification_head",
            "label": "head configuration"
        },
        {
            "source": "mbart_config",
            "target": "loss_calc",
            "label": "problem type"
        },
        {
            "source": "input_data",
            "target": "loss_calc",
            "label": "labels (optional)"
        }
    ],
    "groups": [
        {
            "id": "classification_pipeline",
            "label": "MBart Sequence Classification",
            "role": "analytical",
            "nodes": [
                "input_data",
                "mbart_model",
                "extract_rep",
                "classification_head",
                "loss_calc",
                "output"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph classification_pipeline["MBart Sequence Classification"]
        input_data["Input Data (Tokens, Masks)"]
        mbart_model["MBart Encoder-Decoder Model"]
        extract_rep["Extract Sentence Representation"]
        classification_head["Classification Head"]
        loss_calc["Calculate Loss (Optional)"]
        output["Classification Output"]
    end

    mbart_config["MBart Configuration"]

    input_data ==>|"encoded inputs"| mbart_model
    mbart_model -->|"last hidden state"| extract_rep
    extract_rep -->|"sentence representation"| classification_head
    classification_head -->|"logits"| loss_calc
    classification_head -->|"logits"| output
    loss_calc -->|"loss"| output
    mbart_config -.->|"model configuration"| mbart_model
    mbart_config -.->|"head configuration"| classification_head
    mbart_config -.->|"problem type"| loss_calc
    input_data -.->|"labels (optional)"| loss_calc

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef external fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f

    class input_data,mbart_model,extract_rep,classification_head,loss_calc,output analytical
    class mbart_config external
```