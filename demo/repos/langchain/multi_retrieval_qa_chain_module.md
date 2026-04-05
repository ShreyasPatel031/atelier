# Multi Retrieval QA Chain Module


This module introduces the `MultiRetrievalQAChain`, a sophisticated routing mechanism designed to intelligently direct natural language queries to the most appropriate retrieval-based question-answering (QA) chain. It allows developers to build dynamic and adaptable QA systems capable of leveraging multiple information sources effectively.

## Architecture and Component Relationships

The `multi_retrieval_qa_chain_module` revolves around the `MultiRetrievalQAChain` class, which extends the functionality of a [MultiRouteChain](classic_chains_router.md).

### MultiRetrievalQAChain

The core of this module, `MultiRetrievalQAChain`, is responsible for:
*   **Routing Decisions**: Utilizes an internal `router_chain` ([LLMRouterChain](llm_router_chain_module.md)) to analyze incoming queries and determine the most suitable `destination_chains`.
*   **Managing Destination Chains**: Holds a collection of named [BaseRetrievalQA](classic_chains_question_answering.md) instances, each configured for a specific retrieval task.
*   **Fallback Mechanism**: Employs a `default_chain` ([Chain](classic_chains_base.md)) to handle queries that the router cannot confidently assign to a specialized destination chain.

**Core Properties:**
*   `router_chain`: An instance of [LLMRouterChain](llm_router_chain_module.md) that makes routing decisions.
*   `destination_chains`: A mapping of string names to [BaseRetrievalQA](classic_chains_question_answering.md) objects.
*   `default_chain`: A [Chain](classic_chains_base.md) object used as a fallback.

### `from_retrievers` Class Method

This factory method provides a convenient way to instantiate `MultiRetrievalQAChain`. It streamlines the setup by:
*   Accepting an [BaseLanguageModel](core_language_models.md), a list of retriever information dictionaries, and optional default retriever and prompt configurations.
*   Constructing the necessary [LLMRouterChain](llm_router_chain_module.md) using a predefined router template and a [RouterOutputParser](core_output_parsers.md).
*   Creating individual [RetrievalQA](classic_chains_question_answering.md) chains for each provided retriever, associating them with the specified [PromptTemplate](core_prompts.md) and [BaseRetriever](core_retrievers.md).
*   Setting up the `default_chain`, which can be a provided chain, a [RetrievalQA](classic_chains_question_answering.md) based on a default retriever, or a [ConversationChain](classic_chains_conversational.md) if a `default_chain_llm` is specified.

## How the Module Fits into the Overall System

The `multi_retrieval_qa_chain_module` is situated within the `classic_chains_router.llm_based_routers` sub-package. It significantly enhances the system's ability to handle complex question-answering tasks by dynamically selecting the most relevant retrieval strategy. This module integrates various core components:
*   **Language Models**: Relies on [BaseLanguageModel](core_language_models.md) for both routing decisions and the underlying QA processes.
*   **Retrievers**: Utilizes [BaseRetriever](core_retrievers.md) instances to fetch relevant documents.
*   **Prompts**: Employs [PromptTemplate](core_prompts.md) for constructing effective prompts for both routing and QA.
*   **Output Parsers**: Leverages [RouterOutputParser](core_output_parsers.md) to interpret the router's decisions.
*   **Chains**: Builds upon [Chain](classic_chains_base.md), [LLMRouterChain](llm_router_chain_module.md), [RetrievalQA](classic_chains_question_answering.md), and [ConversationChain](classic_chains_conversational.md) to form a robust routing and QA solution.

This strategic placement allows the system to build intelligent agents that can interact with diverse knowledge bases and provide highly relevant answers.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "multi_retrieval_qa_chain", "label": "MultiRetrievalQAChain", "type": "component", "link": null},
        {"id": "from_retrievers_method", "label": "from_retrievers()", "type": "component", "link": null},
        {"id": "multi_route_chain", "label": "MultiRouteChain", "type": "external", "link": "classic_chains_router.md"},
        {"id": "llm_router_chain", "label": "LLMRouterChain", "type": "external", "link": "llm_router_chain_module.md"},
        {"id": "base_retrieval_qa", "label": "BaseRetrievalQA", "type": "external", "link": "classic_chains_question_answering.md"},
        {"id": "base_chain", "label": "Chain", "type": "external", "link": "classic_chains_base.md"},
        {"id": "base_language_model", "label": "BaseLanguageModel", "type": "external", "link": "core_language_models.md"},
        {"id": "base_retriever", "label": "BaseRetriever", "type": "external", "link": "core_retrievers.md"},
        {"id": "prompt_template", "label": "PromptTemplate", "type": "external", "link": "core_prompts.md"},
        {"id": "router_output_parser", "label": "RouterOutputParser", "type": "external", "link": "core_output_parsers.md"},
        {"id": "retrieval_qa", "label": "RetrievalQA", "type": "external", "link": "classic_chains_question_answering.md"},
        {"id": "conversation_chain", "label": "ConversationChain", "type": "external", "link": "classic_chains_conversational.md"}
    ],
    "edges": [
        {"source": "multi_retrieval_qa_chain", "target": "multi_route_chain", "label": "inherits"},
        {"source": "multi_retrieval_qa_chain", "target": "llm_router_chain", "label": "uses"},
        {"source": "multi_retrieval_qa_chain", "target": "base_retrieval_qa", "label": "manages"},
        {"source": "multi_retrieval_qa_chain", "target": "base_chain", "label": "uses as default"},
        {"source": "from_retrievers_method", "target": "multi_retrieval_qa_chain", "label": "creates"},
        {"source": "from_retrievers_method", "target": "base_language_model", "label": "uses"},
        {"source": "from_retrievers_method", "target": "base_retriever", "label": "uses"},
        {"source": "from_retrievers_method", "target": "prompt_template", "label": "uses"},
        {"source": "from_retrievers_method", "target": "llm_router_chain", "label": "creates"},
        {"source": "from_retrievers_method", "target": "router_output_parser", "label": "uses"},
        {"source": "from_retrievers_method", "target": "retrieval_qa", "label": "creates"},
        {"source": "from_retrievers_method", "target": "conversation_chain", "label": "creates"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    multi_retrieval_qa_chain[MultiRetrievalQAChain]
    from_retrievers_method[from_retrievers()]
    multi_route_chain[MultiRouteChain]:::external_node
    llm_router_chain[LLMRouterChain]:::external_node
    base_retrieval_qa[BaseRetrievalQA]:::external_node
    base_chain[Chain]:::external_node
    base_language_model[BaseLanguageModel]:::external_node
    base_retriever[BaseRetriever]:::external_node
    prompt_template[PromptTemplate]:::external_node
    router_output_parser[RouterOutputParser]:::external_node
    retrieval_qa[RetrievalQA]:::external_node
    conversation_chain[ConversationChain]:::external_node

    multi_retrieval_qa_chain -- inherits --> multi_route_chain
    multi_retrieval_qa_chain -- uses --> llm_router_chain
    multi_retrieval_qa_chain -- manages --> base_retrieval_qa
    multi_retrieval_qa_chain -- uses as default --> base_chain
    
    from_retrievers_method -- creates --> multi_retrieval_qa_chain
    from_retrievers_method -- uses --> base_language_model
    from_retrievers_method -- uses --> base_retriever
    from_retrievers_method -- uses --> prompt_template
    from_retrievers_method -- creates --> llm_router_chain
    from_retrievers_method -- uses --> router_output_parser
    from_retrievers_method -- creates --> retrieval_qa
    from_retrievers_method -- creates --> conversation_chain

    classDef external_node fill:#f9f,stroke:#333,stroke-width:2px;
```
