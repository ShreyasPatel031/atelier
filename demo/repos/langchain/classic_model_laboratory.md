# classic_model_laboratory

## Introduction

The `classic_model_laboratory` module provides the `ModelLaboratory` class, a powerful utility designed to facilitate experimentation with and comparison of different language models or chains. It allows developers to evaluate the performance of various models on specific inputs, making it an invaluable tool for model selection, tuning, and understanding model behavior.

## Architecture and Core Components

The `classic_model_laboratory` module primarily consists of the `ModelLaboratory` class. This class acts as a central hub for managing and running multiple language model chains, simplifying the process of side-by-side comparison.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "model_laboratory", "label": "ModelLaboratory", "type": "component", "link": null},
        {"id": "chain_base", "label": "Chain (classic_chains_base)", "type": "external", "link": "classic_chains_base.md"},
        {"id": "base_llm", "label": "BaseLLM (core_language_models)", "type": "external", "link": "core_language_models.md"},
        {"id": "prompt_template", "label": "PromptTemplate (core_prompts)", "type": "external", "link": "core_prompts.md"},
        {"id": "llm_chain", "label": "LLMChain (classic_chains_base)", "type": "external", "link": "classic_chains_base.md"}
    ],
    "edges": [
        {"source": "model_laboratory", "target": "chain_base"},
        {"source": "model_laboratory", "target": "base_llm"},
        {"source": "model_laboratory", "target": "prompt_template"},
        {"source": "model_laboratory", "target": "llm_chain"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    model_laboratory[ModelLaboratory]
    chain_base[Chain (classic_chains_base)]
    base_llm[BaseLLM (core_language_models)]
    prompt_template[PromptTemplate (core_prompts)]
    llm_chain[LLMChain (classic_chains_base)]

    model_laboratory --> chain_base
    model_laboratory --> base_llm
    model_laboratory --> prompt_template
    model_laboratory --> llm_chain
```

### `ModelLaboratory` Class

#### Purpose

The `ModelLaboratory` class serves as a testing ground for comparing the outputs of various language models or pre-configured chains. It abstracts away the complexity of managing multiple model invocations and presents their outputs in a clear, comparative format.

#### Initialization (`__init__`)

The `ModelLaboratory` can be initialized directly with a sequence of `Chain` objects. Each chain must adhere to specific requirements:

- It must be an instance of a `Chain` (refer to [classic_chains_base.md](classic_chains_base.md) for more details on `Chain`).
- It must have exactly one input variable.
- It must have exactly one output variable.

An optional list of names can be provided to label each chain for clearer comparison. If provided, the length of `names` must match the number of chains.

#### Alternative Initialization (`from_llms` class method)

For convenience, `ModelLaboratory` provides a `from_llms` class method to initialize the laboratory directly from a list of `BaseLLM` instances. This method automatically wraps each `BaseLLM` in an `LLMChain` (see [classic_chains_base.md](classic_chains_base.md)) and applies an optional `PromptTemplate` (see [core_prompts.md](core_prompts.md)). If no prompt is provided, a default prompt with a single input variable `_input` is used.

- **`llms`**: A list of `BaseLLM` instances (refer to [core_language_models.md](core_language_models.md) for `BaseLLM` details).
- **`prompt`**: An optional `PromptTemplate` to be used with the `LLMChain` instances.

#### Comparison (`compare` method)

The `compare` method is the core functionality for running the experiment. It takes a single input `text` and feeds it through each configured chain. The output from each chain is then printed, allowing for direct comparison of how different models or chains respond to the same input.

- **`text`**: The input string to be processed by all models/chains in the laboratory.

## Relationships with Other Modules

- **[classic_chains_base.md](classic_chains_base.md)**: The `ModelLaboratory` heavily relies on the `Chain` abstraction and specifically utilizes `LLMChain` for its `from_llms` constructor. This module defines the fundamental interfaces and basic implementations of chains.
- **[core_language_models.md](core_language_models.md)**: The `from_llms` method directly interacts with `BaseLLM` instances provided by this module, which defines the core interface for language models.
- **[core_prompts.md](core_prompts.md)**: `PromptTemplate` from this module is used within the `from_llms` method to construct `LLMChain` instances, allowing for flexible prompt engineering across different models.