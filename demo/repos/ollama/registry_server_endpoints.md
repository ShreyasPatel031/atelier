# Registry Server Endpoints

This module defines and tests the HTTP API endpoints that enable external clients and systems to interact with the model registry server. It handles requests for pulling and deleting model artifacts, including input validation and error handling.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "client", "label": "External System/User", "type": "external", "link": null},
        {"id": "pull_request", "label": "Receive Pull Request (\"/api/pull\")", "type": "component", "link": null},
        {"id": "delete_request", "label": "Receive Delete Request (\"/api/delete\")", "type": "component", "link": null},
        {"id": "model_storage", "label": "Model Registry and Storage", "type": "external", "link": "model_registry_and_storage.md"}
    ],
    "edges": [
        {"source": "client", "target": "pull_request", "label": "sends pull request"},
        {"source": "client", "target": "delete_request", "label": "sends delete request"},
        {"source": "pull_request", "target": "model_storage", "label": "accesses models"},
        {"source": "delete_request", "target": "model_storage", "label": "modifies models"}
    ],
    "groups": [
        {"id": "api_endpoints", "label": "Registry Server API", "role": "surface", "nodes": ["pull_request", "delete_request"]}
    ]
}
-->
```mermaid
flowchart TD
    client(("External System/User"))

    subgraph api_endpoints["Registry Server API"]
        pull_request["Receive Pull Request (/api/pull)"]
        delete_request["Receive Delete Request (/api/delete)"]
    end

    model_storage[("Model Registry and Storage")]

    client ==>|"sends pull request"| pull_request
    client ==>|"sends delete request"| delete_request
    pull_request -->|"accesses models"| model_storage
    delete_request -->|"modifies models"| model_storage

    classDef userNode fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e
    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class client userNode
    class pull_request,delete_request surface
    class model_storage data
```