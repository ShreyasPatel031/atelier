# Module: `cache_management`

## Introduction
The `cache_management` module provides specialized caching policies for the Prefect integration within the `pydantic_ai_durable_execution` framework. Its primary role is to ensure efficient and consistent caching for `PrefectAgent` operations by carefully constructing cache keys based on input parameters.

## Purpose and Core Functionality
The core functionality of this module revolves around the `PrefectAgentInputs` class, which implements a `CachePolicy` specifically tailored for `PrefectAgent`. It's designed to compute robust cache keys for Prefect tasks by:
1.  **Filtering out volatile data**: It ignores nested 'timestamp' fields from inputs, which would otherwise lead to cache misses on identical logical inputs.
2.  **Serializing complex objects**: It intelligently serializes `RunContext` objects to include only hashable fields, ensuring that context-related information is considered without breaking the hashing mechanism.
3.  **Handling Toolsets**: It processes toolset inputs to ensure they are represented consistently for cache key generation.

This meticulous approach to cache key generation is crucial for the performance and reliability of durable AI agents running within the Prefect orchestration environment.

## Architecture and Component Relationships

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "prefect_agent_inputs", "label": "PrefectAgentInputs", "type": "component", "link": null},
        {"id": "replace_toolsets", "label": "_replace_toolsets", "type": "component", "link": null},
        {"id": "replace_run_context", "label": "_replace_run_context", "type": "component", "link": null},
        {"id": "strip_timestamps", "label": "_strip_timestamps", "type": "component", "link": null},
        {"id": "prefect_agent", "label": "PrefectAgent", "type": "external", "link": "agent_integration.md"},
        {"id": "base_cache_policy", "label": "Base Cache Policy (INPUTS)", "type": "external", "link": "prefect_integration.md"},
        {"id": "run_context", "label": "RunContext", "type": "external", "link": "pydantic_ai_durable_execution.md"}
    ],
    "edges": [
        {"source": "prefect_agent_inputs", "target": "replace_toolsets"},
        {"source": "prefect_agent_inputs", "target": "replace_run_context"},
        {"source": "prefect_agent_inputs", "target": "strip_timestamps"},
        {"source": "prefect_agent_inputs", "target": "base_cache_policy"},
        {"source": "replace_run_context", "target": "run_context"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    prefect_agent_inputs[PrefectAgentInputs]
    replace_toolsets[_replace_toolsets]
    replace_run_context[_replace_run_context]
    strip_timestamps[_strip_timestamps]
    prefect_agent[PrefectAgent]:::external
    base_cache_policy[Base Cache Policy (INPUTS)]:::external
    run_context[RunContext]:::external

    prefect_agent_inputs --> replace_toolsets
    prefect_agent_inputs --> replace_run_context
    prefect_agent_inputs --> strip_timestamps
    prefect_agent_inputs --> base_cache_policy
    replace_run_context --> run_context

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

The `cache_management` module, specifically `PrefectAgentInputs`, depends on several internal helper functions (`_replace_toolsets`, `_replace_run_context`, `_strip_timestamps`) to preprocess inputs before delegating the final cache key computation to a base `CachePolicy` (represented as `INPUTS`). It is conceptually used by the `PrefectAgent` to manage caching.

## How the Module Fits into the Overall System
This module is a crucial part of the `prefect_integration` module, which in turn is a sub-module of `pydantic_ai_durable_execution`. It provides the caching mechanism that allows `PrefectAgent` instances to benefit from Prefect's caching capabilities. By intelligently generating cache keys, it ensures that repeated executions of AI agent tasks with identical effective inputs can retrieve results from the cache, significantly improving performance and reducing computational overhead for durable AI agents.

## Core Components

### `PrefectAgentInputs`
`pydantic_ai_slim.pydantic_ai.durable_exec.prefect._cache_policies.PrefectAgentInputs`

This class is a specialized `CachePolicy` designed for the `PrefectAgent`. Its `compute_key` method orchestrates the process of generating a unique cache key based on the provided task context, inputs, and flow parameters. It achieves this by:
*   Calling `_replace_toolsets` to standardize toolset representations.
*   Invoking `_replace_run_context` to transform `RunContext` objects into hashable forms.
*   Utilizing `_strip_timestamps` to remove ephemeral timestamp data.
*   Finally, deferring to a base `INPUTS.compute_key` for the actual hashing of the pre-processed inputs.

## Dependencies
*   **prefect_integration**: This module is a child of `prefect_integration` and is directly used by the [PrefectAgent](agent_integration.md) for its caching needs.
*   **pydantic_ai_durable_execution**: The module processes `RunContext` objects, which are fundamental to the [durable execution framework](pydantic_ai_durable_execution.md).
