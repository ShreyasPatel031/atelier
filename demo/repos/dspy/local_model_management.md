# Local Model Management
This module enables the management of local language models, offering functionalities to launch and terminate local SGLang servers, and to finetune these models using provided training data.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "local_provider",
            "label": "Local Model Provider",
            "type": "component",
            "link": null
        },
        {
            "id": "launch_server",
            "label": "Launch SGLang Server",
            "type": "component",
            "link": null
        },
        {
            "id": "finetune_model",
            "label": "Finetune Local Model",
            "type": "component",
            "link": null
        },
        {
            "id": "tokenize_data",
            "label": "Tokenize Training Data",
            "type": "component",
            "link": null
        },
        {
            "id": "lm_client",
            "label": "LM Client (BaseLM)",
            "type": "external",
            "link": "lm_clients.md"
        },
        {
            "id": "training_job",
            "label": "Training Job (Definition)",
            "type": "external",
            "link": "openai_training_jobs.md"
        },
        {
            "id": "raw_data",
            "label": "Raw Training Data",
            "type": "data",
            "link": null
        },
        {
            "id": "tokenized_data",
            "label": "Tokenized Training Data",
            "type": "data",
            "link": null
        }
    ],
    "edges": [
        {
            "source": "lm_client",
            "target": "local_provider",
            "label": "initializes with"
        },
        {
            "source": "local_provider",
            "target": "launch_server",
            "label": "initiates"
        },
        {
            "source": "local_provider",
            "target": "finetune_model",
            "label": "orchestrates"
        },
        {
            "source": "finetune_model",
            "target": "training_job",
            "label": "uses"
        },
        {
            "source": "finetune_model",
            "target": "raw_data",
            "label": "processes"
        },
        {
            "source": "raw_data",
            "target": "tokenize_data",
            "label": "sent to"
        },
        {
            "source": "tokenize_data",
            "target": "tokenized_data",
            "label": "produces"
        },
        {
            "source": "tokenized_data",
            "target": "finetune_model",
            "label": "feeds into"
        }
    ],
    "groups": [
        {
            "id": "model_ops",
            "label": "Local Model Operations",
            "role": "surface",
            "nodes": [
                "local_provider",
                "launch_server",
                "finetune_model"
            ]
        },
        {
            "id": "data_prep",
            "label": "Data Preparation",
            "role": "analytical",
            "nodes": [
                "raw_data",
                "tokenize_data",
                "tokenized_data"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph model_ops["Local Model Operations"]
        local_provider["Local Model Provider"]
        launch_server["Launch SGLang Server"]
        finetune_model["Finetune Local Model"]
    end

    subgraph data_prep["Data Preparation"]
        raw_data[("Raw Training Data")]
        tokenize_data["Tokenize Training Data"]
        tokenized_data[("Tokenized Training Data")]
    end

    lm_client["LM Client (BaseLM)"]
    training_job["Training Job (Definition)"]

    lm_client -->|"initializes with"| local_provider
    local_provider -->|"initiates"| launch_server
    local_provider -->|"orchestrates"| finetune_model
    finetune_model -.->|"uses"| training_job
    finetune_model -->|"processes"| raw_data
    raw_data -->|"sent to"| tokenize_data
    tokenize_data -->|"produces"| tokenized_data
    tokenized_data -->|"feeds into"| finetune_model

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class local_provider,launch_server,finetune_model surface
    class raw_data,tokenized_data data
    class tokenize_data analytical

    click lm_client "lm_clients.md" "View LM Clients Module"
    click training_job "openai_training_jobs.md" "View OpenAI Training Jobs Module"
```