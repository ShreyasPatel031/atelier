# Embedding Caching Module
This module provides cached wrappers for synchronous and asynchronous embedding computation functions, optimizing performance by storing and retrieving embeddings to reduce redundant calls to language models.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "sync_cache", "label": "_cached_compute_embeddings()", "type": "component", "link": null},
        {"id": "async_cache", "label": "_cached_acompute_embeddings()", "type": "component", "link": null},
        {"id": "embed_services", "label": "Embedding Services", "type": "external", "link": "embedding_services.md"},
        {"id": "lm_clients_mod", "label": "LM Clients", "type": "external", "link": "lm_clients.md"},
        {"id": "cache_store", "label": "Cache Store", "type": "data", "link": null}
    ],
    "edges": [
        {"source": "sync_cache", "target": "embed_services", "label": "delegates to"},
        {"source": "async_cache", "target": "embed_services", "label": "delegates to"},
        {"source": "sync_cache", "target": "cache_store", "label": "reads/writes"},
        {"source": "async_cache", "target": "cache_store", "label": "reads/writes"},
        {"source": "embed_services", "target": "lm_clients_mod", "label": "generates via"}
    ],
    "groups": [
        {"id": "cache_handlers", "label": "Embedding Cache Handlers", "role": "analytical", "nodes": ["sync_cache", "async_cache"]}
    ]
}
-->

```mermaid
flowchart TD
    subgraph cache_handlers["Embedding Cache Handlers"]
        sync_cache["_cached_compute_embeddings()"]
        async_cache["_cached_acompute_embeddings()"]
    end

    embed_services["Embedding Services"]
    lm_clients_mod["LM Clients"]
    cache_store[("Cache Store")]

    sync_cache -->|'delegates to'| embed_services
    async_cache -->|'delegates to'| embed_services
    sync_cache -.->|'reads/writes'| cache_store
    async_cache -.->|'reads/writes'| cache_store
    embed_services -->|'generates via'| lm_clients_mod

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    class sync_cache,async_cache analytical
    class cache_store data
    click embed_services "embedding_services.md" "View Embedding Services Module"
    click lm_clients_mod "lm_clients.md" "View LM Clients Module"
```