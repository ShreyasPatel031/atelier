# Multion Integration Module

The `multion_integration` module provides a specialized tool, `MultiOnTool`, for enabling Large Language Models (LLMs) to interact with web browsers using natural language instructions. This module encapsulates the functionality of the MultiOn API, allowing agents to perform complex web browsing tasks such as navigation, data extraction, and form submission within a CrewAI environment.

## Purpose and Core Functionality

The primary purpose of this module is to bridge the gap between AI agents and real-world web interfaces. By leveraging the MultiOn platform, agents gain the ability to browse the internet dynamically based on their instructions. This is crucial for tasks requiring up-to-date information, interaction with web applications, or actions that cannot be resolved through static data sources.

The `MultiOnTool` facilitates:
- **Natural Language Web Browsing**: Translating natural language commands into browser actions.
- **Session Management**: Maintaining browsing sessions to allow for multi-step interactions.
- **Dynamic Package Installation**: Automatically prompting for and installing the `multion` Python package if it's not present.

## Architecture and Component Relationships

The `multion_integration` module contains the `MultiOnTool` class, which is a specialized CrewAI tool. This tool acts as an interface to the external MultiOn service.

### `MultiOnTool`

The `MultiOnTool` class extends `BaseTool` from the [crewai_tool_base](crewai_tool_base.md) module, inheriting its fundamental structure and integration capabilities within the CrewAI framework.

-   **Initialization**: During initialization, it checks for the `multion` Python package. If missing, it offers to install it using `uv`. It then initializes the `MultiOn` client, typically using an API key retrieved from environment variables.
-   **Execution (`_run` method)**: The `_run` method takes a natural language command (`cmd`) and other optional arguments. It then calls the `browse` method of the internal `multion` client, passing the command and managing the browsing session. The result, including the browsing message and status, is returned to the agent.
-   **Dependencies**:
    -   **`multion` library**: The core external library used for web browsing automation.
    -   **`BaseTool`**: The base class for all tools in CrewAI.
    -   **Environment Variables**: Relies on `MULTION_API_KEY` for authentication with the MultiOn service.

## How the Module Fits into the Overall System

The `multion_integration` module is a sub-module of `crewai_tools_web_scraping`. It enriches the web scraping capabilities of CrewAI by providing an advanced, interactive browsing mechanism that goes beyond static content retrieval. It complements other web-related tools by offering dynamic interaction and natural language control over web browsers, making it invaluable for tasks requiring direct manipulation of web elements or navigating complex web applications.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "multion_tool", "label": "MultiOnTool", "type": "component", "link": null},
        {"id": "multion_client", "label": "MultiOn Client", "type": "component", "link": null},
        {"id": "base_tool", "label": "BaseTool", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "web_scraping", "label": "crewai_tools_web_scraping", "type": "external", "link": "crewai_tools_web_scraping.md"},
        {"id": "os_env", "label": "OS Environment (MULTION_API_KEY)", "type": "external", "link": null},
        {"id": "subprocess", "label": "Subprocess Module", "type": "external", "link": null},
        {"id": "click_lib", "label": "Click Library", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "multion_tool", "target": "base_tool"},
        {"source": "multion_tool", "target": "multion_client"},
        {"source": "multion_tool", "target": "os_env"},
        {"source": "multion_tool", "target": "subprocess"},
        {"source": "multion_tool", "target": "click_lib"},
        {"source": "web_scraping", "target": "multion_tool"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    multion_tool[MultiOnTool]
    multion_client[MultiOn Client]
    base_tool[BaseTool]
    web_scraping[crewai_tools_web_scraping]
    os_env[OS Environment (MULTION_API_KEY)]
    subprocess[Subprocess Module]
    click_lib[Click Library]

    multion_tool -- inherits from --> base_tool
    multion_tool -- uses --> multion_client
    multion_tool -- retrieves API key from --> os_env
    multion_tool -- installs package via --> subprocess
    multion_tool -- uses for confirmation --> click_lib
    web_scraping -- contains --> multion_tool
```