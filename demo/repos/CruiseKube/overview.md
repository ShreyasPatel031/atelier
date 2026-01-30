CruiseKube is an intelligent Kubernetes resource optimization and management system. It monitors cluster health, collects metrics, processes Out-Of-Memory (OOM) events, generates resource recommendations, and automates the application of these recommendations to enhance cluster efficiency and stability. The repository is structured into several core modules that handle data persistence, metric collection, cluster interaction, task scheduling, and API exposure.

## Architecture Overview

The CruiseKube repository is organized into several key modules, each responsible for a specific domain of functionality. These modules interact to provide a comprehensive solution for Kubernetes resource management and optimization.

```mermaid
graph TD
    subgraph Core Infrastructure
        CFG[Configuration]
        APP[Application Ports]
        DAT[Data Types]
        TSC[Task Core]
        CLS[Cluster Scheduler]
    end

    subgraph Data & Persistence
        DBA[Database Adapters]
        DSR[Data Storage Repository]
        MPP[Metrics Provider Prometheus]
    end

    subgraph Cluster Operations
        CLM[Cluster Management]
        OOM[OOM Event Processing]
    end

    subgraph Application Logic
        TSI[Task Implementations]
        API[API Handlers]
        REC[Recommender Client]
        TSU[Task Utilities]
    end

    % Core Infrastructure Dependencies
    CFG --> DAT
    APP --> DAT
    TSC --> DAT

    % Data & Persistence Flow
    DBA --> CFG
    DBA -- implements --> APP
    DBA --> DAT
    DSR --> APP
    DSR --> DAT
    MPP --> CFG
    MPP --> DAT

    % Cluster Operations Dependencies
    CLM --> CLS
    CLM --> TSC
    CLM --> MPP
    OOM --> DSR
    OOM --> CFG
    OOM --> DAT

    % Application Logic Dependencies
    TSI --> TSC
    TSI --> CFG
    TSI --> MPP
    TSI --> DSR
    TSI --> REC
    TSI --> TSU
    TSI --> DAT

    API --> TSC
    API --> CFG
    API --> CLS
    API --> DSR

    REC --> CFG
    REC --> DAT

    TSU --> DAT

    click DBA "database_adapters.md" "View Database Adapters Documentation"
    click MPP "metrics_provider_prometheus.md" "View Metrics Provider Prometheus Documentation"
    click REC "recommender_client.md" "View Recommender Client Documentation"
    click CLM "cluster_management.md" "View Cluster Management Documentation"
    click CLS "cluster_scheduler.md" "View Cluster Scheduler Documentation"
    click CFG "configuration.md" "View Configuration Documentation"
    click API "api_handlers.md" "View API Handlers Documentation"
    click OOM "oom_event_processing.md" "View OOM Event Processing Documentation"
    click APP "application_ports.md" "View Application Ports Documentation"
    click DSR "data_storage_repository.md" "View Data Storage Repository Documentation"
    click TSC "task_core.md" "View Task Core Documentation"
    click TSI "task_implementations.md" "View Task Implementations Documentation"
    click TSU "task_utilities.md" "View Task Utilities Documentation"
    click DAT "data_types.md" "View Data Types Documentation"
```

## Core Modules

*   **[Configuration](configuration.md)**: Manages application-wide settings and parameters, providing a centralized source of truth for various components.
*   **[Data Types](data_types.md)**: Defines fundamental data structures used across the system for statistics, workload analysis, and other critical information.
*   **[Application Ports](application_ports.md)**: Specifies core interfaces for interacting with the application's data persistence layer, abstracting database implementations.
*   **[Database Adapters](database_adapters.md)**: Provides concrete implementations for connecting to various database systems (e.g., PostgreSQL, SQLite) and defines data models for persistence.
*   **[Data Storage Repository](data_storage_repository.md)**: Offers an abstraction layer for data persistence operations, encapsulating database interactions.
*   **[Metrics Provider Prometheus](metrics_provider_prometheus.md)**: Integrates with Prometheus to retrieve and process metric data, crucial for real-time and historical analysis.
*   **[Recommender Client](recommender_client.md)**: Provides client functionality to interact with an external recommender service for cluster information and resource recommendations.
*   **[Cluster Management](cluster_management.md)**: Orchestrates interactions with multiple Kubernetes clusters, managing clients, fetching information, and scheduling tasks.
*   **[Cluster Scheduler](cluster_scheduler.md)**: Manages and executes various periodic and event-driven tasks across the cluster, ensuring efficient operation.
*   **[Task Core](task_core.md)**: Defines the fundamental `Task` interface, establishing a contract for all scheduled and executable operations within the system.
*   **[Task Implementations](task_implementations.md)**: Houses concrete implementations of various automated tasks, such as applying recommendations, cleaning up OOM events, and fetching metrics.
*   **[Task Utilities](task_utilities.md)**: Provides a collection of utility functions and data structures crucial for various tasks, including metrics handling, node statistics, and workload abstractions.
*   **[OOM Event Processing](oom_event_processing.md)**: Responsible for observing, collecting, and processing Out-Of-Memory (OOM) events within Kubernetes clusters.
*   **[API Handlers](api_handlers.md)**: Defines and manages API endpoints that allow external systems or internal components to trigger various tasks and retrieve information.