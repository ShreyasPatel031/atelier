# Azure Completion Module

The `azure_completion` module provides the `AzureCompletion` class, a robust and native implementation for integrating with Azure AI Inference chat completion services. It enables CrewAI agents to leverage Azure's powerful language models, offering features such as native function calling, streaming support, and secure Azure authentication. This module is a core component within the [LLM Integrations](llm_integrations.md) system, specifically tailored for Azure environments.

## Architecture and Component Relationships

The `AzureCompletion` class extends the [BaseLLM](llm_base.md) class, inheriting fundamental LLM functionalities while implementing Azure-specific logic for API interactions, error handling, and data formatting. It manages both synchronous and asynchronous communication with Azure AI Inference through dedicated client instances.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "azure_completion", "label": "AzureCompletion", "type": "component", "link": null},
        {"id": "base_llm", "label": "BaseLLM", "type": "external", "link": "llm_base.md"},
        {"id": "chat_completions_client", "label": "ChatCompletionsClient (Azure SDK)", "type": "external", "link": null},
        {"id": "async_chat_completions_client", "label": "AsyncChatCompletionsClient (Azure SDK)", "type": "external", "link": null},
        {"id": "azure_key_credential", "label": "AzureKeyCredential (Azure SDK)", "type": "external", "link": null},
        {"id": "http_response_error", "label": "HttpResponseError (Azure SDK)", "type": "external", "link": null},
        {"id": "streaming_chat_completions_update", "label": "StreamingChatCompletionsUpdate (Azure SDK)", "type": "external", "link": null},
        {"id": "chat_completions", "label": "ChatCompletions (Azure SDK)", "type": "external", "link": null},
        {"id": "chat_completions_tool_definition", "label": "ChatCompletionsToolDefinition (Azure SDK)", "type": "external", "link": null},
        {"id": "function_definition", "label": "FunctionDefinition (Azure SDK)", "type": "external", "link": null},
        {"id": "json_schema_format", "label": "JsonSchemaFormat (Azure SDK)", "type": "external", "link": null},
        {"id": "pydantic_basemodel", "label": "Pydantic BaseModel", "type": "external", "link": null},
        {"id": "os_module", "label": "os (Python)", "type": "external", "link": null},
        {"id": "urllib_parse", "label": "urllib.parse (Python)", "type": "external", "link": null},
        {"id": "json_module", "label": "json (Python)", "type": "external", "link": null},
        {"id": "logging_module", "label": "logging (Python)", "type": "external", "link": null},
        {"id": "llm_exceptions", "label": "LLM Exceptions", "type": "external", "link": null},
        {"id": "llm_utils", "label": "LLM Utils", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "azure_completion", "target": "base_llm", "label": "inherits"},
        {"source": "azure_completion", "target": "chat_completions_client", "label": "uses"},
        {"source": "azure_completion", "target": "async_chat_completions_client", "label": "uses"},
        {"source": "azure_completion", "target": "azure_key_credential", "label": "authenticates with"},
        {"source": "azure_completion", "target": "http_response_error", "label": "handles"},
        {"source": "azure_completion", "target": "streaming_chat_completions_update", "label": "processes"},
        {"source": "azure_completion", "target": "chat_completions", "label": "receives from API"},
        {"source": "azure_completion", "target": "chat_completions_tool_definition", "label": "converts to"},
        {"source": "azure_completion", "target": "function_definition", "label": "uses in tool def"},
        {"source": "azure_completion", "target": "json_schema_format", "label": "uses for structured output"},
        {"source": "azure_completion", "target": "pydantic_basemodel", "label": "validates against"},
        {"source": "azure_completion", "target": "os_module", "label": "reads env vars"},
        {"source": "azure_completion", "target": "urllib_parse", "label": "parses endpoints"},
        {"source": "azure_completion", "target": "json_module", "label": "parses tool args"},
        {"source": "azure_completion", "target": "logging_module", "label": "logs"},
        {"source": "azure_completion", "target": "llm_exceptions", "label": "raises"},
        {"source": "azure_completion", "target": "llm_utils", "label": "uses for tool conversion"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    azure_completion[AzureCompletion]
    base_llm[BaseLLM]:::external
    chat_completions_client[ChatCompletionsClient (Azure SDK)]:::external
    async_chat_completions_client[AsyncChatCompletionsClient (Azure SDK)]:::external
    azure_key_credential[AzureKeyCredential (Azure SDK)]:::external
    http_response_error[HttpResponseError (Azure SDK)]:::external
    streaming_chat_completions_update[StreamingChatCompletionsUpdate (Azure SDK)]:::external
    chat_completions[ChatCompletions (Azure SDK)]:::external
    chat_completions_tool_definition[ChatCompletionsToolDefinition (Azure SDK)]:::external
    function_definition[FunctionDefinition (Azure SDK)]:::external
    json_schema_format[JsonSchemaFormat (Azure SDK)]:::external
    pydantic_basemodel[Pydantic BaseModel]:::external
    os_module[os (Python)]:::external
    urllib_parse[urllib.parse (Python)]:::external
    json_module[json (Python)]:::external
    logging_module[logging (Python)]:::external
    llm_exceptions[LLM Exceptions]:::external
    llm_utils[LLM Utils]:::external

    azure_completion -- inherits --> base_llm
    azure_completion -- uses --> chat_completions_client
    azure_completion -- uses --> async_chat_completions_client
    azure_completion -- authenticates with --> azure_key_credential
    azure_completion -- handles --> http_response_error
    azure_completion -- processes --> streaming_chat_completions_update
    azure_completion -- receives from API --> chat_completions
    azure_completion -- converts to --> chat_completions_tool_definition
    azure_completion -- uses in tool def --> function_definition
    azure_completion -- uses for structured output --> json_schema_format
    azure_completion -- validates against --> pydantic_basemodel
    azure_completion -- reads env vars --> os_module
    azure_completion -- parses endpoints --> urllib_parse
    azure_completion -- parses tool args --> json_module
    azure_completion -- logs --> logging_module
    azure_completion -- raises --> llm_exceptions
    azure_completion -- uses for tool conversion --> llm_utils

```

## Module Overview

The `AzureCompletion` class provides a comprehensive interface for integrating CrewAI with Azure AI Inference. It handles:

*   **Authentication**: Securely authenticates with Azure using API keys.
*   **Endpoint Management**: Validates and constructs correct Azure endpoint URLs.
*   **Model Compatibility**: Detects and adapts to various Azure OpenAI models, including GPT-4, GPT-4o, and GPT-3.5-turbo.
*   **Synchronous and Asynchronous Calls**: Supports both `call` and `acall` methods for flexible execution.
*   **Streaming**: Provides functionality for handling real-time streaming responses from Azure.
*   **Function Calling (Tool Use)**: Translates CrewAI tool definitions into Azure OpenAI compatible function calls and executes them.
*   **Structured Output**: Validates API responses against Pydantic models for structured data extraction.
*   **Error Handling**: Catches and processes Azure-specific API errors (e.g., 401, 404, 429) and context length exceptions.
*   **Token Usage Tracking**: Extracts and tracks token usage from Azure responses.
*   **Hooks Integration**: Interacts with `before_llm_call` and `after_llm_call` hooks for custom logic.
*   **Multimodal Support**: Identifies models that support multimodal inputs (e.g., GPT-4o, GPT-4 Turbo with Vision).

### Core Components

#### `AzureCompletion` Class

This is the main class that encapsulates all the logic for interacting with Azure AI Inference.

**Attributes:**

*   `endpoint`: Azure API endpoint URL.
*   `api_version`: Azure API version (defaults to "2024-06-01").
*   `timeout`: Request timeout in seconds.
*   `max_retries`: Maximum number of retries for API calls.
*   `top_p`, `frequency_penalty`, `presence_penalty`, `max_tokens`: Parameters for controlling LLM generation.
*   `stream`: Boolean indicating whether to enable streaming.
*   `response_format`: An optional Pydantic model for structured output validation.
*   `is_openai_model`: Flag to identify if the underlying model is an OpenAI-compatible model hosted on Azure.
*   `is_azure_openai_endpoint`: Flag to identify if the endpoint is a specific Azure OpenAI endpoint.

**Key Methods:**

*   `_normalize_azure_fields(cls, data)`: A class method that ensures `api_key` and `endpoint` are correctly set from environment variables or passed parameters. It also validates and fixes the endpoint URL format and determines if the model is an OpenAI-compatible one.
*   `_init_clients(self)`: Initializes `_client` (synchronous `ChatCompletionsClient`) and `_async_client` (asynchronous `AsyncChatCompletionsClient`) using the provided `endpoint`, `api_key`, and `api_version`.
*   `to_config_dict(self)`: Extends the base configuration with Azure-specific settings for serialization.
*   `_validate_and_fix_endpoint(endpoint, model)`: Static method to ensure Azure OpenAI endpoints are correctly formatted, adding deployment names if necessary.
*   `_handle_api_error(self, error, from_task, from_agent)`: Centralized error handling for Azure API exceptions, logging relevant messages and emitting events.
*   `_handle_completion_error(self, error, from_task, from_agent)`: Handles errors specifically during the completion process, including checking for `LLMContextLengthExceededError`.
*   `call(self, messages, tools, callbacks, available_functions, from_task, from_agent, response_model)`: The main synchronous method to send messages to the Azure AI Inference API, handle tool calls, and process responses.
*   `acall(self, messages, tools, callbacks, available_functions, from_task, from_agent, response_model)`: The asynchronous equivalent of the `call` method.
*   `_prepare_completion_params(self, messages, tools, response_model)`: Prepares the dictionary of parameters to be sent to the Azure API, including message formatting, tool definitions, and response model schema.
*   `_convert_tools_for_interference(self, tools)`: Converts CrewAI's internal tool representation into the format required by Azure OpenAI's function calling.
*   `_format_messages_for_azure(self, messages)`: Transforms generic `LLMMessage` objects into the specific dictionary format expected by the Azure AI Inference API, including handling tool call messages.
*   `_validate_and_emit_structured_output(self, content, response_model, params, from_task, from_agent, usage)`: Validates the LLM's output against a specified Pydantic `response_model` and emits a completion event.
*   `_process_completion_response(self, response, params, available_functions, from_task, from_agent, response_model)`: Processes the raw response from Azure for non-streaming calls, extracting content, handling tool calls, and tracking usage.
*   `_handle_completion(self, params, available_functions, from_task, from_agent, response_model)`: Executes a synchronous, non-streaming completion call to Azure.
*   `_process_streaming_update(self, update, full_response, tool_calls, from_task, from_agent)`: Processes individual chunks received during a streaming completion, accumulating content and tool calls.
*   `_finalize_streaming_response(self, full_response, tool_calls, usage_data, params, available_functions, from_task, from_agent, response_model)`: Finalizes the accumulated streaming response, performing tool execution or structured output validation.
*   `_handle_streaming_completion(self, params, available_functions, from_task, from_agent, response_model)`: Manages the synchronous streaming completion process.
*   `_ahandle_completion(self, params, available_functions, from_task, from_agent, response_model)`: Executes an asynchronous, non-streaming completion call to Azure.
*   `_ahandle_streaming_completion(self, params, available_functions, from_task, from_agent, response_model)`: Manages the asynchronous streaming completion process.
*   `supports_function_calling(self)`: Indicates if the current model supports function calling based on its type.
*   `supports_stop_words(self)`: Determines if the model supports stop words, considering limitations of certain Azure AI Foundry models.
*   `get_context_window_size(self)`: Provides the context window size for various Azure models.
*   `_extract_azure_token_usage(response)`: Static method to parse token usage details from Azure API responses.
*   `aclose(self)`: Asynchronously closes the underlying HTTP client to release resources.
*   `__aenter__(self)`, `__aexit__(self, exc_type, exc_val, exc_tb)`: Enables `AzureCompletion` to be used as an asynchronous context manager.
*   `supports_multimodal(self)`: Checks if the configured model is a vision-enabled model supporting multimodal inputs.

## Integration with the Overall System

The `azure_completion` module serves as the bridge between CrewAI's agent framework and Azure AI Inference. When a Crew is configured to use an Azure model, instances of `AzureCompletion` are created and utilized by agents to generate responses, perform tool calls, and handle complex conversational flows. Its adherence to the `BaseLLM` interface ensures seamless integration within CrewAI's broader [LLM Integrations](llm_integrations.md) framework, allowing agents to swap between different LLM providers with minimal configuration changes. It plays a crucial role in enabling CrewAI to operate effectively within an Azure-powered ecosystem.
