# temporal_agent

The `temporal_agent` module provides a robust mechanism to integrate `pydantic-ai` agents with [Temporal.io](https://temporal.io/) workflows. It offers the `TemporalAgent` class, which wraps an existing `AbstractAgent` to ensure its operations, such as model requests and tool calls, are executed as Temporal activities, thus enabling durable and reliable AI agent execution within a distributed system.

## Purpose and Core Functionality

The primary purpose of the `temporal_agent` module is to bridge the gap between `pydantic-ai` agents and Temporal workflows. By wrapping an agent with `TemporalAgent`, developers can:

1.  **Durable Execution**: Ensure that agent runs are durable and fault-tolerant, leveraging Temporal's workflow capabilities.
2.  **Activity Offloading**: Automatically convert model requests and tool invocations into Temporal activities, allowing them to be retried, compensated, and observed independently.
3.  **Context Management**: Provide a specialized `TemporalRunContext` for serializing and deserializing agent run contexts across Temporal activities, maintaining state consistency.
4.  **Customizable Activity Configuration**: Offer granular control over Temporal activity configurations (e.g., timeouts, retry policies) for models, toolsets, and individual tools.

This module is crucial for deploying `pydantic-ai` agents in production environments where reliability, observability, and long-running operations are paramount.

## Architecture and Component Relationships

The `temporal_agent` module's architecture revolves around the `TemporalAgent` class and its interaction with various internal and external components to achieve Temporal workflow compatibility.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "temporal_agent", "label": "TemporalAgent", "type": "component", "link": null},
        {"id": "temporal_run_context", "label": "TemporalRunContext", "type": "component", "link": null},
        {"id": "temporalize_toolset_func", "label": "temporalize_toolset()", "type": "component", "link": null},
        {"id": "temporal_wrapper_toolset", "label": "TemporalWrapperToolset", "type": "component", "link": null},
        {"id": "temporal_model_adapter", "label": "TemporalModel", "type": "component", "link": null},
        {"id": "abstract_agent", "label": "AbstractAgent", "type": "external", "link": "agent_abstract_base.md"},
        {"id": "abstract_toolset", "label": "AbstractToolset", "type": "external", "link": "tool_output_management.md"},
        {"id": "models_module", "label": "Models Module", "type": "external", "link": "base_model_abstractions.md"},
        {"id": "temporal_provider_factory", "label": "TemporalProviderFactory", "type": "external", "link": "pydantic_ai_providers.md"},
        {"id": "event_stream_handler", "label": "EventStreamHandler", "type": "external", "link": "pydantic_ai_capabilities.md"},
        {"id": "temporal_sdk", "label": "Temporal SDK", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "temporal_agent", "target": "abstract_agent"},
        {"source": "temporal_agent", "target": "temporal_model_adapter"},
        {"source": "temporal_agent", "target": "temporalize_toolset_func"},
        {"source": "temporal_agent", "target": "temporal_run_context"},
        {"source": "temporal_agent", "target": "event_stream_handler"},
        {"source": "temporal_model_adapter", "target": "models_module"},
        {"source": "temporal_model_adapter", "target": "temporal_provider_factory"},
        {"source": "temporalize_toolset_func", "target": "abstract_toolset"},
        {"source": "temporalize_toolset_func", "target": "temporal_wrapper_toolset"},
        {"source": "temporal_agent", "target": "temporal_sdk"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    temporal_agent[TemporalAgent]
    temporal_run_context[TemporalRunContext]
    temporalize_toolset_func[temporalize_toolset()]
    temporal_wrapper_toolset[TemporalWrapperToolset]
    temporal_model_adapter[TemporalModel]
    abstract_agent[AbstractAgent]
    abstract_toolset[AbstractToolset]
    models_module[Models Module]
    temporal_provider_factory[TemporalProviderFactory]
    event_stream_handler[EventStreamHandler]
    temporal_sdk[Temporal SDK]

    temporal_agent --> abstract_agent
    temporal_agent --> temporal_model_adapter
    temporal_agent --> temporalize_toolset_func
    temporal_agent --> temporal_run_context
    temporal_agent --> event_stream_handler
    temporal_model_adapter --> models_module
    temporal_model_adapter --> temporal_provider_factory
    temporalize_toolset_func --> abstract_toolset
    temporalize_toolset_func --> temporal_wrapper_toolset
    temporal_agent --> temporal_sdk
```

### Component Relationships

*   **`TemporalAgent`**: This is the central class, wrapping an `AbstractAgent`. It intercepts calls to the agent's `run` method and orchestrates their execution as Temporal activities. It manages the conversion of models and toolsets into their Temporal-compatible counterparts.
*   **`TemporalRunContext`**: A specialized `RunContext` subclass used by `TemporalAgent` to handle serialization and deserialization of the agent's context when passing it between workflow and activity boundaries.
*   **`temporalize_toolset()`**: A utility function responsible for transforming standard `AbstractToolset` instances into `TemporalWrapperToolset` instances. This wrapping enables tool calls to be executed as Temporal activities.
*   **`TemporalWrapperToolset`**: A wrapper around `AbstractToolset` that ensures methods requiring I/O are correctly offloaded to Temporal activities, preserving workflow determinism.
*   **`TemporalModel`**: An internal adapter created by `TemporalAgent` that wraps the underlying `Model` instance. It ensures that all model requests are dispatched as Temporal activities, allowing for durable and retryable model interactions.
*   **`AbstractAgent`**: The base agent class that `TemporalAgent` wraps, providing the core agent functionality. Refer to [agent_abstract_base.md](agent_abstract_base.md) for more details.
*   **`AbstractToolset`**: The base class for tool collections. `TemporalAgent` uses `temporalize_toolset` to adapt these for Temporal. Refer to [tool_output_management.md](tool_output_management.md) for more details.
*   **`Models Module`**: Provides the `Model` abstraction used by agents. `TemporalModel` interacts with instances from this module. Refer to [base_model_abstractions.md](base_model_abstractions.md) for more details.
*   **`TemporalProviderFactory`**: An optional callable used by `TemporalModel` to instantiate models from provider strings within Temporal workflows, allowing for dynamic configuration. Refer to [pydantic_ai_providers.md](pydantic_ai_providers.md) for more details on providers.
*   **`EventStreamHandler`**: An optional handler for agent events. If provided, it will be executed as a Temporal activity. Refer to [pydantic_ai_capabilities.md](pydantic_ai_capabilities.md) for more details on event handling.
*   **Temporal SDK**: The underlying Temporal Python SDK, which provides the `workflow` and `activity` decorators and functions for defining and executing workflows and activities.

## Key Class: `TemporalAgent`

The `TemporalAgent` class is the central component of this module. It extends `WrapperAgent` and transparently wraps an existing `AbstractAgent` to enable its execution within Temporal workflows.

### Constructor

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
        # ...
```

**Parameters:**

*   **`wrapped`**: The `AbstractAgent` instance to be wrapped and made Temporal-compatible.
*   **`name`**: An optional, unique name for the agent, used to identify its activities in Temporal. **Mandatory** if the wrapped agent does not have a name set.
*   **`models`**: A mapping of model instances to register. These models will be managed by `TemporalModel` and invoked as Temporal activities.
*   **`provider_factory`**: A callable for dynamically instantiating models from provider strings within a Temporal workflow. This allows injecting `deps`-specific configurations.
*   **`event_stream_handler`**: An optional handler for agent events. If provided, it will be executed as a Temporal activity.
*   **`activity_config`**: Base Temporal `ActivityConfig` applied to all agent-related activities. Defaults to a 60-second `start_to_close_timeout` with non-retryable `UserError` and `PydanticUserError`.
*   **`model_activity_config`**: Specific `ActivityConfig` for model request activities, merged with `activity_config`.
*   **`toolset_activity_config`**: `ActivityConfig` for toolset-specific activities (e.g., `get_tools`, `call_tool`), merged with `activity_config`.
*   **`tool_activity_config`**: Fine-grained `ActivityConfig` for individual tool call activities. Can be set to `False` to disable activity execution for non-I/O tools (which must be `async`).
*   **`run_context_type`**: The `TemporalRunContext` subclass to use for serializing and deserializing the run context. Custom subclasses can expose additional `deps` attributes.
*   **`temporalize_toolset_func`**: An optional function to customize how "leaf" toolsets are prepared for Temporal. Defaults to `temporalize_toolset`.

### Properties

*   **`name`**: The agent's name. Immutable after creation within a `TemporalAgent` instance.
*   **`model`**: Returns the `TemporalModel` instance, which wraps the actual model and routes requests through Temporal activities.
*   **`event_stream_handler`**: Returns the configured `EventStreamHandler`. If inside a workflow, it returns a proxy that calls the handler via a Temporal activity.
*   **`toolsets`**: Returns the list of wrapped toolsets, ensuring they are Temporal-compatible.
*   **`temporal_activities`**: A list of all Temporal activities registered by this `TemporalAgent` for use in a Temporal worker.

### Methods

*   **`run(...)` (async)**: Executes the agent asynchronously. Inside a Temporal workflow, it ensures that model calls and tool calls are dispatched as activities. **Note**: `event_stream_handler` cannot be set at runtime within a workflow; it must be configured during agent creation.
*   **`run_sync(...)`**: Synchronous execution of the agent. **Cannot be used inside a Temporal workflow.**
*   **`run_stream(...)` (async context manager)**: Asynchronously streams the agent's output. **Cannot be used inside a Temporal workflow.** Developers should set an `event_stream_handler` at creation and use `run()` instead for streaming within workflows.
*   **`run_stream_events(...)`**: Asynchronously streams events from the agent's run. **Cannot be used inside a Temporal workflow.** Similar to `run_stream`, use `event_stream_handler` with `run()` for workflows.
*   **`iter(...)` (async context manager)**: Provides an async iterator over the agent graph's executed nodes. **Cannot be used inside a Temporal workflow unless `_temporal_overrides_active` is true.** This is generally restricted for direct use in workflows.
*   **`override(...)` (context manager)**: Temporarily overrides agent properties like `name`, `deps`, `model`, `toolsets`, `tools`, `instructions`, or `model_settings`. **Restrictions apply within Temporal workflows**: `model`, `toolsets`, and `tools` cannot be overridden at runtime, as they must be configured at agent creation for determinism.

## Integration with Temporal

To use `TemporalAgent`, you typically perform the following steps:

1.  **Define your base `AbstractAgent`**: Create your agent with its desired capabilities and toolsets.
2.  **Wrap with `TemporalAgent`**: Instantiate `TemporalAgent`, passing your base agent and any Temporal-specific configurations (e.g., activity timeouts, retry policies).
3.  **Register Activities**: The `temporal_activities` property of `TemporalAgent` provides all necessary functions to be registered as Temporal activities.
4.  **Run in a Workflow**: Invoke `temporal_agent.run()` from within a Temporal workflow. The `TemporalAgent` handles the conversion of internal agent operations into Temporal activities.

```python
# Example of setting up a TemporalAgent (conceptual)
from pydantic_ai import Agent
from pydantic_ai_slim.pydantic_ai.durable_exec.temporal._agent import TemporalAgent
from temporalio.worker import Worker
from temporalio.client import Client
from temporalio.workflow import workflow_method, activity

# Assume MyAgent is an AbstractAgent implementation
class MyAgent(Agent):
    def __init__(self, model_name: str):
        super().__init__(model_name, name="my-temporal-agent")

# 1. Define your base agent
base_agent = MyAgent('openai:gpt-4o')

# 2. Wrap with TemporalAgent
temporal_agent = TemporalAgent(
    wrapped=base_agent,
    name="my-temporal-agent-wrapper",
    activity_config={'start_to_close_timeout': timedelta(minutes=5)}
)

# 3. Register Activities
# These activities would be run by a Temporal worker
temporal_activities = temporal_agent.temporal_activities

# 4. Define a Temporal Workflow
class MyTemporalWorkflow:
    @workflow_method(task_queue="my-task-queue")
    async def run_agent_workflow(self, prompt: str) -> str:
        # Agent.run() automatically dispatches to activities
        result = await temporal_agent.run(prompt)
        return result.output

# Then, in your worker code:
async def start_worker():
    client = await Client.connect("localhost:7233")
    worker = Worker(
        client,
        task_queue="my-task-queue",
        workflows=[MyTemporalWorkflow],
        activities=temporal_activities, # Registering the activities
    )
    await worker.run()

# And to start a workflow:
async def start_workflow():
    client = await Client.connect("localhost:7233")
    result = await client.execute_workflow(
        MyTemporalWorkflow.run_agent_workflow,
        "Hello Temporal Agent!",
        id="my-agent-workflow-id",
        task_queue="my-task-queue",
    )
    print(f"Workflow result: {result}")
```

This integration allows `pydantic-ai` agents to leverage the full power of Temporal for building resilient and scalable AI applications.