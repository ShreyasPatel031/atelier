# traditional_sampling Module Documentation

## Introduction
The `traditional_sampling` module, a key component within `llama_cpp_sampling.core_sampling_techniques`, provides the foundational algorithms for traditional token sampling in language models. This module is responsible for applying various filtering and re-ranking strategies to the candidate token probabilities to improve the quality and diversity of generated text, including methods such as Top-K, Top-P, and Min-P sampling.

## Architecture
The `traditional_sampling` module is structured into a single sub-module that encapsulates its core functionality. This design promotes modularity and maintainability, allowing for independent development and testing of sampling techniques.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "sampling_methods", "label": "Core Sampling Methods", "type": "module", "link": "sampling_methods.md"}
    ],
    "edges": []
}
-->

```mermaid
graph TD
    sampling_methods[Core Sampling Methods]

    click sampling_methods "sampling_methods.md" "View Core Sampling Methods Documentation"
```

## Sub-modules

### [Core Sampling Methods](sampling_methods.md)
This sub-module (`sampling_methods`) implements the core logic for traditional token sampling, including Top-K, Top-P, and Min-P strategies. It takes raw token probabilities and applies these filters to produce a refined set of candidates for token selection.