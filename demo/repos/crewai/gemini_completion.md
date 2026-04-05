# `gemini_completion`

## Introduction

The `gemini_completion` module provides a robust and comprehensive integration with Google's Gemini large language models within the CrewAI framework. It offers native support for Gemini's advanced features, including function calling, streaming responses, and structured output formatting. This module is designed to allow agents to interact seamlessly with Gemini models for various tasks, from simple text generation to complex tool-augmented operations.

## Purpose and Core Functionality

The primary purpose of the `gemini_completion` module is to serve as the interface between the CrewAI framework and Google Gemini models. It encapsulates the complexities of interacting with the Google Gen AI Python SDK, providing a consistent `BaseLLM` interface for CrewAI agents.

Key functionalities include:

- **Native Gemini Integration**: Direct use of the Google Gen AI Python SDK for optimal performance and access to the latest Gemini features.
- **Flexible Authentication**: Supports API key authentication for the Gemini API and OAuth2/ADC for Vertex AI, with automatic environment variable resolution (`GOOGLE_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`).
- **Function Calling**: Facilitates the conversion of CrewAI tool definitions into Gemini's `FunctionDeclaration` format, enabling agents to leverage external tools.
- **Streaming Support**: Handles real-time chunk processing for streaming responses, providing intermediate outputs for a more dynamic user experience.
- **Structured Output**: Supports Pydantic models for enforcing structured JSON responses, crucial for reliable data extraction and downstream processing.
- **Context Window Management**: Provides accurate context window sizes for various Gemini models, ensuring efficient token usage.
- **Multimodal Capabilities**: Declares support for multimodal inputs, aligning with Gemini's advanced capabilities.
- **Error Handling**: Implements specific error handling for Gemini API errors, including context length exceeded errors.
- **Event Emission**: Integrates with the `crewai_event_system` to emit detailed events at various stages of the LLM call lifecycle (started, failed, completed, stream chunks, thinking chunks).
- **File Uploader Integration**: Provides a method to retrieve a `GeminiFileUploader` instance for handling file uploads directly through the configured Gemini client.

## Architecture and Component Relationships

The `gemini_completion` module is built around the `GeminiCompletion` class, which inherits from `BaseLLM` from the [`llm_base`](llm_base.md) module. This inheritance ensures adherence to the standard LLM interface expected by the CrewAI framework.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "gemini_completion", "label": "GeminiCompletion", "type": "component", "link": null},
        {"id": "_normalize_gemini_fields", "label": "_normalize_gemini_fields", "type": "component", "link": null},
        {"id": "_init_client", "label": "_init_client", "type": "component", "link": null},
        {"id": "to_config_dict", "label": "to_config_dict", "type": "component", "link": null},
        {"id": "_initialize_client", "label": "_initialize_client", "type": "component", "link": null},
        {"id": "call", "label": "call", "type": "component", "link": null},
        {"id": "acall", "label": "acall", "type": "component", "link": null},
        {"id": "_prepare_generation_config", "label": "_prepare_generation_config", "type": "component", "link": null},
        {"id": "_convert_tools_for_interference", "label": "_convert_tools_for_interference", "type": "component", "link": null},
        {"id": "_format_messages_for_gemini", "label": "_format_messages_for_gemini", "type": "component", "link": null},
        {"id": "_validate_and_emit_structured_output", "label": "_validate_and_emit_structured_output", "type": "component", "link": null},
        {"id": "_finalize_completion_response", "label": "_finalize_completion_response", "type": "component", "link": null},
        {"id": "_handle_structured_output_tool_call", "label": "_handle_structured_output_tool_call", "type": "component", "link": null},
        {"id": "_process_response_with_tools", "label": "_process_response_with_tools", "type": "component", "link": null},
        {"id": "_process_stream_chunk", "label": "_process_stream_chunk", "type": "component", "link": null},
        {"id": "_finalize_streaming_response", "label": "_finalize_streaming_response", "type": "component", "link": null},
        {"id": "_handle_completion", "label": "_handle_completion", "type": "component", "link": null},
        {"id": "_handle_streaming_completion", "label": "_handle_streaming_completion", "type": "component", "link": null},
        {"id": "_ahandle_completion", "label": "_ahandle_completion", "type": "component", "link": null},
        {"id": "_ahandle_streaming_completion", "label": "_ahandle_streaming_completion", "type": "component", "link": null},
        {"id": "supports_function_calling", "label": "supports_function_calling", "type": "component", "link": null},
        {"id": "supports_stop_words", "label": "supports_stop_words", "type": "component", "link": null},
        {"id": "get_context_window_size", "label": "get_context_window_size", "type": "component", "link": null},
        {"id": "_extract_token_usage", "label": "_extract_token_usage", "type": "component", "link": null},
        {"id": "_extract_text_from_response", "label": "_extract_text_from_response", "type": "component", "link": null},
        {"id": "_add_property_ordering", "label": "_add_property_ordering", "type": "component", "link": null},
        {"id": "_convert_contents_to_dict", "label": "_convert_contents_to_dict", "type": "component", "link": null},
        {"id": "supports_multimodal", "label": "supports_multimodal", "type": "component", "link": null},
        {"id": "format_text_content", "label": "format_text_content", "type": "component", "link": null},
        {"id": "get_file_uploader", "label": "get_file_uploader", "type": "component", "link": null},
        {"id": "base_llm", "label": "BaseLLM", "type": "external", "link": "llm_base.md"},
        {"id": "google_gen_ai_sdk", "label": "Google Gen AI SDK", "type": "external", "link": null},
        {"id": "event_system", "label": "CrewAI Event System", "type": "external", "link": "crewai_event_system.md"},
        {"id": "file_uploaders", "label": "CrewAI File Uploaders", "type": "external", "link": "crewai_files_uploaders.md"},
        {"id": "llm_exception", "label": "LLM Exception Handling", "type": "external", "link": null},
        {"id": "execution_context", "label": "CrewAI Execution Context", "type": "external", "link": "crewai_execution_context.md"},
        {"id": "pydantic_schema_gen", "label": "Pydantic Schema Generator", "type": "external", "link": "crewai_utilities.md"}
    ],
    "edges": [
        {"source": "gemini_completion", "target": "base_llm"},
        {"source": "gemini_completion", "target": "_normalize_gemini_fields"},
        {"source": "gemini_completion", "target": "_init_client"},
        {"source": "gemini_completion", "target": "to_config_dict"},
        {"source": "gemini_completion", "target": "_initialize_client"},
        {"source": "gemini_completion", "target": "call"},
        {"source": "gemini_completion", "target": "acall"},
        {"source": "gemini_completion", "target": "supports_function_calling"},
        {"source": "gemini_completion", "target": "supports_stop_words"},
        {"source": "gemini_completion", "target": "get_context_window_size"},
        {"source": "gemini_completion", "target": "supports_multimodal"},
        {"source": "gemini_completion", "target": "format_text_content"},
        {"source": "gemini_completion", "target": "get_file_uploader"},

        {"source": "_init_client", "target": "_initialize_client"},
        {"source": "_initialize_client", "target": "google_gen_ai_sdk"},

        {"source": "call", "target": "_format_messages_for_gemini"},
        {"source": "call", "target": "_prepare_generation_config"},
        {"source": "call", "target": "_handle_streaming_completion"},
        {"source": "call", "target": "_handle_completion"},
        {"source": "call", "target": "event_system"},
        {"source": "call", "target": "llm_exception"},
        {"source": "call", "target": "execution_context"},

        {"source": "acall", "target": "_format_messages_for_gemini"},
        {"source": "acall", "target": "_prepare_generation_config"},
        {"source": "acall", "target": "_ahandle_streaming_completion"},
        {"source": "acall", "target": "_ahandle_completion"},
        {"source": "acall", "target": "event_system"},
        {"source": "acall", "target": "llm_exception"},
        {"source": "acall", "target": "execution_context"},

        {"source": "_prepare_generation_config", "target": "_convert_tools_for_interference"},
        {"source": "_prepare_generation_config", "target": "pydantic_schema_gen"},

        {"source": "_convert_tools_for_interference", "target": "google_gen_ai_sdk"},

        {"source": "_format_messages_for_gemini", "target": "google_gen_ai_sdk"},

        {"source": "_validate_and_emit_structured_output", "target": "event_system"},
        {"source": "_validate_and_emit_structured_output", "target": "_convert_contents_to_dict"},

        {"source": "_finalize_completion_response", "target": "_validate_and_emit_structured_output"},
        {"source": "_finalize_completion_response", "target": "event_system"},
        {"source": "_finalize_completion_response", "target": "_convert_contents_to_dict"},

        {"source": "_handle_structured_output_tool_call", "target": "event_system"},
        {"source": "_handle_structured_output_tool_call", "target": "_convert_contents_to_dict"},

        {"source": "_process_response_with_tools", "target": "_handle_structured_output_tool_call"},
        {"source": "_process_response_with_tools", "target": "_finalize_completion_response"},
        {"source": "_process_response_with_tools", "target": "event_system"},
        {"source": "_process_response_with_tools", "target": "_extract_token_usage"},
        {"source": "_process_response_with_tools", "target": "_extract_text_from_response"},
        {"source": "_process_response_with_tools", "target": "_convert_contents_to_dict"},

        {"source": "_process_stream_chunk", "target": "event_system"},
        {"source": "_process_stream_chunk", "target": "_extract_token_usage"},

        {"source": "_finalize_streaming_response", "target": "event_system"},
        {"source": "_finalize_streaming_response", "target": "_track_token_usage_internal"},
        {"source": "_finalize_streaming_response", "target": "_handle_structured_output_tool_call"},
        {"source": "_finalize_streaming_response", "target": "_finalize_completion_response"},
        {"source": "_finalize_streaming_response", "target": "_convert_contents_to_dict"},

        {"source": "_handle_completion", "target": "google_gen_ai_sdk"},
        {"source": "_handle_completion", "target": "_extract_token_usage"},
        {"source": "_handle_completion", "target": "_track_token_usage_internal"},
        {"source": "_handle_completion", "target": "_process_response_with_tools"},
        {"source": "_handle_completion", "target": "llm_exception"},

        {"source": "_handle_streaming_completion", "target": "google_gen_ai_sdk"},
        {"source": "_handle_streaming_completion", "target": "_process_stream_chunk"},
        {"source": "_handle_streaming_completion", "target": "_finalize_streaming_response"},

        {"source": "_ahandle_completion", "target": "google_gen_ai_sdk"},
        {"source": "_ahandle_completion", "target": "_extract_token_usage"},
        {"source": "_ahandle_completion", "target": "_track_token_usage_internal"},
        {"source": "_ahandle_completion", "target": "_process_response_with_tools"},
        {"source": "_ahandle_completion", "target": "llm_exception"},

        {"source": "_ahandle_streaming_completion", "target": "google_gen_ai_sdk"},
        {"source": "_ahandle_streaming_completion", "target": "_process_stream_chunk"},
        {"source": "_ahandle_streaming_completion", "target": "_finalize_streaming_response"},

        {"source": "get_context_window_size", "target": "llm_base"},

        {"source": "get_file_uploader", "target": "file_uploaders"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    gemini_completion[GeminiCompletion]
    _normalize_gemini_fields[_normalize_gemini_fields]
    _init_client[_init_client]
    to_config_dict[to_config_dict]
    _initialize_client[_initialize_client]
    call[call]
    acall[acall]
    _prepare_generation_config[_prepare_generation_config]
    _convert_tools_for_interference[_convert_tools_for_interference]
    _format_messages_for_gemini[_format_messages_for_gemini]
    _validate_and_emit_structured_output[_validate_and_emit_structured_output]
    _finalize_completion_response[_finalize_completion_response]
    _handle_structured_output_tool_call[_handle_structured_output_tool_call]
    _process_response_with_tools[_process_response_with_tools]
    _process_stream_chunk[_process_stream_chunk]
    _finalize_streaming_response[_finalize_streaming_response]
    _handle_completion[_handle_completion]
    _handle_streaming_completion[_handle_streaming_completion]
    _ahandle_completion[_ahandle_completion]
    _ahandle_streaming_completion[_ahandle_streaming_completion]
    supports_function_calling[supports_function_calling]
    supports_stop_words[supports_stop_words]
    get_context_window_size[get_context_window_size]
    _extract_token_usage[_extract_token_usage]
    _extract_text_from_response[_extract_text_from_response]
    _add_property_ordering[_add_property_ordering]
    _convert_contents_to_dict[_convert_contents_to_dict]
    supports_multimodal[supports_multimodal]
    format_text_content[format_text_content]
    get_file_uploader[get_file_uploader]

    base_llm[BaseLLM]:::external
    google_gen_ai_sdk[Google Gen AI SDK]:::external
    event_system[CrewAI Event System]:::external
    file_uploaders[CrewAI File Uploaders]:::external
    llm_exception[LLM Exception Handling]:::external
    execution_context[CrewAI Execution Context]:::external
    pydantic_schema_gen[Pydantic Schema Generator]:::external

    gemini_completion --> base_llm
    gemini_completion --> _normalize_gemini_fields
    gemini_completion --> _init_client
    gemini_completion --> to_config_dict
    gemini_completion --> _initialize_client
    gemini_completion --> call
    gemini_completion --> acall
    gemini_completion --> supports_function_calling
    gemini_completion --> supports_stop_words
    gemini_completion --> get_context_window_size
    gemini_completion --> supports_multimodal
    gemini_completion --> format_text_content
    gemini_completion --> get_file_uploader

    _init_client --> _initialize_client
    _initialize_client --> google_gen_ai_sdk

    call --> _format_messages_for_gemini
    call --> _prepare_generation_config
    call --> _handle_streaming_completion
    call --> _handle_completion
    call --> event_system
    call --> llm_exception
    call --> execution_context

    acall --> _format_messages_for_gemini
    acall --> _prepare_generation_config
    acall --> _ahandle_streaming_completion
    acall --> _ahandle_completion
    acall --> event_system
    acall --> llm_exception
    acall --> execution_context

    _prepare_generation_config --> _convert_tools_for_interference
    _prepare_generation_config --> pydantic_schema_gen

    _convert_tools_for_interference --> google_gen_ai_sdk

    _format_messages_for_gemini --> google_gen_ai_sdk

    _validate_and_emit_structured_output --> event_system
    _validate_and_emit_structured_output --> _convert_contents_to_dict

    _finalize_completion_response --> _validate_and_emit_structured_output
    _finalize_completion_response --> event_system
    _finalize_completion_response --> _convert_contents_to_dict

    _handle_structured_output_tool_call --> event_system
    _handle_structured_output_tool_call --> _convert_contents_to_dict

    _process_response_with_tools --> _handle_structured_output_tool_call
    _process_response_with_tools --> _finalize_completion_response
    _process_response_with_tools --> event_system
    _process_response_with_tools --> _extract_token_usage
    _process_response_with_tools --> _extract_text_from_response
    _process_response_with_tools --> _convert_contents_to_dict

    _process_stream_chunk --> event_system
    _process_stream_chunk --> _extract_token_usage

    _finalize_streaming_response --> event_system
    _finalize_streaming_response --> _track_token_usage_internal
    _finalize_streaming_response --> _handle_structured_output_tool_call
    _finalize_streaming_response --> _finalize_completion_response
    _finalize_streaming_response --> _convert_contents_to_dict

    _handle_completion --> google_gen_ai_sdk
    _handle_completion --> _extract_token_usage
    _handle_completion --> _track_token_usage_internal
    _handle_completion --> _process_response_with_tools
    _handle_completion --> llm_exception

    _handle_streaming_completion --> google_gen_ai_sdk
    _handle_streaming_completion --> _process_stream_chunk
    _handle_streaming_completion --> _finalize_streaming_response

    _ahandle_completion --> google_gen_ai_sdk
    _ahandle_completion --> _extract_token_usage
    _ahandle_completion --> _track_token_usage_internal
    _ahandle_completion --> _process_response_with_tools
    _ahandle_completion --> llm_exception

    _ahandle_streaming_completion --> google_gen_ai_sdk
    _ahandle_streaming_completion --> _process_stream_chunk
    _ahandle_streaming_completion --> _finalize_streaming_response

    get_context_window_size --> llm_base

    get_file_uploader --> file_uploaders

    classDef external fill:#f9f,stroke:#333,stroke-width:2px
```

### Component Details

#### `GeminiCompletion` Class

Inherits from [`BaseLLM`](llm_base.md), providing the core implementation for interacting with Google Gemini models. It manages model configuration, API calls, response parsing, and error handling.

-   **`model`**: The specific Gemini model to use (e.g., "gemini-2.0-flash-001").
-   **`project`**: Google Cloud project ID for Vertex AI (optional).
-   **`location`**: Google Cloud location for Vertex AI (optional, defaults to "us-central1").
-   **`top_p`, `top_k`, `max_output_tokens`, `temperature`**: Generation configuration parameters.
-   **`stream`**: Boolean indicating whether to use streaming responses.
-   **`safety_settings`**: Dictionary for configuring Gemini's safety features.
-   **`use_vertexai`**: Boolean to explicitly enable or disable Vertex AI integration.
-   **`response_format`**: Optional Pydantic model for structured output.
-   **`tools`**: List of tool definitions for function calling.
-   **`supports_tools`**: Indicates if the current Gemini model version supports tool use.
-   **`is_gemini_2_0`**: Indicates if the model is a Gemini 2.0+ version, which affects structured output handling.

#### Core Methods:

-   **`_normalize_gemini_fields(cls, data: Any) -> Any`**: A `model_validator` that normalizes Gemini-specific fields, resolves environment variables for API keys and project/location, and determines model capabilities like `supports_tools` and `is_gemini_2_0`.
-   **`_init_client(self) -> GeminiCompletion`**: A `model_validator` called after initialization to set up the Google Gen AI client.
-   **`_initialize_client(self, use_vertexai: bool = False) -> genai.Client`**: Initializes the Google Gen AI client, handling the nuances of API key vs. Vertex AI (ADC) authentication. It correctly configures the client based on provided credentials and `use_vertexai` flag.
-   **`call(...)` and `acall(...)`**: Synchronous and asynchronous methods for making calls to the Gemini `generate_content` API. They handle message formatting, generation configuration, streaming, tool execution, structured output validation, and event emission.
-   **`_prepare_generation_config(...)`**: Prepares the `GenerateContentConfig` object for the Gemini API call, including system instructions, generation parameters, tools, and structured response models. It intelligently handles the different structured output mechanisms for Gemini 1.5 and Gemini 2.0+.
-   **`_convert_tools_for_interference(...)`**: Converts CrewAI tool definitions into Gemini's `FunctionDeclaration` format, crucial for native function calling.
-   **`_format_messages_for_gemini(...)`**: Formats messages from the CrewAI `LLMMessage` format into Gemini's `Content` objects, handling roles, text, and multimodal parts. It also extracts system instructions separately as required by Gemini.
-   **`_process_response_with_tools(...)`**: Processes the Gemini API response, handling potential function calls. It can either execute the tools internally (if `available_functions` are provided) or return the tool calls for external execution (if `tools` are present without `available_functions`). It also manages the "structured_output" pseudo-tool for Pydantic model responses.
-   **`_handle_completion(...)` and `_handle_streaming_completion(...)`**: Internal methods for executing non-streaming and streaming Gemini API calls, respectively. They orchestrate the call, extract token usage, and process the responses.
-   **`supports_function_calling()`**: Returns `True` if the configured Gemini model supports function calling (Gemini 1.5+).
-   **`get_context_window_size()`**: Returns the context window size for the specified Gemini model, leveraging internal mappings and a usage ratio.
-   **`_extract_token_usage(...)`**: Extracts token usage metrics from the Gemini API response.
-   **`_add_property_ordering(...)`**: A static method that recursively adds `propertyOrdering` to JSON schemas, ensuring compatibility with Gemini 2.0+ structured output requirements.
-   **`get_file_uploader()`**: Provides an instance of `GeminiFileUploader` for facilitating file uploads, which utilizes the same underlying Gemini client configuration.

## How the Module Fits into the Overall System

The `gemini_completion` module is a core component within the `crewai_llm_integrations` package, specifically within the `llm_providers_completion` sub-module. It provides the concrete implementation for interacting with Google Gemini models, serving as a plug-and-play LLM for any CrewAI agent or task requiring Gemini's capabilities.

-   **Integration with Agents and Tasks**: CrewAI agents and tasks can be configured to use `GeminiCompletion` as their LLM, allowing them to leverage Gemini's generation, function calling, and multimodal features.
-   **Unified LLM Interface**: By inheriting from [`BaseLLM`](llm_base.md), it provides a standardized interface for interacting with different LLM providers, making it easy to switch between models without significant code changes.
-   **Event System Integration**: The module extensively uses the [`crewai_event_system`](crewai_event_system.md) to emit detailed events about LLM calls, providing observability and facilitating debugging and monitoring within the CrewAI framework.
-   **File Management**: Through its `get_file_uploader` method, it integrates with the [`crewai_files_uploaders`](crewai_files_uploaders.md) module, allowing agents to upload and manage files for multimodal interactions with Gemini.
-   **Context Management**: It interacts with the [`crewai_execution_context`](crewai_execution_context.md) for managing the execution context of LLM calls.
-   **Schema Generation**: It leverages an internal Pydantic Schema Generator (implicitly part of [`crewai_utilities`](crewai_utilities.md) for creating robust structured output schemas.

In essence, `gemini_completion` acts as the bridge that connects the intelligence of Google Gemini with the cooperative multi-agent capabilities of CrewAI, enabling agents to perform complex tasks by leveraging powerful generative AI models.