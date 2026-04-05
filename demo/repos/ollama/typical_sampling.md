# `typical_sampling` Module Documentation

The `typical_sampling` module provides the implementation for the Typical Sampling technique, a method used in language models to select the next token based on its "typicality." This module is a crucial part of the `llama_cpp_sampling` library, specifically within the `adaptive_sampling` submodule, contributing to advanced token generation strategies.

### Purpose and Core Functionality

The primary purpose of the `typical_sampling` module is to refine the selection of the next token by filtering out tokens that are considered "atypical." It achieves this by:

1.  **Computing Softmax Probabilities:** Normalizing the raw logits into probabilities.
2.  **Calculating Entropy:** Determining the entropy of the probability distribution of candidate tokens.
3.  **Scoring Tokens by Typicality:** For each token, calculating the absolute difference between its negative log-probability and the overall entropy. Tokens closer to the entropy are considered more "typical."
4.  **Filtering based on `p` value:** Sorting tokens by their typicality scores and accumulating their probabilities. Only tokens whose cumulative probability sum is less than or equal to a configured `p` value (and optionally meeting a `min_keep` threshold) are retained for further processing.

This method helps in generating more coherent and contextually appropriate text by favoring tokens that are statistically more likely given the current context and the overall distribution.

### Architecture and Component Relationships

The `typical_sampling` module contains the core function `llama_sampler_typical_apply`, which orchestrates the typical sampling logic. It relies on external modules for fundamental operations and data structures.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "llama_sampler_typical_apply", "label": "llama_sampler_typical_apply", "type": "component", "link": null},
        {"id": "sampling_core_functions", "label": "Sampling Core Functions", "type": "external", "link": "sampling_core_functions.md"},
        {"id": "llama_cpp_sampling", "label": "Llama.cpp Sampling Module", "type": "external", "link": "llama_cpp_sampling.md"}
    ],
    "edges": [
        {"source": "llama_sampler_typical_apply", "target": "sampling_core_functions", "label": "calls llama_sampler_softmax_impl"},
        {"source": "llama_sampler_typical_apply", "target": "llama_cpp_sampling", "label": "uses data structures (llama_token_data_array, llama_sampler_typical)"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    llama_sampler_typical_apply[llama_sampler_typical_apply]
    sampling_core_functions[Sampling Core Functions]
    llama_cpp_sampling[Llama.cpp Sampling Module]
    llama_sampler_typical_apply --> |calls llama_sampler_softmax_impl| sampling_core_functions
    llama_sampler_typical_apply --> |uses data structures (llama_token_data_array, llama_sampler_typical)| llama_cpp_sampling
```

**Components:**

*   **`llama_sampler_typical_apply`**: The central function in this module. It takes a `llama_sampler` context (which includes the `p` and `min_keep` parameters for typical sampling) and a `llama_token_data_array` of candidate tokens. It modifies the `llama_token_data_array` in place to contain only the "typical" tokens.

**Dependencies:**

*   **`sampling_core_functions`**: This module, specifically the `llama_sampler_softmax_impl` function, is leveraged by `llama_sampler_typical_apply` to compute the softmax probabilities of the candidate tokens. Refer to [sampling_core_functions.md](sampling_core_functions.md) for more details.
*   **`llama_cpp_sampling`**: This is the overarching module that defines the fundamental data structures like `llama_token_data_array` (which holds token probabilities and other information) and the `llama_sampler` context structure, including `llama_sampler_typical` for configuring typical sampling parameters. Refer to [llama_cpp_sampling.md](llama_cpp_sampling.md) for more details.

### How it Fits into the Overall System

The `typical_sampling` module is an integral part of the `llama_cpp_sampling` library, which is responsible for various token selection strategies in the `llama.cpp` project. It is categorized under `adaptive_sampling` within `core_sampling_techniques`, indicating its role in providing more sophisticated and context-aware token generation.

By applying typical sampling, the overall language model system can produce outputs that are less prone to generating rare or irrelevant tokens, leading to higher-quality text generation. It works in conjunction with other sampling techniques that might be applied before or after it in the token selection pipeline.
