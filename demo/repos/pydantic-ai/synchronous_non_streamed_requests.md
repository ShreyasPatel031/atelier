# synchronous_non_streamed_requests

The `synchronous_non_streamed_requests` module provides a synchronous interface for making non-streamed requests to AI models. It is a convenience module designed for environments where an asynchronous event loop is not active or desired, allowing developers to interact with AI models using a straightforward blocking call.

## Purpose and Core Functionality

The primary purpose of this module is to simplify direct interactions with AI models by offering a synchronous API. It abstracts away the underlying asynchronous nature of model requests, making it accessible for applications that operate in a synchronous context.

The core functionality is encapsulated in the `model_request_sync` function, which:
- Takes the model identifier, a sequence of messages, and optional model settings or parameters.
- Executes an asynchronous model request synchronously using `_get_event_loop().run_until_complete()`.
- Returns a `ModelResponse` containing the model's output and token usage.

This module is particularly useful for scripting, command-line tools, or any application where a simple, blocking call to an AI model is preferred.

## Architecture and Component Relationships

The `synchronous_non_streamed_requests` module is a leaf module within the `pydantic_ai_misc.direct_model_requests.synchronous_model_requests` hierarchy. It contains one main function, `model_request_sync`, which orchestrates the synchronous call to an AI model.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "model_request_sync", "label": "model_request_sync", "type": "component", "link": null},
        {"id": "model_request_async", "label": "model_request (async)", "type": "external", "link": "synchronous_model_requests.md"},
        {"id": "get_event_loop", "label": "_get_event_loop", "type": "external", "link": "async_helpers.md"},
        {"id": "model_interface_types", "label": "Model Interface Types (models, messages, settings)", "type": "external", "link": "pydantic_ai_models.md"}
    ],
    "edges": [
        {"source": "model_request_sync", "target": "model_request_async"},
        {"source": "model_request_sync", "target": "get_event_loop"},
        {"source": "model_request_sync", "target": "model_interface_types"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    model_request_sync[model_request_sync]
    model_request_async[model_request (async)]
    get_event_loop[_get_event_loop]
    model_request_sync --> model_request_async
    model_request_sync --> get_event_loop
    model_request_sync --> model_interface_types
```

### Components:
- **`model_request_sync`**: The core function that initiates a synchronous, non-streamed request to an AI model. It acts as a wrapper, executing an underlying asynchronous model request.

### Dependencies:
- **`model_request` (async)**: The `model_request_sync` function relies on the asynchronous `model_request` function for the actual model interaction. This dependency is from the parent module `synchronous_model_requests`.
- **`_get_event_loop`**: This utility function, likely residing in the [async_helpers](async_helpers.md) or [async_utilities](async_utilities.md) module, is used to retrieve or create an event loop to run the asynchronous `model_request` synchronously.
- **Model Interface Types**: This module implicitly depends on various data structures and enums defined in the `pydantic_ai_models` and related modules, such as `models.Model`, `messages.ModelMessage`, `messages.ModelResponse`, `settings.ModelSettings`, and `models.ModelRequestParameters` to define the input and output types for model interactions. Refer to [pydantic_ai_models](pydantic_ai_models.md) for more details.

## How the Module Fits into the Overall System

The `synchronous_non_streamed_requests` module is a crucial part of the `pydantic_ai_misc` family, specifically within the `direct_model_requests` sub-system. It provides a synchronous entry point for interacting with AI models, complementing the asynchronous capabilities offered elsewhere in the system.

It allows for flexible integration into applications that might not be built around an asynchronous event loop, ensuring that AI model capabilities are accessible across a wider range of software architectures. By offering a direct and blocking request mechanism, it simplifies development for use cases where immediate results from model inference are required without managing asynchronous patterns.
