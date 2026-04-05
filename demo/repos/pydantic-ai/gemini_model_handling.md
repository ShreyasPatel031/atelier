# Gemini Model Handling

This module is responsible for the core integration and configuration of Gemini models within the `pydantic_ai_slim` framework. It provides the `GeminiModel` class for interacting with the Gemini API and utility functions for tool configuration.

## Core Components

### `GeminiModel`
The `GeminiModel` class provides an interface for interacting with the Gemini API, implemented from scratch for direct API communication. It handles model initialization, request preparation, and processing of both regular and streamed responses.

**Key functionalities include**:
- **Initialization**: Configures the Gemini model with a specified `model_name` and a `provider` (e.g., 'google-gla' or 'google-vertex').
- **Request Handling**: Manages synchronous and asynchronous requests to the Gemini API, converting `ModelMessage` objects into Gemini-compatible content.
- **Tool Integration**: Processes tool definitions from `ModelRequestParameters` to construct `_GeminiTools` and `_GeminiToolConfig` for function calling.
- **Response Processing**: Parses raw API responses into `ModelResponse` or `StreamedResponse` objects, handling potential errors and extracting usage metadata.
- **Content Mapping**: Converts various `ModelMessage` parts (system prompts, user prompts, tool returns, binary content, file URLs) into the appropriate Gemini content format.
- **Schema Mapping**: Translates `OutputObjectDefinition` into a JSON schema for native output mode when `response_mime_type` is `application/json`.

### `_tool_config`
The `_tool_config` function is a utility responsible for generating the `_GeminiToolConfig` object. This configuration is crucial for enabling function calling in Gemini models. It specifies that the model can call *any* of the provided functions by name.