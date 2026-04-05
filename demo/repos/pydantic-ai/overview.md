The `pydantic-ai-src` repository provides a comprehensive framework for building, evaluating, and deploying AI agents and models, leveraging Pydantic for structured data. It encompasses core agent orchestration, model integrations with various providers, a rich set of tools and capabilities, durable execution mechanisms, graph-based workflow management, and a robust evaluation system. Additionally, it includes utilities for UI, CLI, and repository maintenance.

### Architecture Overview

The repository is structured into several key functional areas, each comprising multiple modules that work together to deliver a complete AI development and deployment ecosystem. The core AI framework forms the foundation, supported by specialized modules for durable execution, graph-based workflows, and a dedicated evaluation system. User interaction is facilitated through UI and CLI modules, while miscellaneous utilities and repository infrastructure modules provide essential support.

```mermaid
graph TD
    subgraph Core AI Framework
        A[pydantic_ai_agent_core]
        B[pydantic_ai_models]
        C[pydantic_ai_providers]
        D[pydantic_ai_tools]
        E[pydantic_ai_capabilities]
        F[pydantic_ai_embeddings]
    end

    subgraph Durable Execution & Workflows
        G[pydantic_ai_durable_execution]
        H[pydantic_graph_core]
        I[pydantic_graph_beta]
        J[pydantic_graph_persistence]
    end

    subgraph Evaluation System
        K[pydantic_evals_core]
        L[pydantic_evals_evaluators]
        M[pydantic_evals_reporting]
    end

    subgraph Utilities & Interfaces
        N[pydantic_ai_misc]
        O[pydantic_ai_ui]
        P[clai_cli]
    end

    subgraph Repository Infrastructure
        Q[docs_site_utils]
        R[docs_hooks]
        S[repository_scripts]
    end

    %% Core AI Framework relationships
    A --> B
    A --> D
    A --> E
    B --> C
    B --> F
    D --> F

    %% Durable Execution & Workflows relationships
    G --> A
    G --> B
    G --> D
    H --> I
    H --> J
    I --> J

    %% Evaluation System relationships
    K --> B
    K --> L
    K --> M

    %% Utilities & Interfaces relationships
    A --> N
    B --> N
    D --> N
    O --> A
    P --> A

    %% Cross-cutting concerns
    H --> A
    I --> A

    click A "pydantic_ai_agent_core.md" "View Agent Core Documentation"
    click B "pydantic_ai_models.md" "View AI Models Documentation"
    click C "pydantic_ai_providers.md" "View AI Providers Documentation"
    click D "pydantic_ai_tools.md" "View AI Tools Documentation"
    click E "pydantic_ai_capabilities.md" "View AI Capabilities Documentation"
    click F "pydantic_ai_embeddings.md" "View AI Embeddings Documentation"
    click G "pydantic_ai_durable_execution.md" "View Durable Execution Documentation"
    click H "pydantic_graph_core.md" "View Graph Core Documentation"
    click I "pydantic_graph_beta.md" "View Graph Beta Documentation"
    click J "pydantic_graph_persistence.md" "View Graph Persistence Documentation"
    click K "pydantic_evals_core.md" "View Evals Core Documentation"
    click L "pydantic_evals_evaluators.md" "View Evals Evaluators Documentation"
    click M "pydantic_evals_reporting.md" "View Evals Reporting Documentation"
    click N "pydantic_ai_misc.md" "View AI Misc Utilities Documentation"
    click O "pydantic_ai_ui.md" "View AI UI Documentation"
    click P "clai_cli.md" "View CLAI CLI Documentation"
    click Q "docs_site_utils.md" "View Docs Site Utilities Documentation"
    click R "docs_hooks.md" "View Docs Hooks Documentation"
    click S "repository_scripts.md" "View Repository Scripts Documentation"
```