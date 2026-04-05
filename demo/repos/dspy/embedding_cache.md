# Embedding Cache Module

The `embedding_cache` module provides a caching mechanism for embedding computations within the DSPy framework. Its primary goal is to enhance performance by storing and reusing previously computed embeddings, thereby reducing redundant API calls to embedding models.

## Architecture Overview

This module is designed to integrate seamlessly with various language models (LMs) and retrieve components. It acts as an intermediary, caching embedding results to speed up operations that frequently require vector representations of text.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "cached_embedding_computation", "label": "Cached Embedding Computation", "type": "module", "link": "cached_embedding_computation.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    cached_embedding_computation[Cached Embedding Computation]

    click cached_embedding_computation "cached_embedding_computation.md" "View Cached Embedding Computation Module"
```

## Sub-modules

### [Cached Embedding Computation](cached_embedding_computation.md)
This sub-module encapsulates the core logic for computing and caching embeddings, offering both synchronous and asynchronous interfaces. It transparently handles the caching mechanism, ensuring that embedding requests are fulfilled efficiently, either by returning a cached result or by computing and then storing a new one.