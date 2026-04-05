# anthropic_prompt_caching Module Documentation

## Introduction

The `anthropic_prompt_caching` module provides middleware for optimizing API usage with Anthropic models by intelligently caching conversation prefixes. This middleware helps reduce costs and improve performance by ensuring that static parts of prompts, such as system messages and tool definitions, are cached and reused across multiple turns of a conversation.

## Architecture and Component Relationships

The core of this module is the `AnthropicPromptCachingMiddleware` class, which extends the `AgentMiddleware` interface. It intercepts model requests, analyzes them for cacheability, and applies Anthropic-specific `cache_control` tags to system messages, tool definitions, and the overall model settings. This ensures that the Anthropic API leverages its prompt caching capabilities effectively.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "anthropic_prompt_caching_middleware", "label": "AnthropicPromptCachingMiddleware", "type": "component", "link": null},
        {"id": "should_apply_caching", "label": "_should_apply_caching()", "type": "component", "link": null},
        {"id": "apply_caching", "label": "_apply_caching()", "type": "component", "link": null},
        {"id": "wrap_model_call", "label": "wrap_model_call()", "type": "component", "link": null},
        {"id": "awrap_model_call", "label": "awrap_model_call()", "type": "component", "link": null},
        {"id": "tag_system_message", "label": "_tag_system_message()", "type": "component", "link": null},
        {"id": "tag_tools", "label": "_tag_tools()", "type": "component", "link": null},
        {"id": "agent_middleware", "label": "AgentMiddleware", "type": "external", "link": "langchain_v1_agents_middleware.md"},
        {"id": "chat_anthropic", "label": "ChatAnthropic", "type": "external", "link": "partners_anthropic_chat_models.md"},
        {"id": "model_request_response", "label": "ModelRequest/Response", "type": "external", "link": "core_api.md"}
    ],
    "edges": [
        {"source": "anthropic_prompt_caching_middleware", "target": "agent_middleware"},
        {"source": "anthropic_prompt_caching_middleware", "target": "should_apply_caching"},
        {"source": "anthropic_prompt_caching_middleware", "target": "apply_caching"},
        {"source": "anthropic_prompt_caching_middleware", "target": "wrap_model_call"},
        {"source": "anthropic_prompt_caching_middleware", "target": "awrap_model_call"},
        {"source": "should_apply_caching", "target": "chat_anthropic"},
        {"source": "should_apply_caching", "target": "model_request_response"},
        {"source": "apply_caching", "target": "tag_system_message"},
        {"source": "apply_caching", "target": "tag_tools"},
        {"source": "apply_caching", "target": "model_request_response"},
        {"source": "wrap_model_call", "target": "should_apply_caching"},
        {"source": "wrap_model_call", "target": "apply_caching"},
        {"source": "wrap_model_call", "target": "model_request_response"},
        {"source": "awrap_model_call", "target": "should_apply_caching"},
        {"source": "awrap_model_call", "target": "apply_caching"},
        {"source": "awrap_model_call", "target": "model_request_response"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    anthropic_prompt_caching_middleware[AnthropicPromptCachingMiddleware]
    should_apply_caching[_should_apply_caching()]
    apply_caching[_apply_caching()]
    wrap_model_call[wrap_model_call()]
    awrap_model_call[awrap_model_call()]
    tag_system_message[_tag_system_message()]
    tag_tools[_tag_tools()]
    agent_middleware[AgentMiddleware]:::external
    chat_anthropic[ChatAnthropic]:::external
    model_request_response[ModelRequest/Response]:::external

    anthropic_prompt_caching_middleware -- inherits --> agent_middleware
    anthropic_prompt_caching_middleware --> should_apply_caching
    anthropic_prompt_caching_middleware --> apply_caching
    anthropic_prompt_caching_middleware --> wrap_model_call
    anthropic_prompt_caching_middleware --> awrap_model_call

    should_apply_caching --> chat_anthropic
    should_apply_caching --> model_request_response

    apply_caching --> tag_system_message
    apply_caching --> tag_tools
    apply_caching --> model_request_response

    wrap_model_call --> should_apply_caching
    wrap_model_call --> apply_caching
    wrap_model_call --> model_request_response

    awrap_model_call --> should_apply_caching
    awrap_model_call --> apply_caching
    awrap_model_call --> model_request_response

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

### Components

#### AnthropicPromptCachingMiddleware
This is the main class within the module. It inherits from `AgentMiddleware` and provides the core logic for applying prompt caching to Anthropic model requests. It is initialized with parameters to control cache behavior, such as `type`, `ttl`, `min_messages_to_cache`, and how to handle unsupported models.

-   `_should_apply_caching(request: ModelRequest) -> bool`: Determines if caching should be applied based on the model type (must be `ChatAnthropic`) and the number of messages in the request.
-   `_apply_caching(request: ModelRequest) -> ModelRequest`: Modifies the incoming `ModelRequest` by injecting `cache_control` tags into the system message, tool definitions, and model settings. It utilizes internal helper functions `_tag_system_message` and `_tag_tools` for this purpose.
-   `wrap_model_call(...)` and `awrap_model_call(...)`: These methods intercept synchronous and asynchronous model calls, respectively. They first check if caching should be applied using `_should_apply_caching` and then modify the request using `_apply_caching` before passing it to the original handler.

## System Integration

The `anthropic_prompt_caching` module seamlessly integrates into the overall system as a middleware component. By extending `AgentMiddleware`, it can be plugged into the agent execution pipeline to automatically enhance Anthropic model calls with caching capabilities.

-   **Agent Middleware**: This module acts as a specialized [Agent Middleware](langchain_v1_agents_middleware.md), intercepting model calls before they reach the Anthropic API.
-   **Anthropic Chat Models**: It specifically targets [Anthropic Chat Models](partners_anthropic_chat_models.md) to apply its caching logic.
-   **Core API Types**: It interacts with fundamental [Model Request and Response types](core_api.md) defined in the `core_api` module to read and modify prompt data.

By operating as middleware, this module provides a non-invasive way to introduce prompt caching, improving efficiency for applications utilizing Anthropic LLMs without requiring changes to the core application logic.
