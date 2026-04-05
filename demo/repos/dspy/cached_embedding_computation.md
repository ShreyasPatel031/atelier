# cached_embedding_computation Module

## Introduction
The `cached_embedding_computation` module provides a crucial layer for efficiently computing and managing embeddings within the dspy client ecosystem. It focuses on leveraging caching mechanisms to optimize performance for both synchronous and asynchronous embedding computations.

## Architecture Overview

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "embedding_caching_functions", "label": "Embedding Caching Functions", "type": "module", "link": "embedding_caching_functions.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    embedding_caching_functions[Embedding Caching Functions]
    click embedding_caching_functions "embedding_caching_functions.md" "View Embedding Caching Functions Module"
```

## Sub-modules

### [Embedding Caching Functions](embedding_caching_functions.md)
This sub-module encapsulates the core logic for performing cached embedding computations. It offers both synchronous (`_cached_compute_embeddings`) and asynchronous (`_cached_acompute_embeddings`) methods, ensuring that embedding generation is optimized through intelligent caching, reducing redundant computations and improving response times.

For more details, refer to the [Embedding Caching Functions documentation](embedding_caching_functions.md).
