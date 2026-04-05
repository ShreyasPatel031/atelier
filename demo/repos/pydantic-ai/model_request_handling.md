# Model Request Handling Module

## Introduction

The `model_request_handling` module is a core component within the `pydantic_ai_agent_core` responsible for orchestrating interactions with AI models. Its primary function is to encapsulate the logic for sending model requests, processing responses, and integrating with various agent capabilities and tools.

At the heart of this module is the `ModelRequestNode`, which represents a specific step in an agent's execution graph where an AI model call is made. This node manages the complete lifecycle of a model request, from preparation and execution to response handling and potential retries.

## Core Functionality

The `ModelRequestNode` handles the intricate details of communicating with large language models (LLMs). Its key responsibilities include:

*   **Request Preparation**: Before a model call, it gathers all necessary information, including the current message history, model settings, and tool definitions. It also integrates with agent capabilities to perform pre-request processing, such as applying instructions or modifying the request context.
*   **Model Invocation**: It facilitates both synchronous and asynchronous (streaming) requests to the underlying AI model. This involves calling the appropriate methods on the [Pydantic AI Models](pydantic_ai_models.md) for generating responses.
*   **Response Handling**: After receiving a response from the model, it processes the output, appends it to the agent's message history, and updates usage metrics. It also interacts with agent capabilities for post-response processing.
*   **Streaming Support**: For models that support streaming, the `ModelRequestNode` provides an asynchronous context manager (`stream()`) that allows for real-time consumption of model outputs.
*   **Error and Retry Management**: It incorporates robust error handling, including mechanisms to skip model requests under certain conditions or to retry requests that encounter transient errors, based on defined retry policies.
*   **Tool Integration**: It plays a crucial role in enabling tool usage by the agent. After a model response, it often transitions the execution flow to a `CallToolsNode` (from the [Tool Execution Handlers](tool_execution_handlers.md) module) to process any requested tool calls.

## Architecture and Component Relationships

The `model_request_handling` module, centered around the `ModelRequestNode`, is a leaf module within the `agent_nodes` sub-module of `pydantic_ai_agent_core`. It deeply integrates with several other modules to fulfill its responsibilities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "model_request_node", "label": "ModelRequestNode", "type": "component", "link": null},
        {"id": "prepare_request", "label": "_prepare_request()", "type": "component", "link": null},
        {"id": "make_request", "label": "_make_request()", "type": "component", "link": null},
        {"id": "stream_request", "label": "stream()", "type": "component", "link": null},
        {"id": "finish_handling", "label": "_finish_handling()", "type": "component", "link": null},
        {"id": "build_retry_node", "label": "_build_retry_node()", "type": "component", "link": null},
        {"id": "pydantic_ai_models", "label": "Pydantic AI Models", "type": "external", "link": "pydantic_ai_models.md"},
        {"id": "tool_output_management", "label": "Tool Output Management", "type": "external", "link": "tool_output_management.md"},
        {"id": "pydantic_ai_capabilities", "label": "Pydantic AI Capabilities", "type": "external", "link": "pydantic_ai_capabilities.md"},
        {"id": "tool_execution_handlers", "label": "Tool Execution Handlers (CallToolsNode)", "type": "external", "link": "tool_execution_handlers.md"}
    ],
    "edges": [
        {"source": "model_request_node", "target": "prepare_request"},
        {"source": "model_request_node", "target": "make_request"},
        {"source": "model_request_node", "target": "stream_request"},
        {"source": "prepare_request", "target": "pydantic_ai_models"},
        {"source": "prepare_request", "target": "tool_output_management"},
        {"source": "prepare_request", "target": "pydantic_ai_capabilities"},
        {"source": "make_request", "target": "pydantic_ai_models"},
        {"source": "make_request", "target": "pydantic_ai_capabilities"},
        {"source": "make_request", "target": "finish_handling"},
        {"source": "stream_request", "target": "pydantic_ai_models"},
        {"source": "stream_request", "target": "pydantic_ai_capabilities"},
        {"source": "stream_request", "target": "finish_handling"},
        {"source": "finish_handling", "target": "tool_execution_handlers"},
        {"source": "finish_handling", "target": "build_retry_node"},
        {"source": "build_retry_node", "target": "model_request_node"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    model_request_node[ModelRequestNode]
    prepare_request[_prepare_request()]
    make_request[_make_request()]
    stream_request[stream()]
    finish_handling[_finish_handling()]
    build_retry_node[_build_retry_node()]
    pydantic_ai_models[Pydantic AI Models]
    tool_output_management[Tool Output Management]
    pydantic_ai_capabilities[Pydantic AI Capabilities]
    tool_execution_handlers[Tool Execution Handlers (CallToolsNode)]

    model_request_node --> prepare_request
    model_request_node --> make_request
    model_request_node --> stream_request
    prepare_request --> pydantic_ai_models
    prepare_request --> tool_output_management
    prepare_request --> pydantic_ai_capabilities
    make_request --> pydantic_ai_models
    make_request --> pydantic_ai_capabilities
    make_request --> finish_handling
    stream_request --> pydantic_ai_models
    stream_request --> pydantic_ai_capabilities
    stream_request --> finish_handling
    finish_handling --> tool_execution_handlers
    finish_handling --> build_retry_node
    build_retry_node --> model_request_node
```

### Relationships with Other Modules

*   **[Pydantic AI Models](pydantic_ai_models.md)**: The `ModelRequestNode` directly interacts with the `Model` and `StreamedResponse` objects from this module to send requests and receive responses. It utilizes `ModelSettings` and `ModelRequestParameters` to configure the model calls.
*   **[Tool Output Management](tool_output_management.md)**: The `ToolManager` from this module is used during the request preparation phase to resolve dynamic toolsets for the current run step, ensuring that the model has access to the correct tool definitions.
*   **[Pydantic AI Capabilities](pydantic_ai_capabilities.md)**: The `root_capability` (an `AbstractCapability` implementation) plays a significant role in the request lifecycle. It provides hooks (`before_model_request`, `wrap_model_request`, `after_model_request`, `on_model_request_error`) that allow for custom logic to be injected at various stages of the model interaction.
*   **[Tool Execution Handlers](tool_execution_handlers.md)**: Upon successful completion of a model request, the `ModelRequestNode` typically sets its result to a `CallToolsNode`, thereby handing over control to the tool execution mechanism to process any tool calls made by the model. This `CallToolsNode` is part of the `tool_execution_handlers` module.
*   **Message and State Management**: It relies heavily on internal message structures (`_messages.ModelRequest`, `_messages.ModelResponse`) and the agent's `GraphAgentState` and `GraphAgentDeps` to maintain context, message history, and usage statistics throughout the agent's run.

## How the Module Fits into the Overall System

The `model_request_handling` module is a critical piece of the `pydantic_ai_agent_core`, specifically within the `agent_execution_graph`. It acts as the bridge between the agent's internal reasoning and the external AI models. When an agent needs to consult an LLM, a `ModelRequestNode` is added to the execution graph. This node then takes responsibility for the entire interaction, ensuring that the request is properly formatted, sent to the model, and its response is correctly integrated back into the agent's state.

This module's robust handling of model requests, including streaming and retry mechanisms, is fundamental for building reliable and performant AI agents. Its integration with capabilities and tool management allows for highly customizable and extensible agent behaviors, enabling agents to leverage various tools and follow complex operational flows based on model outputs.

By centralizing the model interaction logic, `model_request_handling` contributes to a modular and maintainable agent architecture, allowing other parts of the system to focus on agent orchestration, state management, and tool definitions, while delegating the complexities of LLM communication to this specialized module.