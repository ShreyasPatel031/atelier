## AlfWorld Dataset Module
This module provides the `AlfWorld` dataset, including an `AlfWorld` class for managing the dataset creation and an `env_worker` function to interact with the external `AlfredTWEnv` for environment steps.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "alfworld_manager",
            "label": "AlfWorld Dataset Manager",
            "type": "component",
            "link": null
        },
        {
            "id": "env_worker",
            "label": "Environment Interaction Worker",
            "type": "component",
            "link": null
        },
        {
            "id": "alfworld_env",
            "label": "AlfredTWEnv (External)",
            "type": "external",
            "link": null
        },
        {
            "id": "dataset_management",
            "label": "Dataset Management",
            "type": "external",
            "link": "dataset_management.md"
        }
    ],
    "edges": [
        {
            "source": "alfworld_manager",
            "target": "dataset_management",
            "label": "generates train/dev sets"
        },
        {
            "source": "alfworld_manager",
            "target": "env_worker",
            "label": "manages via EnvPool"
        },
        {
            "source": "env_worker",
            "target": "alfworld_env",
            "label": "interacts with environment"
        }
    ],
    "groups": [
        {
            "id": "alfworld_data_pipeline",
            "label": "AlfWorld Data Pipeline",
            "role": "data",
            "nodes": [
                "alfworld_manager",
                "env_worker"
            ]
        }
    ]
}
-->

```mermaid
flowchart TD
    subgraph alfworld_data_pipeline["AlfWorld Data Pipeline"]
        alfworld_manager["AlfWorld Dataset Manager"]
        env_worker["Environment Interaction Worker"]
    end

    alfworld_env["AlfredTWEnv (External)"]
    dataset_management["Dataset Management"]

    alfworld_manager -->|'''generates train/dev sets'''| dataset_management
    alfworld_manager -->|'''manages via EnvPool'''| env_worker
    env_worker -->|'''interacts with environment'''| alfworld_env

    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    class alfworld_manager,env_worker data
```