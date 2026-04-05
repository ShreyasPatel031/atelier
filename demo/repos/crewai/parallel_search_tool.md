# `parallel_search_tool`

## Introduction

The `parallel_search_tool` module provides the `ParallelSearchTool`, an advanced web search tool designed to integrate with Parallel's Search API. This tool allows agents to perform comprehensive web searches, retrieving ranked results with compressed excerpts, specifically optimized for consumption by Large Language Models (LLMs).

It handles API key authentication, constructs robust API requests, and processes responses into a consumable format, making it a critical component for tasks requiring up-to-date and relevant external information.

## Architecture and Component Relationships

The `parallel_search_tool` module is a leaf module within the `crewai_tools_platform_automation` family, meaning it does not contain any sub-modules. Its primary component, `ParallelSearchTool`, encapsulates all the logic for interacting with the Parallel Search API.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "parallel_search_tool", "label": "ParallelSearchTool", "type": "component", "link": null},
        {"id": "base_tool", "label": "BaseTool", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "requests_library", "label": "requests (Python Library)", "type": "external", "link": null},
        {"id": "pydantic_basemodel", "label": "pydantic.BaseModel", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "parallel_search_tool", "target": "base_tool"},
        {"source": "parallel_search_tool", "target": "requests_library"},
        {"source": "parallel_search_tool", "target": "pydantic_basemodel"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    parallel_search_tool[ParallelSearchTool]
    base_tool[BaseTool]
    requests_library[requests (Python Library)]
    pydantic_basemodel[pydantic.BaseModel]

    parallel_search_tool --> base_tool
    parallel_search_tool --> requests_library
    parallel_search_tool --> pydantic_basemodel
```

### `ParallelSearchTool`

`ParallelSearchTool` is the main class in this module, inheriting from `BaseTool` (from [crewai_tool_base.md](crewai_tool_base.md)). It facilitates web searches through the Parallel Search API.

**Core Functionality:**

-   **Initialization**: Sets up the tool's `name`, `description`, `args_schema` for input validation (expected to be `ParallelSearchInput`, a `pydantic.BaseModel`), required `env_vars` (specifically `PARALLEL_API_KEY`), and `package_dependencies` (`requests`).
-   **`_run(self, objective: str | None = None, search_queries: list[str] | None = None, processor: str = "base", max_results: int = 10, max_chars_per_result: int = 6000, source_policy: dict[str, Any] | None = None, **_: Any) -> str`**:
    -   This method executes the actual web search. It requires either an `objective` (a natural language query) or a list of `search_queries`.
    -   It dynamically constructs the request payload, including the specified `processor` type ("base" or "pro"), `max_results`, `max_chars_per_result`, and an optional `source_policy`.
    -   Authenticates requests using the `PARALLEL_API_KEY` environment variable.
    -   Sends a POST request to the Parallel Search API endpoint (`https://api.parallel.ai/v1beta/search`).
    -   Includes a timeout mechanism for API calls (30 seconds for "base" processor, 90 for "pro").
    -   Handles various error conditions, such as missing API keys, invalid input, API errors (HTTP status codes >= 300), and network timeouts.
    -   Returns a formatted JSON string of the search results, including a `search_id` and the search `results`.
-   **`_format_output(self, result: dict[str, Any]) -> str`**:
    -   A utility method responsible for converting the raw JSON response from the Parallel Search API into a compact, human-readable JSON string. This ensures consistency in the output format provided by the tool.

**Dependencies:**

-   `BaseTool`: Inherits core tool functionalities and structure.
-   `requests`: Used for making HTTP requests to the Parallel Search API.
-   `pydantic.BaseModel`: Used for defining and validating the input arguments for the tool (e.g., `ParallelSearchInput`).

## Integration into the Overall System

The `parallel_search_tool` seamlessly integrates into the broader CrewAI ecosystem as a specialized tool for web-based information retrieval. It is part of the `crewai_tools_platform_automation` module, which encompasses various tools designed to automate tasks involving external platforms and services.

Agents can leverage `ParallelSearchTool` when their tasks require searching the internet for information, gathering data from web pages, or performing research. Its ability to return compressed excerpts makes it particularly valuable for LLMs, as it reduces token usage while providing relevant context.

By encapsulating the complexities of interacting with the Parallel Search API, this module provides a simple, robust, and efficient way for agents to access real-time web information, enhancing their decision-making and problem-solving capabilities within a CrewAI workflow.
