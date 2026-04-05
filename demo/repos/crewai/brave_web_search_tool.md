# brave_web_search_tool

## Introduction

The `brave_web_search_tool` module provides the `BraveSearchTool`, a specialized tool designed for performing web searches using the Brave Search API. It enables CrewAI agents to access real-time web information, with results returned as structured JSON data, facilitating easy parsing and utilization within automated workflows.

## Purpose and Core Functionality

The primary purpose of the `brave_web_search_tool` module is to offer a robust and reliable mechanism for integrating Brave Search capabilities into CrewAI applications. The core component, `BraveSearchTool`, encapsulates the logic for interacting with the Brave Search API, handling request construction, response parsing, and error management.

### `BraveSearchTool`

-   **Description**: A tool that performs web searches using the Brave Search API, returning results as structured JSON data.
-   **API Key Requirement**: Requires the `BRAVE_API_KEY` environment variable to be set for authentication with the Brave Search API.
-   **Rate Limiting**: Implements a simple rate-limiting mechanism to ensure adherence to API usage policies, with a default minimum interval of 1 second between requests.
-   **Search Parameters**: Supports a wide range of search parameters to refine queries, including:
    -   `q` (query): The search query string (also accepts `query` or `search_query` for backwards compatibility).
    -   `country`: Limits search results to a specific country.
    -   `search_lang` (search language): Specifies the language of the search results.
    -   `count`: Number of results to return (defaults to 10, can be overridden by `n_results`).
    -   `offset`: Starting offset for paginated results.
    -   `safesearch`: Filters explicit content.
    -   `freshness`: Filters results by recency.
    -   `spellcheck`: Enables or disables spell correction.
    -   `text_decorations`: Includes text decorations in snippets.
    -   `extra_snippets`: Includes additional snippets.
    -   `operators`: Allows inclusion of search operators (e.g., `site:`, `filetype:`).
-   **Result Filtering**: Currently limits the result types to "web" to focus on traditional web page results.
-   **Output**: Returns a JSON string containing a list of dictionaries, where each dictionary represents a web result with `url`, `title`, `description` (if available), and `snippets` (if available).
-   **Error Handling**: Catches `requests.RequestException` for network/HTTP errors and `KeyError` for issues during JSON parsing.

## Architecture and Component Relationships

The `brave_web_search_tool` module is centered around the `BraveSearchTool` class, which extends the `BaseTool` from the [crewai_tool_base](crewai_tool_base.md) module. This inheritance provides the fundamental structure and interface for integrating with the CrewAI tool system.

`BraveSearchTool` utilizes the `WebSearchParams` schema, likely defined within the [search_api_schemas](search_api_schemas.md) module, to validate and structure the arguments passed to the search function. This ensures that only valid and expected parameters are used when interacting with the Brave Search API.

The module interacts directly with the Brave Search API over HTTP, making `requests` for search queries and processing the JSON responses. The dependency on `os` for environment variables highlights its reliance on system configuration for sensitive information like API keys.

## Integration with the Overall System

The `brave_web_search_tool` module is a crucial part of the `crewai_tools_web_search.brave_search_integration` sub-package. It provides a specific implementation for web searching using Brave Search, complementing other search integrations available within the larger [crewai_tools_web_search](crewai_tools_web_search.md) module.

It works alongside other Brave-specific tools like `brave_local_pois_tool` and potentially utilizes common functionalities or configurations from `brave_search_base` (if present and designed for shared logic). By adhering to the `BaseTool` interface, `BraveSearchTool` seamlessly integrates into the CrewAI framework, allowing agents to leverage its web search capabilities as needed.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "brave_search_tool", "label": "BraveSearchTool", "type": "component", "link": null},
        {"id": "web_search_params", "label": "WebSearchParams", "type": "external", "link": "search_api_schemas.md"},
        {"id": "base_tool", "label": "BaseTool", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "brave_search_api", "label": "Brave Search API", "type": "external", "link": null},
        {"id": "os_environ", "label": "OS Environment (BRAVE_API_KEY)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "brave_search_tool", "target": "base_tool", "label": "inherits from"},
        {"source": "brave_search_tool", "target": "web_search_params", "label": "uses"},
        {"source": "brave_search_tool", "target": "brave_search_api", "label": "communicates with"},
        {"source": "brave_search_tool", "target": "os_environ", "label": "reads"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    brave_search_tool[BraveSearchTool]
    web_search_params[WebSearchParams]
    base_tool[BaseTool]
    brave_search_api[Brave Search API]
    os_environ[OS Environment (BRAVE_API_KEY)]

    brave_search_tool -- "inherits from" --> base_tool
    brave_search_tool -- "uses" --> web_search_params
    brave_search_tool -- "communicates with" --> brave_search_api
    brave_search_tool -- "reads" --> os_environ
```