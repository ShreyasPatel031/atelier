# sampling_acceptance Module Documentation

The `sampling_acceptance` module focuses on the initial handling of token drafts for acceptance within the `llama.cpp` sampling process. It acts as a wrapper, preparing input data for the core sampling and acceptance logic.

## Core Functionality

The primary component of this module is `common_sampler_sample_and_accept_n`. This function serves as an entry point for processing a `draft` of `llama_token`s. It pre-processes the input draft by generating a corresponding vector of indices, then delegates the actual sampling and acceptance logic to another, likely more generalized, overload of `common_sampler_sample_and_accept_n`. This design suggests a separation of concerns, where `sampling_acceptance` handles the initial input formatting for a specific use case (likely related to speculative decoding or draft-based generation).

```cpp
std::vector<llama_token> common_sampler_sample_and_accept_n(struct common_sampler * gsmpl, struct llama_context * ctx, const llama_tokens & draft) {
    std::vector<int> idxs(draft.size() + 1);
    for (size_t i = 0; i < idxs.size(); ++i) {
        idxs[i] = i;
    }

    return common_sampler_sample_and_accept_n(gsmpl, ctx, idxs, draft);
}
```

## Architecture and Component Relationships

The `sampling_acceptance` module, through its `common_sampler_sample_and_accept_n` function, interacts with several key external components:

-   **`common_sampler`**: This struct (likely defined in [common_sampling](common_sampling.md)) encapsulates the state and configuration of the sampling process. The `common_sampler_sample_and_accept_n` function operates on an instance of this sampler.
-   **`llama_context`**: This struct (from [llama_cpp_context](llama_cpp_context.md)) represents the overall Llama model context, providing necessary environmental data for token generation.
-   **`llama_token`**: This type (from [llama_cpp_vocab](llama_cpp_vocab.md)) represents individual tokens in the Llama model's vocabulary. The `draft` is a collection of these tokens.
-   **Core `common_sampler_sample_and_accept_n` Logic**: The function acts as a wrapper, preparing arguments for a more comprehensive `common_sampler_sample_and_accept_n` function, which likely resides in the parent module, [sampler_utilities](sampler_utilities.md), or a related [sampling_core_functions](sampling_core_functions.md) module. This core logic is responsible for evaluating the `draft` tokens and deciding which ones to accept.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "sample_accept_wrapper", "label": "common_sampler_sample_and_accept_n (Wrapper)", "type": "component", "link": null},
        {"id": "sample_accept_core", "label": "common_sampler_sample_and_accept_n (Core Logic)", "type": "external", "link": "sampler_utilities.md"},
        {"id": "common_sampler_obj", "label": "Common Sampler Object", "type": "external", "link": "common_sampling.md"},
        {"id": "llama_context_obj", "label": "Llama Context Object", "type": "external", "link": "llama_cpp_context.md"},
        {"id": "llama_token_type_def", "label": "Llama Token Type", "type": "external", "link": "llama_cpp_vocab.md"}
    ],
    "edges": [
        {"source": "sample_accept_wrapper", "target": "sample_accept_core"},
        {"source": "sample_accept_wrapper", "target": "common_sampler_obj"},
        {"source": "sample_accept_wrapper", "target": "llama_context_obj"},
        {"source": "sample_accept_wrapper", "target": "llama_token_type_def"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    sample_accept_wrapper[common_sampler_sample_and_accept_n (Wrapper)]
    sample_accept_core[common_sampler_sample_and_accept_n (Core Logic)]
    common_sampler_obj[Common Sampler Object]
    llama_context_obj[Llama Context Object]
    llama_token_type_def[Llama Token Type]
    sample_accept_wrapper --> sample_accept_core
    sample_accept_wrapper --> common_sampler_obj
    sample_accept_wrapper --> llama_context_obj
    sample_accept_wrapper --> llama_token_type_def
```

## Integration with Overall System

The `sampling_acceptance` module is a leaf module within the `llama_cpp_common` component, specifically nested under `common_sampling` -> `sampling_core_functions` -> `sampler_utilities`. Its position indicates a specialized role within the broader sampling mechanism. It prepares and facilitates the acceptance phase of a draft sequence, which is a critical step in techniques like speculative decoding where a "draft" model proposes tokens that are then verified and accepted by a "main" model. This module ensures that the draft tokens are correctly formatted and passed to the underlying sampling and acceptance logic provided by the [sampler_utilities](sampler_utilities.md) or [sampling_core_functions](sampling_core_functions.md) module, ultimately contributing to efficient token generation in `llama.cpp`.