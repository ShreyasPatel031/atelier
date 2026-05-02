# Registry Client Operations

This module orchestrates client-side interactions with the model registry, handling both pulling model layers and manifests from remote sources and pushing local model changes to the registry.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "pull_operations", "label": "Pull Operations", "type": "module", "link": "pull_operations.md"},
        {"id": "push_operations", "label": "Push Operations", "type": "module", "link": "push_operations.md"},
        {"id": "local_registry_management", "label": "Local Registry Management", "type": "module", "link": "local_registry_management.md"},
        {"id": "blob_cache", "label": "Blob Cache", "type": "external", "link": "blob_cache_management.md"},
        {"id": "remote_registry", "label": "Remote Registry", "type": "external"}
    ],
    "edges": [
        {"source": "pull_operations", "target": "remote_registry", "label": "fetches layers"},
        {"source": "pull_operations", "target": "blob_cache", "label": "stores layers"},
        {"source": "push_operations", "target": "blob_cache", "label": "reads layers"},
        {"source": "push_operations", "target": "remote_registry", "label": "uploads layers"},
        {"source": "local_registry_management", "target": "blob_cache", "label": "manages local entries"}
    ],
    "groups": [
        {"id": "client_core", "label": "Client Core Logic", "role": "surface", "nodes": ["pull_operations", "push_operations"]},
        {"id": "local_ops", "label": "Local Operations", "role": "analytical", "nodes": ["local_registry_management"]},
        {"id": "data_store", "label": "Data Storage", "role": "data", "nodes": ["blob_cache"]},
        {"id": "external_services", "label": "External Services", "role": "external", "nodes": ["remote_registry"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph client_core["Client Core Logic"]
        pull_operations["Pull Operations"]
        push_operations["Push Operations"]
    end

    subgraph local_ops["Local Operations"]
        local_registry_management["Local Registry Management"]
    end

    subgraph data_store["Data Storage"]
        blob_cache[("Blob Cache")]
    end

    subgraph external_services["External Services"]
        remote_registry["Remote Registry"]
    end

    pull_operations -->|"fetches layers"| remote_registry
    pull_operations -->|"stores layers"| blob_cache
    push_operations -->|"reads layers"| blob_cache
    push_operations -->|"uploads layers"| remote_registry
    local_registry_management -->|"manages local entries"| blob_cache

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef external fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f

    class pull_operations,push_operations surface
    class local_registry_management analytical
    class blob_cache data
    class remote_registry external

    click pull_operations "pull_operations.md"
    click push_operations "push_operations.md"
    click local_registry_management "local_registry_management.md"
    click blob_cache "blob_cache_management.md"
```