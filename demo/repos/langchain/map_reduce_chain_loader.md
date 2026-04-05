# map_reduce_chain_loader Module Documentation

This module provides functionality for loading and configuring a `MapReduceDocumentsChain`, a specialized chain designed for summarizing documents. It implements a two-step process: a "map" step where each document is individually summarized, followed by a "reduce" step that combines these individual summaries into a cohesive final result. An optional "collapse" step is included to handle cases where intermediate summaries exceed a predefined token limit.

## Architecture and Component Relationships

The `map_reduce_chain_loader` module is a leaf module, primarily exposing the `_load_map_reduce_chain` function to construct a `MapReduceDocumentsChain`. This function orchestrates the creation and assembly of several internal chain components, utilizing external language model, prompt, and callback functionalities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "load_mr_chain", "label": "_load_map_reduce_chain", "type": "component", "link": null},
        {"id": "map_llm_chain", "label": "Map LLMChain", "type": "component", "link": null},
        {"id": "reduce_llm_chain", "label": "Reduce LLMChain", "type": "component", "link": null},
        {"id": "combine_docs_chain", "label": "CombineDocumentsChain (StuffDocumentsChain)", "type": "component", "link": null},
        {"id": "collapse_docs_chain", "label": "CollapseDocumentsChain (Optional StuffDocumentsChain)", "type": "component", "link": null},
        {"id": "reduce_docs_process", "label": "ReduceDocumentsChain", "type": "component", "link": null},
        {"id": "final_mr_chain", "label": "MapReduceDocumentsChain", "type": "component", "link": null},
        {"id": "base_llm", "label": "BaseLanguageModel", "type": "external", "link": "core_language_models.md"},
        {"id": "base_prompt", "label": "BasePromptTemplate", "type": "external", "link": "core_prompts.md"},
        {"id": "callbacks", "label": "Callbacks", "type": "external", "link": "core_callbacks.md"}
    ],
    "edges": [
        {"source": "load_mr_chain", "target": "map_llm_chain"},
        {"source": "load_mr_chain", "target": "reduce_llm_chain"},
        {"source": "load_mr_chain", "target": "combine_docs_chain"},
        {"source": "load_mr_chain", "target": "collapse_docs_chain"},
        {"source": "load_mr_chain", "target": "reduce_docs_process"},
        {"source": "load_mr_chain", "target": "final_mr_chain"},
        {"source": "map_llm_chain", "target": "base_llm"},
        {"source": "map_llm_chain", "target": "base_prompt"},
        {"source": "reduce_llm_chain", "target": "base_llm"},
        {"source": "reduce_llm_chain", "target": "base_prompt"},
        {"source": "combine_docs_chain", "target": "reduce_llm_chain"},
        {"source": "collapse_docs_chain", "target": "base_llm"},
        {"source": "collapse_docs_chain", "target": "base_prompt"},
        {"source": "reduce_docs_process", "target": "combine_docs_chain"},
        {"source": "reduce_docs_process", "target": "collapse_docs_chain"},
        {"source": "final_mr_chain", "target": "map_llm_chain"},
        {"source": "final_mr_chain", "target": "reduce_docs_process"},
        {"source": "load_mr_chain", "target": "base_llm"},
        {"source": "load_mr_chain", "target": "callbacks"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    load_mr_chain[_load_map_reduce_chain]
    map_llm_chain[Map LLMChain]
    reduce_llm_chain[Reduce LLMChain]
    combine_docs_chain[CombineDocumentsChain (StuffDocumentsChain)]
    collapse_docs_chain[CollapseDocumentsChain (Optional StuffDocumentsChain)]
    reduce_docs_process[ReduceDocumentsChain]
    final_mr_chain[MapReduceDocumentsChain]
    base_llm[BaseLanguageModel]:::external
    base_prompt[BasePromptTemplate]:::external
    callbacks[Callbacks]:::external

    load_mr_chain --> map_llm_chain
    load_mr_chain --> reduce_llm_chain
    load_mr_chain --> combine_docs_chain
    load_mr_chain --> collapse_docs_chain
    load_mr_chain --> reduce_docs_process
    load_mr_chain --> final_mr_chain
    
    map_llm_chain --> base_llm
    map_llm_chain --> base_prompt
    reduce_llm_chain --> base_llm
    reduce_llm_chain --> base_prompt
    
    combine_docs_chain --> reduce_llm_chain
    
    collapse_docs_chain --> base_llm
    collapse_docs_chain --> base_prompt
    
    reduce_docs_process --> combine_docs_chain
    reduce_docs_process --> collapse_docs_chain
    
    final_mr_chain --> map_llm_chain
    final_mr_chain --> reduce_docs_process

    load_mr_chain --> base_llm
    load_mr_chain --> callbacks

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

## Module Components

### `_load_map_reduce_chain`

This function is responsible for constructing and configuring a `MapReduceDocumentsChain`. It takes various parameters to customize the behavior of the map, reduce, and optional collapse steps.

**Purpose:**

To provide a flexible and configurable way to create a document summarization chain that first processes documents individually (map) and then aggregates their summaries (reduce), with an optional mechanism to handle large intermediate results (collapse).

**Core Logic:**

1.  **Map Chain Initialization:** An `LLMChain` is created for the "map" step, using the provided `llm` and `map_prompt`. This chain is responsible for summarizing individual documents.
2.  **Reduce Chain Initialization:** Another `LLMChain` is created for the "reduce" step. It can use a separate `reduce_llm` if provided, otherwise, it defaults to the main `llm`. This chain uses the `combine_prompt` to combine intermediate summaries.
3.  **Combine Documents Chain:** A `StuffDocumentsChain` is initialized, wrapping the `reduce_chain`. This chain is used to "stuff" the mapped summaries into the `combine_prompt` for the reduction step.
4.  **Optional Collapse Chain:** If a `collapse_prompt` is provided, an additional `StuffDocumentsChain` (the `collapse_chain`) is created. This chain is used to summarize intermediate summaries if they exceed the `token_max` threshold, preventing token limit issues during the reduction process. It can also use a separate `collapse_llm`.
5.  **Reduce Documents Chain:** A `ReduceDocumentsChain` is constructed, integrating the `combine_documents_chain` and the optional `collapse_documents_chain`. This chain manages the overall reduction process, including the application of the collapse step when necessary.
6.  **MapReduceDocumentsChain Construction:** Finally, a `MapReduceDocumentsChain` is assembled, taking the `map_chain` and the `reduce_documents_chain` as its core components. This is the main chain returned by the function.

**Parameters:**

*   `llm` ([BaseLanguageModel](core_language_models.md)): The language model to use for the map and, by default, the reduce and collapse steps.
*   `map_prompt` ([BasePromptTemplate](core_prompts.md)): The prompt template used to summarize each document during the map phase.
*   `combine_prompt` ([BasePromptTemplate](core_prompts.md)): The prompt template used to combine the individual summaries in the reduce phase.
*   `combine_document_variable_name` (str): The variable name in the `combine_prompt` where the mapped summaries will be inserted.
*   `map_reduce_document_variable_name` (str): The variable name in the `map_prompt` where the document text for the map step is inserted.
*   `collapse_prompt` ([BasePromptTemplate](core_prompts.md) | None): An optional prompt used to collapse intermediate summaries if they exceed `token_max`.
*   `reduce_llm` ([BaseLanguageModel](core_language_models.md) | None): An optional, separate language model to use specifically for the reduce step. If not provided, `llm` is used.
*   `collapse_llm` ([BaseLanguageModel](core_language_models.md) | None): An optional, separate language model to use specifically for the collapse step. If not provided, `llm` is used.
*   `verbose` (bool | None): If `True`, enables verbose logging for debugging and progress tracking.
*   `token_max` (int): The maximum token count for intermediate summaries before the `collapse_chain` is triggered.
*   `callbacks` ([Callbacks](core_callbacks.md)): Optional callback handlers for logging, tracing, and other event-driven functionalities.
*   `collapse_max_retries` (int | None): The maximum number of retries for the collapse step if it encounters an error.
*   `**kwargs`: Additional keyword arguments passed directly to the `MapReduceDocumentsChain` constructor.

**Returns:**

*   `MapReduceDocumentsChain`: An instance of `MapReduceDocumentsChain` configured for summarization with map, reduce, and optional collapse capabilities.

## How it Fits into the Overall System

The `map_reduce_chain_loader` module is a crucial part of the `classic_chains_summarize` package, which is responsible for providing various document summarization strategies within the LangChain ecosystem. By offering a robust `MapReduceDocumentsChain`, it enables developers to efficiently summarize large volumes of text by breaking down the problem into manageable sub-problems (mapping) and then synthesizing the results (reducing).

It depends on core LangChain components such as:
*   [core_language_models](core_language_models.md) for providing the underlying language model capabilities.
*   [core_prompts](core_prompts.md) for defining the prompts used in different stages of the summarization process.
*   [core_callbacks](core_callbacks.md) for integrating with tracing and callback systems.

This module contributes to the classic chain architecture by encapsulating a common and powerful pattern for document processing, making it easily accessible and configurable for various summarization tasks.
