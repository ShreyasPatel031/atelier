# Content Moderation Module

The `content_moderation` module provides tools for moderating text content using external services, specifically OpenAI's moderation API. It helps identify and flag content that violates defined policies, offering options to either raise errors or return informative messages.

## Architecture and Core Components

The `content_moderation` module is a leaf module within the `classic_chains_specialized.ai_feedback_chains` hierarchy. Its primary component is the `OpenAIModerationChain`, which encapsulates the logic for interacting with the OpenAI moderation endpoint.

### OpenAIModerationChain

`OpenAIModerationChain` is a specialized chain designed to pass input text through OpenAI's content moderation API. It checks for policy violations and handles the response based on configured error settings. This chain inherits from the `Chain` class, providing standard chain functionalities.

#### Key Features:

*   **OpenAI Integration:** Directly interfaces with the OpenAI Moderation API to send text and receive moderation results.
*   **Configurable Error Handling:** Can be configured to either raise a `ValueError` when flagged content is detected or return a predefined error string.
*   **API Version Compatibility:** Supports both pre-1.0 and post-1.0 versions of the OpenAI Python client library.
*   **Asynchronous Support:** Provides both synchronous (`_call`) and asynchronous (`_acall`) methods for moderation.

#### Configuration Parameters:

*   `client`: The OpenAI API client instance.
*   `async_client`: The asynchronous OpenAI API client instance.
*   `model_name`: (Optional) Specifies the moderation model to use.
*   `error`: A boolean flag. If `True`, a `ValueError` is raised for flagged content; otherwise, an error string is returned.
*   `input_key`: The dictionary key for the input text (default: "input").
*   `output_key`: The dictionary key for the moderation result (default: "output").
*   `openai_api_key`: Your OpenAI API key (can also be set via `OPENAI_API_KEY` environment variable).
*   `openai_organization`: Your OpenAI organization ID (can also be set via `OPENAI_ORGANIZATION` environment variable).
*   `openai_pre_1_0`: Internal flag to manage compatibility with older OpenAI library versions.

#### Dependencies:

*   **`openai` package:** Required for interacting with the OpenAI API.
*   **`core_api`**: Provides the base `Chain` class from which `OpenAIModerationChain` inherits.
*   **`core_utils`**: Likely used for environment variable retrieval (`get_from_dict_or_env`) and package version checking (`check_package_version`).

## System Integration

The `content_moderation` module is part of the `ai_feedback_chains` within the `classic_chains_specialized` family. It serves as a crucial component for applications requiring automated content policy enforcement, ensuring that generated or user-provided text adheres to safety guidelines before further processing or display.

This module integrates into larger AI applications by taking raw text input and providing a moderated output. It can be chained with other components that generate or consume text, acting as a gatekeeper for content quality and safety.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "openai_moderation_chain", "label": "OpenAIModerationChain", "type": "component", "link": null},
        {"id": "openai_api", "label": "OpenAI API", "type": "external", "link": null},
        {"id": "core_api", "label": "Core API (Chain)", "type": "external", "link": "core_api.md"},
        {"id": "core_utils", "label": "Core Utilities", "type": "external", "link": "core_utils.md"}
    ],
    "edges": [
        {"source": "openai_moderation_chain", "target": "openai_api"},
        {"source": "openai_moderation_chain", "target": "core_api"},
        {"source": "openai_moderation_chain", "target": "core_utils"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    openai_moderation_chain[OpenAIModerationChain]
    openai_api[OpenAI API]
    core_api[Core API (Chain)]
    core_utils[Core Utilities]

    openai_moderation_chain --> openai_api
    openai_moderation_chain --> core_api
    openai_moderation_chain --> core_utils
```