# DBOS Agent Module

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "dbos_agent_module", "label": "DBOS Agent Module", "type": "component", "link": null},
        {"id": "dbosagent_class", "label": "DBOSAgent Class", "type": "component", "link": null},
        {"id": "abstract_agent", "label": "AbstractAgent", "type": "external", "link": "pydantic_ai_agent_core.md"},
        {"id": "model_base", "label": "Model (Base)", "type": "external", "link": "pydantic_ai_models.md"},
        {"id": "toolsets_base", "label": "AbstractToolset (Base)", "type": "external", "link": "pydantic_ai_tools.md"},
        {"id": "dbos_framework", "label": "DBOS Framework", "type": "external", "link": "pydantic_ai_durable_execution.md"}
    ],
    "edges": [
        {"source": "dbos_agent_module", "target": "dbosagent_class"},
        {"source": "dbosagent_class", "target": "abstract_agent", "label": "Wraps"},
        {"source": "dbosagent_class", "target": "model_base", "label": "Integrates (via DBOSModel)"},
        {"source": "dbosagent_class", "target": "toolsets_base", "label": "Transforms (to DBOS versions)"},
        {"source": "dbosagent_class", "target": "dbos_framework", "label": "Utilizes Workflows"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    dbos_agent_module[DBOS Agent Module]
    dbosagent_class[DBOSAgent Class]
    abstract_agent[AbstractAgent]
    model_base[Model (Base)]
    toolsets_base[AbstractToolset (Base)]
    dbos_framework[DBOS Framework]

    dbos_agent_module --> dbosagent_class
    dbosagent_class -- Wraps --> abstract_agent
    dbosagent_class -- Integrates (via DBOSModel) --> model_base
    dbosagent_class -- Transforms (to DBOS versions) --> toolsets_base
    dbosagent_class -- Utilizes Workflows --> dbos_framework
```

The `dbos_agent` module provides the `DBOSAgent` class, which enables existing AI agents to leverage the Distributed Business Operating System (DBOS) framework for durable and fault-tolerant execution. It achieves this by wrapping an `AbstractAgent` and automatically offloading model requests, tool calls, and Multi-Cloud Platform (MCP) server communications to DBOS-managed steps and workflows.

## Purpose and Core Functionality

The primary purpose of the `DBOSAgent` is to introduce durability and recoverability to AI agent operations. By integrating with DBOS, agents can maintain their state and continue execution even in the face of failures, making them suitable for long-running or critical tasks. The core functionality includes:

*   **Agent Wrapping**: Encapsulates an existing `AbstractAgent` to seamlessly integrate DBOS capabilities without requiring modifications to the original agent's logic.
*   **Durable Model Execution**: Replaces the agent's underlying language model with a `DBOSModel`, ensuring that all model interactions are treated as durable DBOS steps.
*   **Durable Tool Execution**: Transforms standard toolsets (`MCPServer`, `FastMCPToolset`) into their DBOS-aware counterparts (`DBOSMCPServer`, `DBOSFastMCPToolset`), making tool calls durable operations within the DBOS workflow.
*   **Workflow Integration**: The `run` and `run_sync` methods of the wrapped agent are themselves wrapped within DBOS workflows, guaranteeing their durable execution and state management.
*   **Parallel Execution Modes**: Supports different parallel execution modes for tool calls (`parallel_ordered_events` or `sequential`), allowing control over how tool results are processed and events are emitted during DBOS replay.

## Architecture and Component Relationships

The `DBOSAgent` is designed as a `WrapperAgent`, inheriting from an internal `WrapperAgent` class and `DBOSConfiguredInstance`. This architecture allows it to intercept and augment the behavior of a standard agent.

At its core, `DBOSAgent` takes an instance of an [AbstractAgent](pydantic_ai_agent_core.md#abstractagent-class) during initialization. It then performs several key transformations:

1.  **Model Transformation**: The agent's `model` (an instance of [Model](pydantic_ai_models.md#model-class)) is replaced with a `DBOSModel`. This `DBOSModel` is responsible for orchestrating model requests as durable DBOS steps, respecting the provided `model_step_config`.

2.  **Toolset Transformation**: `DBOSAgent` iterates through the wrapped agent's [AbstractToolset](pydantic_ai_tools.md#abstracttoolset-class) instances. Specifically, if it encounters an `MCPServer` or `FastMCPToolset`, it wraps them with `DBOSMCPServer` and `DBOSFastMCPToolset` respectively. These DBOS-specific toolsets ensure that interactions with external services or complex multi-tool operations are also durable within the DBOS framework.

3.  **Workflow Orchestration**: The primary agent execution methods, `run` and `run_sync`, are decorated with `@DBOS.workflow`. This means that every time these methods are called, their execution is managed by the [DBOS Framework](pydantic_ai_durable_execution.md), allowing for features like idempotency, fault tolerance, and replayability.

The `_dbos_overrides` context manager is used internally to ensure that all subsequent operations within the agent's `run` or `iter` methods use the DBOS-wrapped model and toolsets, and adhere to the configured parallel execution mode.

It's important to note that direct streaming methods like `run_stream` and `run_stream_events` are generally not supported within a DBOS workflow context due to the nature of durable execution and state management. Users are advised to use an `event_stream_handler` with `run()` for event processing.

## How the Module Fits into the Overall System

The `dbos_agent` module is a vital component within the larger `pydantic_ai_durable_execution` ecosystem. It acts as the bridge between the flexible and powerful agent capabilities provided by `pydantic_ai_agent_core` and the robust durability features of the DBOS framework. Its integration allows developers to build AI agents that can reliably execute complex, multi-step tasks that involve interactions with models and tools, even in distributed and potentially unreliable environments.

By providing this durable execution layer, `dbos_agent` enhances the trustworthiness and operational stability of AI-powered applications, making them suitable for enterprise-grade solutions where reliability is paramount.

