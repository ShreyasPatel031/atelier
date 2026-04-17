The `pydantic--pydantic-ai` repository provides a comprehensive framework for building, deploying, and evaluating AI agents. It offers core components for orchestrating agent workflows, flexible integrations with various large language models (LLMs) and external tools, mechanisms for durable and fault-tolerant execution, and advanced capabilities for defining and managing complex graph-based workflows. Additionally, it includes modules for evaluating agent performance, managing documentation, and providing a command-line interface.

### Architecture Overview

The repository is structured into several key functional areas, each encompassing modules responsible for specific aspects of AI agent development and operation. These areas interact to form a cohesive and extensible system.

```mermaid
graph TD
    %% Main Functional Areas — subgraph titles must be id["Quoted Label"] (& and spaces break unquoted titles)
    subgraph sg_ac["Agent Core"]
        AICore[Pydantic AI Core]
        AIAgent[Pydantic AI Agent]
        AICaps[Pydantic AI Capabilities]
        AITools[Pydantic AI Toolsets]
    end

    subgraph sg_mm["Model Management"]
        AIModels[Pydantic AI Models]
        AIProviders[Pydantic AI Providers]
        AIProfiles[Pydantic AI Model Profiles]
    end

    subgraph sg_wd["Workflow and Durability"]
        GraphCore[Pydantic Graph Core]
        GraphBeta[Pydantic Graph Beta]
        GraphPersist[Pydantic Graph Persistence]
        AIDurable[Pydantic AI Durable Execution]
    end

    subgraph sg_xt["Extensions and Common Tools"]
        AIExt[Pydantic AI Extensions]
        AICommonTools[Pydantic AI Common Tools]
    end

    subgraph sg_ev["Evaluation"]
        EvalOTel[Pydantic Evals OTel]
        EvalReport[Pydantic Evals Reporting]
    end

    subgraph sg_ui["User Interface and Documentation"]
        CLICLI[CLAI CLI]
        DocsSite[Docs Site]
        DocsHooks[Docs Hooks]
    end

    %% Core Relationships
    AIAgent --> AICore
    AICaps --> AIAgent
    AITools --> AICore
    AICore --> AIModels
    AIModels --> AIProviders
    AIProviders --> AIProfiles
    AIModels --> AIProfiles

    %% Workflow & Durability Relationships
    AIDurable --> AIAgent
    AIDurable --> AIModels
    GraphCore --> GraphBeta
    GraphCore --> GraphPersist
    AIAgent --> GraphCore %% Agents can use graphs for complex workflows

    %% Extensions & Tools Relationships
    AITools --> AIExt
    AITools --> AICommonTools

    %% Evaluation Relationships
    EvalOTel --> AIAgent %% Observes agent execution
    EvalReport --> EvalOTel %% Reports on observed data

    %% Documentation & CLI Relationships
    CLICLI --> AICore %% CLI interacts with core functionality
    DocsSite --> DocsHooks %% Docs site uses hooks for build process

    %% Clickable nodes
    click AICore "pydantic_ai_core.md" "View Pydantic AI Core Documentation"
    click AIAgent "pydantic_ai_agent.md" "View Pydantic AI Agent Documentation"
    click AICaps "pydantic_ai_capabilities.md" "View Pydantic AI Capabilities Documentation"
    click AITools "pydantic_ai_toolsets.md" "View Pydantic AI Toolsets Documentation"
    click AIModels "pydantic_ai_models.md" "View Pydantic AI Models Documentation"
    click AIProviders "pydantic_ai_providers.md" "View Pydantic AI Providers Documentation"
    click AIProfiles "pydantic_ai_model_profiles.md" "View Pydantic AI Model Profiles Documentation"
    click AIDurable "pydantic_ai_durable_execution.md" "View Pydantic AI Durable Execution Documentation"
    click AIExt "pydantic_ai_extensions.md" "View Pydantic AI Extensions Documentation"
    click AICommonTools "pydantic_ai_common_tools.md" "View Pydantic AI Common Tools Documentation"
    click GraphCore "pydantic_graph_core.md" "View Pydantic Graph Core Documentation"
    click GraphBeta "pydantic_graph_beta.md" "View Pydantic Graph Beta Documentation"
    click GraphPersist "pydantic_graph_persistence.md" "View Pydantic Graph Persistence Documentation"
    click EvalOTel "pydantic_evals_otel.md" "View Pydantic Evals OTel Documentation"
    click EvalReport "pydantic_evals_reporting.md" "View Pydantic Evals Reporting Documentation"
    click CLICLI "clai_cli.md" "View CLAI CLI Documentation"
    click DocsSite "docs_site.md" "View Docs Site Documentation"
    click DocsHooks "docs_hooks.md" "View Docs Hooks Documentation"
```