# serply_web_search Module Documentation

## Introduction

The `serply_web_search` module provides the `SerplyWebSearchTool`, a specialized tool within the CrewAI framework for performing web searches through the Serply API. It enables agents to retrieve relevant information from Google search results based on a given query, supporting various search parameters such as host language, result limit, device type, and proxy location.

## Architecture and Component Relationships

The `serply_web_search` module is a leaf module primarily encapsulating the `SerplyWebSearchTool` class. This tool inherits from `BaseTool` (from the `crewai_tool_base` module) and leverages the Serply API for its core search functionality.

### SerplyWebSearchTool

The `SerplyWebSearchTool` is responsible for:
-   **Configuration**: Initializing with parameters like `hl` (host language), `limit` (number of results), `device_type`, and `proxy_location`.
-   **API Key Management**: Retrieving the `SERPLY_API_KEY` from environment variables, which is mandatory for Serply API access.
-   **Request Construction**: Building the `query_payload` and `headers` necessary for making requests to the Serply API.
-   **Execution**: The `_run` method handles the actual HTTP GET request to the Serply search endpoint, processes the JSON response, and formats the search results into a readable string.
-   **Schema Definition**: Utilizing `SerplyWebSearchToolSchema` (likely from the `search_api_schemas` module) to define the expected arguments for the tool, ensuring type safety and proper validation.

## How the Module Fits into the Overall System

The `serply_web_search` module is a crucial part of the `crewai_tools_web_search` ecosystem, specifically nested under `serply_integration` and `serply_search_tools`. It provides a concrete implementation for web search capabilities using the Serply platform, allowing CrewAI agents to perform intelligent information retrieval tasks.

It integrates with the broader CrewAI tools framework by inheriting from `BaseTool`, making it readily pluggable into agent workflows. The module's reliance on environment variables for API keys aligns with secure configuration practices across the system.

By centralizing Serply web search functionality, this module ensures consistency and reusability, reducing redundancy across different agents or tasks that require web search capabilities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "serply_web_search_tool", "label": "SerplyWebSearchTool", "type": "component", "link": null},
        {"id": "init_method", "label": "Constructor (__init__)", "type": "component", "link": null},
        {"id": "run_method", "label": "Execution (_run)", "type": "component", "link": null},
        {"id": "serply_api", "label": "Serply API", "type": "external", "link": null},
        {"id": "serply_integration", "label": "serply_integration Module", "type": "external", "link": "serply_integration.md"},
        {"id": "crewai_tool_base", "label": "crewai_tool_base Module", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "search_api_schemas", "label": "search_api_schemas Module", "type": "external", "link": "search_api_schemas.md"}
    ],
    "edges": [
        {"source": "serply_web_search_tool", "target": "init_method"},
        {"source": "serply_web_search_tool", "target": "run_method"},
        {"source": "init_method", "target": "serply_api"},
        {"source": "run_method", "target": "serply_api"},
        {"source": "serply_web_search_tool", "target": "crewai_tool_base"},
        {"source": "serply_web_search_tool", "target": "search_api_schemas"},
        {"source": "serply_integration", "target": "serply_web_search_tool"}

    ],
    "groups": []
}
-->
```mermaid
graph TD
    serply_web_search_tool[SerplyWebSearchTool]
    init_method[Constructor (__init__)]
    run_method[Execution (_run)]
    serply_api[Serply API]
    serply_integration[serply_integration Module]
    crewai_tool_base[crewai_tool_base Module]
    search_api_schemas[search_api_schemas Module]

    serply_web_search_tool --> init_method
    serply_web_search_tool --> run_method
    init_method --> serply_api
    run_method --> serply_api
    serply_web_search_tool --> crewai_tool_base
    serply_web_search_tool --> search_api_schemas
    serply_integration --> serply_web_search_tool
```