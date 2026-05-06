# OpenCode Integration
This module handles the dynamic generation and resolution of OpenCode's model configuration, ensuring new models are correctly integrated and managing a persistent list of recently used models for quick access within the OpenCode environment.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "build_config",
            "label": "Build OpenCode Configuration",
            "type": "component",
            "link": null
        },
        {
            "id": "resolve_config",
            "label": "Resolve OpenCode Configuration",
            "type": "component",
            "link": null
        },
        {
            "id": "update_recent",
            "label": "Update Recent Models List",
            "type": "component",
            "link": null
        },
        {
            "id": "opencode_json",
            "label": "OpenCode Config (JSON)",
            "type": "data",
            "link": null
        },
        {
            "id": "model_json_state",
            "label": "Model State (model.json)",
            "type": "data",
            "link": null
        },
        {
            "id": "external_integrations",
            "label": "External Integrations",
            "type": "external",
            "link": "external_integrations.md"
        }
    ],
    "edges": [
        {
            "source": "external_integrations",
            "target": "build_config",
            "label": "requests config for models"
        },
        {
            "source": "external_integrations",
            "target": "resolve_config",
            "label": "requests resolved config"
        },
        {
            "source": "build_config",
            "target": "opencode_json",
            "label": "generates"
        },
        {
            "source": "build_config",
            "target": "update_recent",
            "label": "updates recent"
        },
        {
            "source": "resolve_config",
            "target": "opencode_json",
            "label": "provides"
        },
        {
            "source": "resolve_config",
            "target": "model_json_state",
            "label": "reads recent from"
        },
        {
            "source": "update_recent",
            "target": "model_json_state",
            "label": "persists updates to"
        }
    ],
    "groups": [
        {
            "id": "config_flow",
            "label": "OpenCode Configuration Flow",
            "role": "analytical",
            "nodes": [
                "build_config",
                "resolve_config",
                "update_recent"
            ]
        }
    ]
}
-->

```mermaid
flowchart TD
    subgraph config_flow["OpenCode Configuration Flow"]
        build_config["Build OpenCode Configuration"]
        resolve_config["Resolve OpenCode Configuration"]
        update_recent["Update Recent Models List"]
    end

    external_integrations["External Integrations"]
    opencode_json[("OpenCode Config (JSON)")]
    model_json_state[("Model State (model.json)")]

    external_integrations -->|'''requests config for models'''| build_config
    external_integrations -->|'''requests resolved config'''| resolve_config
    build_config -->|'''generates'''| opencode_json
    build_config -->|'''updates recent'''| update_recent
    resolve_config -->|'''provides'''| opencode_json
    resolve_config -.->|'''reads recent from'''| model_json_state
    update_recent -->|'''persists updates to'''| model_json_state

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef external fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f

    class build_config,resolve_config,update_recent analytical
    class opencode_json,model_json_state data
    class external_integrations external

    click external_integrations "external_integrations.md" "View External Integrations Module"
```