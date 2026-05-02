# `temporal_agent_orchestration` Module

## Introduction

The `temporal_agent_orchestration` module is a crucial component within the `pydantic_ai_slim` framework, specifically designed to enable the execution of AI agents within [Temporal workflows](https://temporal.io/). This module provides the `TemporalAgent` class, which acts as a wrapper around a standard `AbstractAgent`, offloading its intensive operations—such as model inferences, tool executions, and event stream handling—to Temporal activities. This design pattern ensures that AI agent runs are durable, scalable, and resilient to failures, leveraging Temporal's robust workflow capabilities.

By integrating with Temporal, the `TemporalAgent` allows long-running, stateful agent interactions to be managed reliably. This is particularly important for complex AI applications where agents might need to interact with external systems, perform multi-step reasoning, or handle human-in-the-loop interventions over extended periods. The module ensures that the agent's state can be safely persisted and rehydrated, and that operations can be retried automatically upon transient failures.

## `TemporalAgent`

The `TemporalAgent` class is the core of this module. It extends `WrapperAgent` and provides the necessary logic to adapt a regular `AbstractAgent` for durable execution in a Temporal workflow environment.

### Core Functionality

`TemporalAgent` wraps an existing agent and transforms its operations into Temporal activities. This includes:

*   **Model Requests**: All calls to the underlying LLM model are converted into Temporal activities, allowing for durable, retryable, and observable model interactions.
*   **Tool Executions**: When the agent decides to use a tool, the tool's execution is also offloaded to a Temporal activity. This enables robust handling of external API calls, code execution, or data retrieval operations.
*   **Event Stream Handling**: Event streams generated during an agent's run can be processed by a dedicated Temporal activity, ensuring that real-time feedback and state updates are reliably managed.

### `TemporalAgent` Initialization

The constructor of `TemporalAgent` offers extensive configuration options to control how the agent's operations are offloaded to Temporal activities:

```python
class TemporalAgent(WrapperAgent[AgentDepsT, OutputDataT]):
    def __init__(
        self,
        wrapped: AbstractAgent[AgentDepsT, OutputDataT],
        *,
        name: str | None = None,
        models: Mapping[str, Model] | None = None,
        provider_factory: TemporalProviderFactory | None = None,
        event_stream_handler: EventStreamHandler[AgentDepsT] | None = None,
        activity_config: ActivityConfig | None = None,
        model_activity_config: ActivityConfig | None = None,
        toolset_activity_config: dict[str, ActivityConfig] | None = None,
        tool_activity_config: dict[str, dict[str, ActivityConfig | Literal[False]]] | None = None,
        run_context_type: type[TemporalRunContext[AgentDepsT]] = TemporalRunContext[AgentDepsT],
        temporalize_toolset_func: Callable[
            [
                AbstractToolset[AgentDepsT],
                str,
                ActivityConfig,
                dict[str, ActivityConfig | Literal[False]],
                type[AgentDepsT],
                type[TemporalRunContext[AgentDepsT]],
                AbstractAgent[AgentDepsT, Any] | None,
            ],
            AbstractToolset[AgentDepsT],
        ] = temporalize_toolset,
    ):
        # ... (implementation details)
```

**Key Parameters:**

*   `wrapped`: The instance of [`AbstractAgent`][agent_base_interface.md] to be wrapped and made Temporal-aware.
*   `name`: A unique name for the agent, which is used to identify its activities within the Temporal workflow. This is mandatory for Temporal integration.
*   `models`: A mapping of model instances to be registered. These models will be wrapped by an internal `TemporalModel` to turn model requests into Temporal activities.
*   `provider_factory`: A callable used to instantiate models from provider strings within the Temporal workflow, allowing for custom API key injection or configuration.
*   `event_stream_handler`: An optional handler for processing agent stream events. If provided, event handling will also be executed as a Temporal activity.
*   `activity_config`: The base [`ActivityConfig`](https://python.temporal.io/temporalio.client.ActivityConfig.html) to apply to all Temporal activities. By default, a `start_to_close_timeout` of 60 seconds is used.
*   `model_activity_config`: Specific `ActivityConfig` for model request activities, merged with the base `activity_config`.
*   `toolset_activity_config`: Specific `ActivityConfig` for toolset-level activities (e.g., `get_tools`, `call_tool`), identified by toolset ID. Merged with base `activity_config`.
*   `tool_activity_config`: Granular `ActivityConfig` for individual tool call activities, identified by toolset ID and tool name. Can also be `False` to disable activity execution for specific non-IO tools.
*   `run_context_type`: A subclass of [`TemporalRunContext`][temporal_workflow_context.md] used to serialize and deserialize the run context for persistence and transfer between workflow and activities.
*   `temporalize_toolset_func`: A function, typically [`temporalize_toolset`][temporal_toolset_adapters.md], responsible for adapting "leaf" toolsets (those directly implementing tool listing and calling) into [`TemporalWrapperToolset`][temporal_toolset_adapters.md] instances, making their methods Temporal-compatible.

### Properties

*   `name`: Returns the agent's unique name. Cannot be changed after creation.
*   `model`: Returns the `TemporalModel` instance that wraps the underlying agent's model, enabling Temporal activity offloading.
*   `event_stream_handler`: Returns the event stream handler. If called within a Temporal workflow, it returns a proxy that calls the `event_stream_handler_activity`.
*   `toolsets`: Returns the sequence of Temporal-adapted toolsets.
*   `temporal_activities`: A list of all Temporal activity functions generated for this agent, which must be registered with the Temporal worker.

### Methods

`TemporalAgent` overrides several methods from its base `AbstractAgent` to enforce Temporal workflow compatibility:

*   `run()`: The primary method to execute the agent. When called inside a Temporal workflow, certain parameters like `event_stream_handler` cannot be set at runtime and must be configured during agent initialization. The method leverages the internal `_temporal_model` for model interactions.
*   `run_sync()`: This method is explicitly disallowed inside a Temporal workflow, as workflows must use asynchronous operations (`await agent.run()`).
*   `run_stream()`: Similar to `run_sync()`, streaming methods are not permitted directly within Temporal workflows. Instead, users should set an `event_stream_handler` at agent creation time and use `agent.run()` to process events via an activity.
*   `run_stream_events()`: Also disallowed within Temporal workflows for the same reasons as `run_stream()`.
*   `override()`: A context manager to temporarily change agent configuration. Within a Temporal workflow, overriding `model`, `toolsets`, or `tools` is restricted as these must be durably configured at agent creation.

### Temporal Overrides (`_temporal_overrides`)

An internal `_temporal_overrides` context manager is used to activate workflow-specific behaviors. When inside a Temporal workflow, it ensures that the agent uses the `_temporal_model` and the adapted toolsets (`_temporal_toolsets`). It also disables threading operations to maintain workflow determinism.

## Architecture Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "temporal_agent", "label": "TemporalAgent", "type": "component", "link": null},
        {"id": "wrapped_agent", "label": "Wrapped Agent (AbstractAgent)", "type": "external", "link": "agent_base_interface.md"},
        {"id": "temporal_workflow_runtime", "label": "Temporal Workflow Runtime", "type": "external", "link": "https://temporal.io/"},
        {"id": "temporal_activities", "label": "Temporal Activities", "type": "external", "link": "https://temporal.io/"},
        {"id": "temporal_model_adapter", "label": "Temporal Model Adapter", "type": "component", "link": null},
        {"id": "temporal_toolset_adapter", "label": "Temporal Toolset Adapter", "type": "component", "link": "temporal_toolset_adapters.md"},
        {"id": "event_stream_activity", "label": "Event Stream Handler Activity", "type": "component", "link": null},
        {"id": "run_context_serializer", "label": "Run Context Serializer (TemporalRunContext)", "type": "external", "link": "temporal_workflow_context.md"},
        {"id": "abstract_toolset", "label": "AbstractToolset", "type": "external", "link": "toolset_interfaces.md"},
        {"id": "abstract_model", "label": "Abstract Model", "type": "external", "link": "model_core_interfaces.md"}
    ],
    "edges": [
        {"source": "temporal_agent", "target": "wrapped_agent", "label": "wraps and delegates to"},
        {"source": "temporal_agent", "target": "temporal_workflow_runtime", "label": "orchestrates via"},
        {"source": "temporal_workflow_runtime", "target": "temporal_activities", "label": "executes"},
        {"source": "temporal_agent", "target": "temporal_model_adapter", "label": "uses for model calls"},
        {"source": "temporal_agent", "target": "temporal_toolset_adapter", "label": "uses for tool calls"},
        {"source": "temporal_agent", "target": "event_stream_activity", "label": "uses for event handling"},
        {"source": "temporal_model_adapter", "target": "temporal_activities", "label": "maps model requests to"},
        {"source": "temporal_toolset_adapter", "target": "temporal_activities", "label": "maps tool calls to"},
        {"source": "event_stream_activity", "target": "temporal_activities", "label": "handles stream events via"},
        {"source": "temporal_agent", "target": "run_context_serializer", "label": "serializes/deserializes context"},
        {"source": "temporal_model_adapter", "target": "abstract_model", "label": "implements"},
        {"source": "temporal_toolset_adapter", "target": "abstract_toolset", "label": "adapts"}
    ],
    "groups": [
        {
            "id": "temporal_agent_orchestration_components",
            "label": "Temporal Agent Orchestration Components",
            "role": "core", 
            "nodes": ["temporal_agent", "temporal_model_adapter", "temporal_toolset_adapter", "event_stream_activity"]
        }
    ]
}
-->

```mermaid
flowchart TD
    %% Define internal components within a subgraph
    subgraph temporal_agent_orchestration_components["Temporal Agent Orchestration Components"]
        temporal_agent["TemporalAgent"]
        temporal_model_adapter["Temporal Model Adapter"]
        temporal_toolset_adapter["Temporal Toolset Adapter"]
        event_stream_activity["Event Stream Handler Activity"]
    end

    %% Define external dependencies
    wrapped_agent["Wrapped Agent (AbstractAgent)"]
    temporal_workflow_runtime["Temporal Workflow Runtime"]
    temporal_activities["Temporal Activities"]
    run_context_serializer["Run Context Serializer (TemporalRunContext)"]
    abstract_toolset["AbstractToolset"]
    abstract_model["Abstract Model"]

    %% Styling for external nodes
    class wrapped_agent,temporal_workflow_runtime,temporal_activities,run_context_serializer,abstract_toolset,abstract_model external;
    classDef external fill:#f9f,stroke:#333,stroke-width:2px;

    %% Connections with labels
    temporal_agent ==>"wraps and delegates to"==> wrapped_agent
    temporal_agent -->"orchestrates via"--> temporal_workflow_runtime
    temporal_workflow_runtime -->"executes"--> temporal_activities

    temporal_agent -.->"uses for model calls"-.-> temporal_model_adapter
    temporal_agent -.->"uses for tool calls"-.-> temporal_toolset_adapter
    temporal_agent -.->"uses for event handling"-.-> event_stream_activity

    temporal_model_adapter -->"maps model requests to"--> temporal_activities
    temporal_toolset_adapter -->"maps tool calls to"--> temporal_activities
    event_stream_activity -->"handles stream events via"--> temporal_activities

    temporal_agent -.->"serializes/deserializes context"-.-> run_context_serializer

    temporal_model_adapter -->"implements"--> abstract_model
    temporal_toolset_adapter -->"adapts"--> abstract_toolset
```

## Related Modules

*   [`temporal_workflow_context`][temporal_workflow_context.md]: Defines `TemporalRunContext` for managing and serializing agent run context within Temporal workflows.
*   [`temporal_toolset_adapters`][temporal_toolset_adapters.md]: Contains functionalities like `temporalize_toolset` and `TemporalWrapperToolset` which are crucial for adapting agent toolsets for Temporal execution.
*   [`temporal_observability`][temporal_observability.md]: Provides utilities for setting up observability within Temporal workflows, which can be integrated with `TemporalAgent` for enhanced monitoring.
*   [`agent_base_interface`][agent_base_interface.md]: Defines the `AbstractAgent` which `TemporalAgent` wraps.
*   [`model_core_interfaces`][model_core_interfaces.md]: Defines the `Model` interface that `TemporalModel` adapts.
*   [`toolset_interfaces`][toolset_interfaces.md]: Defines the `AbstractToolset` that `TemporalAgent` adapts for durable execution.

