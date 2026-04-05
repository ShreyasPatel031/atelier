# LLM Base Module (`llm_base`)

## Introduction
The `llm_base` module provides the foundational abstract base class, `BaseLLM`, for all Large Language Model (LLM) implementations within the CrewAI framework. It defines a standardized interface and common functionalities that all specific LLM providers must adhere to, ensuring consistency and extensibility across different language models.

## Purpose and Core Functionality
The primary purpose of the `llm_base` module is to establish a contract for LLM integrations, allowing developers to seamlessly integrate various LLM providers (e.g., OpenAI, Anthropic, Gemini) by extending the `BaseLLM` class. This module handles:

*   **Standardized Interface**: Defines abstract methods (`call`, `acall`) that concrete LLM implementations must implement for synchronous and asynchronous interactions.
*   **Configuration Management**: Manages common LLM parameters such as model name, temperature, API key, base URL, stop sequences, and additional provider-specific parameters.
*   **Stop Word Handling**: Provides mechanisms for defining and applying stop sequences to truncate LLM responses, ensuring agents focus on relevant output.
*   **Token Usage Tracking**: Includes internal utilities to track token consumption (prompt, completion, total) and successful requests, offering insights into operational costs and efficiency.
*   **Event Emission**: Integrates with the [crewai_event_system](crewai_event_system.md) to emit various events throughout the LLM call lifecycle (started, completed, failed, stream chunks, thinking chunks), enabling robust monitoring and logging.
*   **Hook Integration**: Facilitates integration with the [crewai_hooks_system](crewai_hooks_system.md) by providing methods to invoke `before_llm_call` and `after_llm_call` hooks, allowing for custom pre- and post-processing of LLM interactions.
*   **Tool Execution Handling**: Offers a helper method for executing tools, including event emission for tool usage (started, finished, error).
*   **Message and Structured Output Processing**: Provides utilities for formatting input messages and validating/parsing structured outputs based on Pydantic models.
*   **Multimodal Support**: Includes methods and logic to check for multimodal capabilities and format file attachments in messages for supported models, leveraging the [crewai_files_processing](crewai_files_processing.md) module.

By centralizing these functionalities, `llm_base` reduces boilerplate code for new LLM integrations and ensures a consistent developer experience.

## Architecture and Component Relationships

The `llm_base` module is centered around the `BaseLLM` abstract class, which acts as the blueprint for all LLM integrations. It establishes key attributes and abstract methods while providing a suite of helper functions to manage LLM interactions, eventing, and tool execution.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "base_llm", "label": "BaseLLM (Abstract Class)", "type": "component", "link": null},
        {"id": "crewai_event_system", "label": "CrewAI Event System", "type": "external", "link": "crewai_event_system.md"},
        {"id": "crewai_hooks_system", "label": "CrewAI Hooks System", "type": "external", "link": "crewai_hooks_system.md"},
        {"id": "crewai_utilities", "label": "CrewAI Utilities", "type": "external", "link": "crewai_utilities.md"},
        {"id": "crewai_files_processing", "label": "CrewAI Files Processing", "type": "external", "link": "crewai_files_processing.md"},
        {"id": "crewai_tool_base", "label": "CrewAI Tool Base", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "crewai_task_management", "label": "CrewAI Task Management", "type": "external", "link": "crewai_task_management.md"},
        {"id": "crewai_agent_core", "label": "CrewAI Agent Core", "type": "external", "link": "crewai_agent_core.md"},
        {"id": "llm_providers_completion", "label": "LLM Providers Completion", "type": "external", "link": "llm_providers_completion.md"}
    ],
    "edges": [
        {"source": "base_llm", "target": "crewai_event_system"},
        {"source": "base_llm", "target": "crewai_hooks_system"},
        {"source": "base_llm", "target": "crewai_utilities"},
        {"source": "base_llm", "target": "crewai_files_processing"},
        {"source": "base_llm", "target": "crewai_tool_base", "label": "uses"},
        {"source": "base_llm", "target": "crewai_task_management", "label": "uses"},
        {"source": "base_llm", "target": "crewai_agent_core", "label": "uses"},
        {"source": "llm_providers_completion", "target": "base_llm", "label": "inherits from"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    base_llm[BaseLLM (Abstract Class)]
    crewai_event_system[CrewAI Event System]
    crewai_hooks_system[CrewAI Hooks System]
    crewai_utilities[CrewAI Utilities]
    crewai_files_processing[CrewAI Files Processing]
    crewai_tool_base[CrewAI Tool Base]
    crewai_task_management[CrewAI Task Management]
    crewai_agent_core[CrewAI Agent Core]
    llm_providers_completion[LLM Providers Completion]

    base_llm --> crewai_event_system
    base_llm --> crewai_hooks_system
    base_llm --> crewai_utilities
    base_llm --> crewai_files_processing
    base_llm -- uses --> crewai_tool_base
    base_llm -- uses --> crewai_task_management
    base_llm -- uses --> crewai_agent_core
    llm_providers_completion -- inherits from --> base_llm
```

**Key Components and Interactions:**

*   **`BaseLLM`**: This is the central abstract class. It defines the core attributes like `model`, `temperature`, `api_key`, and `stop` sequences. It includes abstract methods `call` and `acall` which must be implemented by concrete LLM provider classes.
*   **`crewai_event_system`**: `BaseLLM` heavily relies on the [crewai_event_system](crewai_event_system.md) to emit various lifecycle events related to LLM calls and tool usage. This allows other parts of the CrewAI framework or external observers to react to LLM activities.
*   **`crewai_hooks_system`**: The module integrates with the [crewai_hooks_system](crewai_hooks_system.md) to support custom logic execution before and after LLM calls, providing flexibility for developers to inject their own processing.
*   **`crewai_utilities`**: `BaseLLM` utilizes utility functions from the [crewai_utilities](crewai_utilities.md) module, specifically for serialization of messages and responses for event emission, and potentially for printing verbose output.
*   **`crewai_files_processing`**: For multimodal LLMs, `BaseLLM` interacts with the [crewai_files_processing](crewai_files_processing.md) module to format and handle file attachments within messages.
*   **`crewai_tool_base`**, **`crewai_task_management`**, **`crewai_agent_core`**: While `BaseLLM` itself doesn't directly implement these, it defines method signatures (`call`, `acall`, `_handle_tool_execution`) that accept instances of `BaseTool`, `Task`, and `Agent` as parameters, establishing its role in the overall agentic workflow. Refer to [crewai_tool_base](crewai_tool_base.md), [crewai_task_management](crewai_task_management.md), and [crewai_agent_core](crewai_agent_core.md) for more details.
*   **`llm_providers_completion`**: This represents the family of concrete LLM implementation modules (e.g., `openai_completion`, `gemini_completion`) that inherit from `BaseLLM` and provide the actual logic for interacting with specific LLM APIs. Refer to [llm_providers_completion](llm_providers_completion.md) for more details.

## How the Module Fits into the Overall System

The `llm_base` module is a cornerstone of the CrewAI framework's extensibility for Large Language Models. It serves as the abstract blueprint, enforcing a consistent interface for all LLM integrations. This design allows the core CrewAI components (like agents and tasks) to interact with any compliant LLM provider without needing to know the specifics of its API.

When an agent needs to make an LLM call, it interacts with an instance of a class that inherits from `BaseLLM`. This `BaseLLM` instance then manages the communication, applies stop words, tracks token usage, and emits relevant events, abstracting away the complexities of different LLM APIs. This modular approach makes it straightforward to add new LLM providers or swap existing ones, ensuring the CrewAI framework remains flexible and adaptable to the evolving LLM landscape. All concrete LLM implementations within the `crewai_llm_integrations` parent module, such as those found in [llm_providers_completion](llm_providers_completion.md), build upon this `BaseLLM` foundation.
