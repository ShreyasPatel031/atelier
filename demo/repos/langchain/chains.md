# Chains Module

The Chains module provides a framework for creating structured sequences of calls to components like models and retrievers, offering specialized chains for conversational AI, document processing, routing, and integration with OpenAI functions and tools.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "core_chains", "label": "Core Chain Abstractions", "type": "module", "link": "core_chains.md"},
        {"id": "conversational_retrieval_chains", "label": "Conversational & Retrieval Chains", "type": "module", "link": "conversational_retrieval_chains.md"},
        {"id": "specialized_workflow_chains", "label": "Specialized Workflow Chains", "type": "module", "link": "specialized_workflow_chains.md"},
        {"id": "openai_function_tool_chains", "label": "OpenAI Function & Tool Chains", "type": "module", "link": "openai_function_tool_chains.md"},
        {"id": "router_chains", "label": "Routing Chains", "type": "module", "link": "router_chains.md"},
        {"id": "chain_loading_utilities", "label": "Chain Loading & Construction", "type": "module", "link": "chain_loading_utilities.md"},
        {"id": "document_qa_summarization_chains", "label": "Document QA & Summarization Chains", "type": "module", "link": "document_qa_summarization_chains.md"},
        {"id": "models_and_embeddings", "label": "Models & Embeddings", "type": "external"},
        {"id": "runnable_framework", "label": "Runnable Framework", "type": "external"},
        {"id": "callbacks_and_tracing", "label": "Callbacks & Tracing", "type": "external"},
        {"id": "memory", "label": "Memory", "type": "external"},
        {"id": "retrieval_systems", "label": "Retrieval Systems", "type": "external"},
        {"id": "document_management", "label": "Document Management", "type": "external"},
        {"id": "agents", "label": "Agents", "type": "external"}
    ],
    "edges": [
        {"source": "core_chains", "target": "runnable_framework", "label": "builds upon"},
        {"source": "core_chains", "target": "callbacks_and_tracing", "label": "integrates"},
        {"source": "core_chains", "target": "memory", "label": "manages state with"},
        {"source": "chain_loading_utilities", "target": "core_chains", "label": "constructs"},
        {"source": "conversational_retrieval_chains", "target": "core_chains", "label": "extends"},
        {"source": "conversational_retrieval_chains", "target": "retrieval_systems", "label": "uses"},
        {"source": "conversational_retrieval_chains", "target": "models_and_embeddings", "label": "generates questions with"},
        {"source": "specialized_workflow_chains", "target": "core_chains", "label": "implements"},
        {"source": "specialized_workflow_chains", "target": "models_and_embeddings", "label": "interacts with"},
        {"source": "specialized_workflow_chains", "target": "retrieval_systems", "label": "utilizes"},
        {"source": "openai_function_tool_chains", "target": "core_chains", "label": "leverages"},
        {"source": "openai_function_tool_chains", "target": "models_and_embeddings", "label": "uses OpenAI functions/tools"},
        {"source": "router_chains", "target": "core_chains", "label": "orchestrates"},
        {"source": "router_chains", "target": "models_and_embeddings", "label": "decides routes with"},
        {"source": "router_chains", "target": "retrieval_systems", "label": "routes to"},
        {"source": "document_qa_summarization_chains", "target": "core_chains", "label": "processes via"},
        {"source": "document_qa_summarization_chains", "target": "models_and_embeddings", "label": "summarizes and answers with"},
        {"source": "document_qa_summarization_chains", "target": "document_management", "label": "manages documents from"},
        {"source": "agents", "target": "core_chains", "label": "integrates with"}
    ],
    "groups": [
        {"id": "foundations", "label": "Foundational Abstractions", "role": "analytical", "nodes": ["core_chains"]},
        {"id": "utilities", "label": "Chain Utilities", "role": "analytical", "nodes": ["chain_loading_utilities"]},
        {"id": "flows", "label": "Interaction Flows", "role": "generative", "nodes": ["conversational_retrieval_chains", "specialized_workflow_chains", "openai_function_tool_chains", "router_chains", "document_qa_summarization_chains"]}
    ]
}
-->
```

```mermaid
flowchart TD
    subgraph foundations["Foundational Abstractions"]
        core_chains["Core Chain Abstractions"]
    end

    subgraph utilities["Chain Utilities"]
        chain_loading_utilities["Chain Loading & Construction"]
    end

    subgraph flows["Interaction Flows"]
        conversational_retrieval_chains["Conversational & Retrieval Chains"]
        specialized_workflow_chains["Specialized Workflow Chains"]
        openai_function_tool_chains["OpenAI Function & Tool Chains"]
        router_chains["Routing Chains"]
        document_qa_summarization_chains["Document QA & Summarization Chains"]
    end

    models_and_embeddings[("Models & Embeddings")]
    runnable_framework[("Runnable Framework")]
    callbacks_and_tracing[("Callbacks & Tracing")]
    memory[("Memory")]
    retrieval_systems[("Retrieval Systems")]
    document_management[("Document Management")]
    agents[("Agents")]

    core_chains -->|"builds upon"| runnable_framework
    core_chains -->|"integrates"| callbacks_and_tracing
    core_chains -->|"manages state with"| memory
    chain_loading_utilities -->|"constructs"| core_chains
    conversational_retrieval_chains -->|"extends"| core_chains
    conversational_retrieval_chains -->|"uses"| retrieval_systems
    conversational_retrieval_chains -->|"generates questions with"| models_and_embeddings
    specialized_workflow_chains -->|"implements"| core_chains
    specialized_workflow_chains -->|"interacts with"| models_and_embeddings
    specialized_workflow_chains -->|"utilizes"| retrieval_systems
    openai_function_tool_chains -->|"leverages"| core_chains
    openai_function_tool_chains -->|"uses OpenAI functions/tools"| models_and_embeddings
    router_chains -->|"orchestrates"| core_chains
    router_chains -->|"decides routes with"| models_and_embeddings
    router_chains -->|"routes to"| retrieval_systems
    document_qa_summarization_chains -->|"processes via"| core_chains
    document_qa_summarization_chains -->|"summarizes and answers with"| models_and_embeddings
    document_qa_summarization_chains -->|"manages documents from"| document_management
    agents -.->|"integrates with"| core_chains

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef externalNode fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f

    class core_chains,chain_loading_utilities analytical
    class conversational_retrieval_chains,specialized_workflow_chains,openai_function_tool_chains,router_chains,document_qa_summarization_chains generative
    class models_and_embeddings,runnable_framework,callbacks_and_tracing,memory,retrieval_systems,document_management,agents externalNode

    click core_chains "core_chains.md"
    click conversational_retrieval_chains "conversational_retrieval_chains.md"
    click specialized_workflow_chains "specialized_workflow_chains.md"
    click openai_function_tool_chains "openai_function_tool_chains.md"
    click router_chains "router_chains.md"
    click chain_loading_utilities "chain_loading_utilities.md"
    click document_qa_summarization_chains "document_qa_summarization_chains.md"