# `stagehand_tool_implementation` Module Documentation

## Introduction
The `stagehand_tool_implementation` module provides the `StagehandTool`, a powerful component for enabling AI agents to automate web browser interactions using natural language. This module integrates with the Stagehand library, allowing for complex web tasks to be broken down into atomic, manageable actions.

## Purpose and Core Functionality
The `StagehandTool` is designed to facilitate robust web automation within AI-driven workflows. Its core purpose is to translate natural language instructions into concrete browser actions, data extraction operations, or page observations. This empowers agents to interact with dynamic web content without requiring direct code manipulation.

The tool supports the following primary command types:
*   **`act`**: Performs general web actions such as clicking buttons, typing into input fields, scrolling, or navigating within a page. It can process multi-step instructions by breaking them down into atomic actions.
*   **`navigate`**: Specifically navigates the browser to a given URL.
*   **`extract`**: Extracts structured data from web pages based on natural language instructions.
*   **`observe`**: Identifies and analyzes elements on a page, providing descriptions and suggested actions for interaction.

Key features include:
*   **Natural Language Interaction**: Agents can describe desired web interactions in plain language.
*   **Atomic Action Handling**: Complex instructions are broken down and executed step-by-step, with retry mechanisms for simplified actions if a step fails.
*   **Credential Management**: Automatically detects and uses API keys for Browserbase and various LLM providers (OpenAI, Anthropic, Google Gemini).
*   **Context Management**: Manages browser sessions and ensures proper cleanup of resources.
*   **Error Handling**: Provides detailed error messages and attempts to self-heal or simplify actions on failure.

## Architecture and Component Relationships

### `StagehandTool` Class
The `StagehandTool` class (located at `lib.crewai-tools.src.crewai_tools.tools.stagehand_tool.stagehand_tool.StagehandTool`) is the central component of this module. It inherits from `BaseTool` (from [crewai_tool_base.md](crewai_tool_base.md)) and acts as an interface between the CrewAI agent and the underlying Stagehand library.

**Key internal mechanisms of `StagehandTool`:**
*   **Initialization (`__init__`)**: Sets up configuration parameters (Browserbase API keys, LLM model details, Stagehand server URL, headless mode, timeouts, self-healing, etc.) from direct arguments or environment variables. It also configures logging.
*   **Credential Validation (`_check_required_credentials`)**: Ensures that necessary API keys and the `stagehand` package are installed before operation.
*   **LLM API Key Resolution (`_get_model_api_key`)**: Dynamically selects the appropriate LLM API key based on the configured `model_name` (e.g., `OPENAI_API_KEY` for GPT models, `ANTHROPIC_API_KEY` for Claude, `GOOGLE_API_KEY` for Gemini).
*   **Stagehand Setup (`_setup_stagehand`)**: Initializes and manages the `Stagehand` client and browser `page` object, handling both normal and testing environments.
*   **Instruction Processing (`_extract_steps`, `_simplify_instruction`)**: These methods preprocess natural language instructions, breaking down multi-step commands and simplifying them for retries, enhancing reliability.
*   **Asynchronous Execution (`_async_run`)**: Contains the core logic for executing `act`, `navigate`, `extract`, and `observe` commands using the Stagehand library's functionalities. It handles potential errors and retries.
*   **Synchronous Wrapper (`_run`)**: Provides a synchronous interface for `_async_run`, managing the asynchronous event loop as needed.
*   **Resource Management (`close`, `__del__`, `__enter__`, `__exit__`)**: Ensures that Stagehand browser sessions are properly closed and resources are released, supporting usage as a context manager.

### External Dependencies
The `StagehandTool` has several critical external dependencies:
*   **`stagehand` library**: This is the primary dependency, providing the underlying web automation capabilities. The tool specifically relies on `stagehand.schemas.StagehandConfig`, `stagehand.schemas.ActOptions`, `stagehand.schemas.ExtractOptions`, `stagehand.schemas.ObserveOptions`, and `stagehand.utilities.logging.configure_logging`.
*   **Browserbase API**: Stagehand uses Browserbase for its browser-as-a-service functionality. `BROWSERBASE_API_KEY` and `BROWSERBASE_PROJECT_ID` are required for authentication.
*   **Large Language Model (LLM) APIs**: The Stagehand library itself utilizes an LLM for interpreting instructions and performing actions. The `StagehandTool` intelligently fetches API keys for OpenAI (`OPENAI_API_KEY`), Anthropic (`ANTHROPIC_API_KEY`), or Google (`GOOGLE_API_KEY`) based on the configured `model_name`.

### Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "stagehand_tool_component", "label": "StagehandTool (Component)", "type": "component", "link": null},
        {"id": "stagehand_lib", "label": "Stagehand Library", "type": "external", "link": null},
        {"id": "browserbase_service", "label": "Browserbase API", "type": "external", "link": null},
        {"id": "llm_providers", "label": "LLM Providers (OpenAI, Anthropic, Gemini)", "type": "external", "link": null},
        {"id": "crewai_tool_base", "label": "BaseTool Module", "type": "external", "link": "crewai_tool_base.md"}
    ],
    "edges": [
        {"source": "stagehand_tool_component", "target": "stagehand_lib"},
        {"source": "stagehand_tool_component", "target": "crewai_tool_base"},
        {"source": "stagehand_lib", "target": "browserbase_service"},
        {"source": "stagehand_lib", "target": "llm_providers"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    stagehand_tool_component[StagehandTool (Component)]
    stagehand_lib[Stagehand Library]
    browserbase_service[Browserbase API]
    llm_providers[LLM Providers (OpenAI, Anthropic, Gemini)]
    crewai_tool_base[BaseTool Module]

    stagehand_tool_component --> stagehand_lib
    stagehand_tool_component --> crewai_tool_base
    stagehand_lib --> browserbase_service
    stagehand_lib --> llm_providers
```

## How the Module Fits into the Overall System
The `stagehand_tool_implementation` module, through its `StagehandTool`, is a crucial part of the `crewai-tools` ecosystem, specifically within the `crewai_tools_platform_automation` family of tools. It provides agents with the ability to perform complex, dynamic interactions with web interfaces, which is often a critical requirement for various automation and data gathering tasks.

By abstracting away the complexities of browser automation, this tool allows agents to leverage web resources as seamlessly as any other tool. It enables functionalities like:
*   **Automated Research**: Agents can navigate, search, and extract information from websites to gather data for tasks.
*   **Form Filling and Submissions**: Automating repetitive data entry on web forms.
*   **Testing and Validation**: Interacting with web applications to test functionality or validate data.
*   **Dynamic Data Fetching**: Retrieving information from websites that require interactive steps beyond simple HTTP requests.

The `StagehandTool` enhances the overall capabilities of CrewAI agents, allowing them to tackle a broader range of real-world problems that involve web-based interactions. It works in conjunction with other tools by providing a mechanism to acquire information or perform actions on the web, which can then feed into further agent reasoning or task execution.