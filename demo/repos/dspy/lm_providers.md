# Language Model Providers

This module provides concrete implementations for finetuning and deploying language models across different platforms like Databricks, local environments, and managing OpenAI training jobs.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "databricks_integration", "label": "Databricks Integration", "type": "module", "link": "databricks_integration.md"},
        {"id": "local_model_management", "label": "Local Model Management", "type": "module", "link": "local_model_management.md"},
        {"id": "openai_training_jobs", "label": "OpenAI Training Jobs", "type": "module", "link": "openai_training_jobs.md"},
        {"id": "lm_clients", "label": "LM Clients Module", "type": "external", "link": "lm_clients.md"}
    ],
    "edges": [
        {"source": "databricks_integration", "target": "lm_clients", "label": "configures & deploys via"},
        {"source": "local_model_management", "target": "lm_clients", "label": "provides local LM via"},
        {"source": "openai_training_jobs", "target": "lm_clients", "label": "manages finetuning for"}
    ],
    "groups": [
        {"id": "lm_providers_impl", "label": "Provider Implementations", "role": "generative", "nodes": ["databricks_integration", "local_model_management", "openai_training_jobs"]},
        {"id": "external_dependencies", "label": "External Dependencies", "role": "surface", "nodes": ["lm_clients"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph lm_providers_impl["Provider Implementations"]
        databricks_integration["Databricks Integration"]
        local_model_management["Local Model Management"]
        openai_training_jobs["OpenAI Training Jobs"]
    end

    subgraph external_dependencies["External Dependencies"]
        lm_clients["LM Clients Module"]
    end

    databricks_integration -->|
    configures & deploys via
    | lm_clients
    local_model_management -->|
    provides local LM via
    | lm_clients
    openai_training_jobs -->|
    manages finetuning for
    | lm_clients

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f

    class databricks_integration,local_model_management,openai_training_jobs generative
    class lm_clients surface

    click databricks_integration "databricks_integration.md"
    click local_model_management "local_model_management.md"
    click openai_training_jobs "openai_training_jobs.md"
    click lm_clients "lm_clients.md"
```