# partners_openai_middleware

The `partners_openai_middleware` module provides a crucial middleware component for integrating OpenAI's moderation capabilities into agent-based systems. Its primary purpose is to automatically check agent inputs, outputs, and tool results against OpenAI's safety policies to ensure compliance and prevent the generation or processing of harmful content.

## Core Functionality

This module contains the `OpenAIModerationMiddleware` class, which extends the `AgentMiddleware` base class. It intercepts agent traffic at various stages (before model calls, after model calls) to apply moderation checks. The middleware is highly configurable, allowing developers to specify which types of messages to check, the moderation model to use, and how to handle detected violations.

### OpenAIModerationMiddleware

-   **Purpose**: Moderates agent traffic using OpenAI's moderation endpoint.
-   **Configuration**: Allows setting the moderation `model`, enabling/disabling checks for `input`, `output`, and `tool_results`, defining `exit_behavior` upon violation (error, end, or replace), and providing a custom `violation_message`.
-   **Integration**: Hooks into the agent lifecycle via `before_model` and `after_model` (and their asynchronous counterparts) to perform moderation.
-   **Violation Handling**: When a violation is detected, the middleware can:
    -   Raise an `OpenAIModerationError`.
    -   End the agent run, returning a moderation message.
    -   Replace the offending message content with a moderation message.

## Architecture and Component Relationships

The `OpenAIModerationMiddleware` is the central component of this module. It interacts with the OpenAI API for actual moderation checks and utilizes message types defined in the `core_messages` module. It also builds upon the `AgentMiddleware` interface provided by the `langchain_v1_agents_middleware` module.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "openai_moderation_middleware", "label": "OpenAIModerationMiddleware", "type": "component", "link": null},
        {"id": "_moderate_methods", "label": "Moderation Logic (_moderate, _amoderate)", "type": "component", "link": null},
        {"id": "_apply_violation", "label": "Violation Handling (_apply_violation)", "type": "component", "link": null},
        {"id": "openai_client_external", "label": "OpenAI Client", "type": "external", "link": null},
        {"id": "async_openai_client_external", "label": "AsyncOpenAI Client", "type": "external", "link": null},
        {"id": "agent_middleware_base", "label": "AgentMiddleware", "type": "external", "link": "langchain_v1_agents_middleware.md"},
        {"id": "core_messages_module", "label": "Core Messages (BaseMessage, AIMessage, HumanMessage, ToolMessage)", "type": "external", "link": "core_messages.md"}
    ],
    "edges": [
        {"source": "openai_moderation_middleware", "target": "_moderate_methods"},
        {"source": "openai_moderation_middleware", "target": "_apply_violation"},
        {"source": "_moderate_methods", "target": "openai_client_external"},
        {"source": "_moderate_methods", "target": "async_openai_client_external"},
        {"source": "openai_moderation_middleware", "target": "agent_middleware_base"},
        {"source": "openai_moderation_middleware", "target": "core_messages_module"},
        {"source": "_apply_violation", "target": "core_messages_module"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    openai_moderation_middleware[OpenAIModerationMiddleware]
    _moderate_methods[Moderation Logic (_moderate, _amoderate)]
    _apply_violation[Violation Handling (_apply_violation)]
    openai_client_external[OpenAI Client]
    async_openai_client_external[AsyncOpenAI Client]
    agent_middleware_base[AgentMiddleware]
    core_messages_module[Core Messages (BaseMessage, AIMessage, HumanMessage, ToolMessage)]

    openai_moderation_middleware --> _moderate_methods
    openai_moderation_middleware --> _apply_violation
    _moderate_methods --> openai_client_external
    _moderate_methods --> async_openai_client_external
    openai_moderation_middleware --> agent_middleware_base
    openai_moderation_middleware --> core_messages_module
    _apply_violation --> core_messages_module
```

## Integration with the Overall System

The `partners_openai_middleware` module serves as a specialized extension within the larger agent framework, specifically for applications leveraging OpenAI models. It plugs into the agent's execution flow to provide a crucial safety net, ensuring that all interactions conform to defined moderation policies.

-   **Agent Framework**: It integrates seamlessly with the agent system by implementing the `AgentMiddleware` interface (refer to [langchain_v1_agents_middleware.md](langchain_v1_agents_middleware.md) for more details on middleware).
-   **OpenAI Ecosystem**: It directly interfaces with OpenAI's moderation API, making it a key component for building responsible AI applications using OpenAI services.
-   **Message Handling**: It processes and potentially modifies messages from the `core_messages` module (see [core_messages.md](core_messages.md)) to enforce moderation policies.
