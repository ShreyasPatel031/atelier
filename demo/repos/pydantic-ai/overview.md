The `pydantic-ai-src` repository offers a comprehensive framework for building, evaluating, and deploying intelligent AI agents. It empowers developers to define complex agent behaviors, integrate with diverse Large Language Models (LLMs) and embedding services, incorporate various tools, enable durable execution, and connect to interactive user interfaces. Additionally, it provides a robust evaluation system to define structured datasets, implement various metrics, and orchestrate both offline and real-time online evaluations, ensuring continuous monitoring and improvement of AI performance. It's designed for developers and researchers who need structured, observable, and reliable AI systems.

### Key User Workflows

1.  **Build & Orchestrate AI Agents**: Users define agent specifications, capabilities, and tools, then orchestrate their execution through a graph-based workflow, handling inputs, processing steps, and managing outputs.
2.  **Integrate Diverse AI Models & Tools**: Connect to a wide array of LLM providers, embedding models, and external/internal tools via a unified interface, leveraging Pydantic for structured data handling.
3.  **Evaluate AI System Performance**: Create and manage datasets, execute various evaluators (from simple checks to complex statistical analyses), and generate reports to assess and improve AI model and agent quality.
4.  **Develop & Document**: Utilize developer tools for testing, verification, and manage comprehensive, searchable documentation for the entire project.

### Architecture Overview

<!-- DIAGRAM_JSON
{
    "direction": "LR",
    "nodes": [
        {
            "id": "AgentState",
            "label": "(\"Agent State\")",
            "type": "component"
        },
        {
            "id": "AnalyzeReports",
            "label": "Analyze Reports & Metrics",
            "type": "module",
            "link": "reporting_and_rendering.md"
        },
        {
            "id": "BrowseDocs",
            "label": "Browse Documentation",
            "type": "module",
            "link": "documentation_site_management.md"
        },
        {
            "id": "BuiltinTools",
            "label": "Access Built-in Tools",
            "type": "module",
            "link": "builtin_tools.md"
        },
        {
            "id": "ConnectLLMs",
            "label": "Connect to LLM Providers",
            "type": "module",
            "link": "model_provider_integrations.md"
        },
        {
            "id": "DefineAgent",
            "label": "Define Agent Behavior",
            "type": "module",
            "link": "agent_definition.md"
        },
        {
            "id": "DefineDatasets",
            "label": "Define & Generate Datasets",
            "type": "module",
            "link": "dataset_management.md"
        },
        {
            "id": "DocsContent",
            "label": "(\"Documentation Content\")",
            "type": "component"
        },
        {
            "id": "EvalResults",
            "label": "(\"Evaluation Results\")",
            "type": "component"
        },
        {
            "id": "EvaluatorLogic",
            "label": "Implement Evaluator Logic",
            "type": "module",
            "link": "evaluator_core.md"
        },
        {
            "id": "ExternalTools",
            "label": "Integrate External Toolsets",
            "type": "module",
            "link": "external_toolset_integrations.md"
        },
        {
            "id": "HandleOutput",
            "label": "Process Agent Output",
            "type": "module",
            "link": "agent_output_handling.md"
        },
        {
            "id": "ManageCapabilities",
            "label": "Manage Agent Capabilities",
            "type": "module",
            "link": "capabilities_base.md"
        },
        {
            "id": "ManageToolsets",
            "label": "Manage Toolsets & Tools",
            "type": "module",
            "link": "toolset_management.md"
        },
        {
            "id": "OrchestrateFlow",
            "label": "Orchestrate Agent Workflow",
            "type": "module",
            "link": "agent_execution_graph.md"
        },
        {
            "id": "RunDurableAgent",
            "label": "Run Durable Agent",
            "type": "module",
            "link": "durable_execution_temporal.md"
        },
        {
            "id": "RunEvaluations",
            "label": "Execute Evaluations",
            "type": "module",
            "link": "online_evaluation_system.md"
        },
        {
            "id": "SearchDocs",
            "label": "Search Documentation",
            "type": "module",
            "link": "search_and_indexing.md"
        },
        {
            "id": "SearchIndex",
            "label": "(\"Search Index\")",
            "type": "component"
        },
        {
            "id": "UseDevTools",
            "label": "Use Developer Utilities",
            "type": "module",
            "link": "developer_utility_scripts.md"
        },
        {
            "id": "UseEmbeddings",
            "label": "Generate Embeddings",
            "type": "module",
            "link": "embedding_core.md"
        },
        {
            "id": "UserInterface",
            "label": "Interact via UI",
            "type": "module",
            "link": "ui_vercel_ai_adapter.md"
        },
        {
            "id": "user",
            "label": "User",
            "type": "component"
        }
    ],
    "edges": [
        {
            "source": "user",
            "target": "DefineAgent",
            "label": "configures"
        },
        {
            "source": "user",
            "target": "UserInterface",
            "label": "interacts with"
        },
        {
            "source": "user",
            "target": "RunEvaluations",
            "label": "initiates"
        },
        {
            "source": "user",
            "target": "UseDevTools",
            "label": "develops with"
        },
        {
            "source": "DefineAgent",
            "target": "OrchestrateFlow",
            "label": "defines workflow"
        },
        {
            "source": "DefineAgent",
            "target": "ManageCapabilities",
            "label": "configures"
        },
        {
            "source": "ManageCapabilities",
            "target": "OrchestrateFlow",
            "label": "enables"
        },
        {
            "source": "OrchestrateFlow",
            "target": "HandleOutput",
            "label": "produces"
        },
        {
            "source": "RunDurableAgent",
            "target": "OrchestrateFlow",
            "label": "wraps execution"
        },
        {
            "source": "ExternalTools",
            "target": "ManageToolsets",
            "label": "extends"
        },
        {
            "source": "BuiltinTools",
            "target": "ManageToolsets",
            "label": "provides"
        },
        {
            "source": "RunEvaluations",
            "target": "DefineDatasets",
            "label": "uses"
        },
        {
            "source": "RunEvaluations",
            "target": "EvaluatorLogic",
            "label": "applies"
        },
        {
            "source": "AnalyzeReports",
            "target": "EvalResults",
            "label": "reads"
        },
        {
            "source": "BrowseDocs",
            "target": "SearchDocs",
            "label": "queries"
        },
        {
            "source": "OrchestrateFlow",
            "target": "ConnectLLMs",
            "label": "requests LLM/Tool"
        },
        {
            "source": "ConnectLLMs",
            "target": "OrchestrateFlow",
            "label": "returns response"
        },
        {
            "source": "ManageToolsets",
            "target": "OrchestrateFlow",
            "label": "provides callable"
        },
        {
            "source": "UseEmbeddings",
            "target": "ManageCapabilities",
            "label": "provides vectors"
        },
        {
            "source": "OrchestrateFlow",
            "target": "AgentState",
            "label": "persists state"
        },
        {
            "source": "AgentState",
            "target": "OrchestrateFlow",
            "label": "restores state"
        },
        {
            "source": "HandleOutput",
            "target": "RunEvaluations",
            "label": "provides agent output"
        },
        {
            "source": "ConnectLLMs",
            "target": "RunEvaluations",
            "label": "provides model output"
        },
        {
            "source": "UserInterface",
            "target": "OrchestrateFlow",
            "label": "sends commands"
        },
        {
            "source": "HandleOutput",
            "target": "UserInterface",
            "label": "streams output"
        },
        {
            "source": "UseDevTools",
            "target": "DocsContent",
            "label": "generates"
        },
        {
            "source": "DocsContent",
            "target": "SearchDocs",
            "label": "indexed by"
        },
        {
            "source": "DocsContent",
            "target": "BrowseDocs",
            "label": "served by"
        },
        {
            "source": "SearchDocs",
            "target": "SearchIndex",
            "label": "updates"
        },
        {
            "source": "SearchIndex",
            "target": "BrowseDocs",
            "label": "used by"
        },
        {
            "source": "RunEvaluations",
            "target": "EvalResults",
            "label": "writes"
        }
    ],
    "groups": [
        {
            "id": "agent_core",
            "label": "Agent Core & Orchestration",
            "nodes": [
                "DefineAgent",
                "OrchestrateFlow",
                "ManageCapabilities",
                "HandleOutput",
                "RunDurableAgent"
            ]
        },
        {
            "id": "ai_ecosystem",
            "label": "AI Model & Tool Ecosystem",
            "nodes": [
                "ConnectLLMs",
                "UseEmbeddings",
                "ManageToolsets",
                "ExternalTools",
                "BuiltinTools"
            ]
        },
        {
            "id": "evaluation",
            "label": "Evaluation & Reporting",
            "nodes": [
                "DefineDatasets",
                "RunEvaluations",
                "AnalyzeReports",
                "EvaluatorLogic"
            ]
        },
        {
            "id": "project_support",
            "label": "Project Support & UI",
            "nodes": [
                "UserInterface",
                "BrowseDocs",
                "UseDevTools",
                "SearchDocs"
            ]
        },
        {
            "id": "data_storage",
            "label": "Stored Data",
            "nodes": [
                "AgentState",
                "EvalResults",
                "DocsContent",
                "SearchIndex"
            ]
        }
    ],
    "_auto_generated": "r1_overview_synthesis"
}
-->

```mermaid
flowchart LR
    user(("User"))
    user ==>|"configures"| DefineAgent
    user ==>|"interacts with"| UserInterface
    user ==>|"initiates"| RunEvaluations
    user ==>|"develops with"| UseDevTools

    subgraph agent_core["Agent Core & Orchestration"]
        DefineAgent["Define Agent Behavior"]
        OrchestrateFlow["Orchestrate Agent Workflow"]
        ManageCapabilities["Manage Agent Capabilities"]
        HandleOutput["Process Agent Output"]
        RunDurableAgent["Run Durable Agent"]
    end

    subgraph ai_ecosystem["AI Model & Tool Ecosystem"]
        ConnectLLMs["Connect to LLM Providers"]
        UseEmbeddings["Generate Embeddings"]
        ManageToolsets["Manage Toolsets & Tools"]
        ExternalTools["Integrate External Toolsets"]
        BuiltinTools["Access Built-in Tools"]
    end

    subgraph evaluation["Evaluation & Reporting"]
        DefineDatasets["Define & Generate Datasets"]
        RunEvaluations["Execute Evaluations"]
        AnalyzeReports["Analyze Reports & Metrics"]
        EvaluatorLogic["Implement Evaluator Logic"]
    end

    subgraph project_support["Project Support & UI"]
        UserInterface["Interact via UI"]
        BrowseDocs["Browse Documentation"]
        UseDevTools["Use Developer Utilities"]
        SearchDocs["Search Documentation"]
    end

    subgraph data_storage["Stored Data"]
        AgentState[("Agent State")]
        EvalResults[("Evaluation Results")]
        DocsContent[("Documentation Content")]
        SearchIndex[("Search Index")]
    end

    %% Agent Core & Orchestration internal connections
    DefineAgent -->|"defines workflow"| OrchestrateFlow
    DefineAgent -->|"configures"| ManageCapabilities
    ManageCapabilities -->|"enables"| OrchestrateFlow
    OrchestrateFlow -->|"produces"| HandleOutput
    RunDurableAgent -.->|"wraps execution"| OrchestrateFlow

    %% AI Model & Tool Ecosystem internal connections
    ExternalTools -->|"extends"| ManageToolsets
    BuiltinTools -->|"provides"| ManageToolsets

    %% Evaluation & Reporting internal connections
    RunEvaluations -->|"uses"| DefineDatasets
    RunEvaluations -->|"applies"| EvaluatorLogic
    AnalyzeReports -->|"reads"| EvalResults

    %% Project Support & UI internal connections
    BrowseDocs -->|"queries"| SearchDocs

    %% Cross-group connections
    OrchestrateFlow -->|"requests LLM/Tool"| ConnectLLMs
    ConnectLLMs -->|"returns response"| OrchestrateFlow
    ManageToolsets -->|"provides callable"| OrchestrateFlow
    UseEmbeddings -->|"provides vectors"| ManageCapabilities

    OrchestrateFlow -->|"persists state"| AgentState
    AgentState -->|"restores state"| OrchestrateFlow

    HandleOutput -.->|"provides agent output"| RunEvaluations
    ConnectLLMs -.->|"provides model output"| RunEvaluations

    UserInterface -->|"sends commands"| OrchestrateFlow
    HandleOutput -->|"streams output"| UserInterface

    UseDevTools -->|"generates"| DocsContent
    DocsContent -->|"indexed by"| SearchDocs
    DocsContent -->|"served by"| BrowseDocs
    SearchDocs -->|"updates"| SearchIndex
    SearchIndex -->|"used by"| BrowseDocs

    RunEvaluations -->|"writes"| EvalResults

    classDef userNode fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e
    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class user userNode
    class DefineAgent,OrchestrateFlow,ManageCapabilities,HandleOutput,RunDurableAgent generative
    class ConnectLLMs,UseEmbeddings,ManageToolsets,ExternalTools,BuiltinTools data
    class DefineDatasets,RunEvaluations,AnalyzeReports,EvaluatorLogic analytical
    class UserInterface,BrowseDocs,UseDevTools,SearchDocs surface
    class AgentState,EvalResults,DocsContent,SearchIndex data

    click DefineAgent "agent_definition.md" "View Agent Definition"
    click OrchestrateFlow "agent_execution_graph.md" "View Agent Execution Graph"
    click ManageCapabilities "capabilities_base.md" "View Capabilities Base"
    click HandleOutput "agent_output_handling.md" "View Agent Output Handling"
    click RunDurableAgent "durable_execution_temporal.md" "View Durable Execution with Temporal"

    click ConnectLLMs "model_provider_integrations.md" "View Model Provider Integrations"
    click UseEmbeddings "embedding_core.md" "View Embedding Core"
    click ManageToolsets "toolset_management.md" "View Toolset Management"
    click ExternalTools "external_toolset_integrations.md" "View External Toolset Integrations"
    click BuiltinTools "builtin_tools.md" "View Built-in Tools"

    click DefineDatasets "dataset_management.md" "View Dataset Management"
    click RunEvaluations "online_evaluation_system.md" "View Online Evaluation System"
    click AnalyzeReports "reporting_and_rendering.md" "View Reporting and Rendering"
    click EvaluatorLogic "evaluator_core.md" "View Evaluator Core"

    click UserInterface "ui_vercel_ai_adapter.md" "View Vercel AI Adapter"
    click BrowseDocs "documentation_site_management.md" "View Documentation Site Management"
    click UseDevTools "developer_utility_scripts.md" "View Developer Utility Scripts"
    click SearchDocs "search_and_indexing.md" "View Search and Indexing"
```