# Model Registry and Storage

This module manages the registration, storage, and retrieval of AI models. It includes client-side operations for interacting with model registries and server-side endpoints for serving and deleting models.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "registry_server_endpoints", "label": "Registry Server Endpoints", "type": "module", "link": "registry_server_endpoints.md"},
        {"id": "registry_client_operations", "label": "Registry Client Operations", "type": "module", "link": "registry_client_operations.md"},
        {"id": "blob_cache_management", "label": "Blob Cache Management", "type": "module", "link": "blob_cache_management.md"}
    ],
    "edges": [
        {"source": "registry_server_endpoints", "target": "registry_client_operations", "label": "delegates pull/push"},
        {"source": "registry_server_endpoints", "target": "blob_cache_management", "label": "accesses local models"},
        {"source": "registry_client_operations", "target": "blob_cache_management", "label": "caches blobs"}
    ],
    "groups": [
        {"id": "intake", "label": "API Intake", "role": "surface", "nodes": ["registry_server_endpoints"]},
        {"id": "core_logic", "label": "Core Logic", "role": "analytical", "nodes": ["registry_client_operations"]},
        {"id": "storage", "label": "Local Storage", "role": "data", "nodes": ["blob_cache_management"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph intake["API Intake"]
        registry_server_endpoints["Registry Server Endpoints"]
    end
    subgraph core_logic["Core Logic"]
        registry_client_operations["Registry Client Operations"]
    end
    subgraph storage["Local Storage"]
        blob_cache_management["Blob Cache Management"]
    end

    registry_server_endpoints -->|'delegates pull/push'| registry_client_operations
    registry_server_endpoints -->|'accesses local models'| blob_cache_management
    registry_client_operations -->|'caches blobs'| blob_cache_management

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class registry_server_endpoints surface
    class registry_client_operations analytical
    class blob_cache_management data

    click registry_server_endpoints "registry_server_endpoints.md"
    click registry_client_operations "registry_client_operations.md"
    click blob_cache_management "blob_cache_management.md"
```