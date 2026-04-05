# Tavily Integration Module

## Introduction
The `tavily_integration` module provides a robust mechanism for integrating Tavily search capabilities into the system, allowing AI agents to perform web searches to gather information. This module primarily exposes a factory function to create a configurable Tavily search tool.

## Purpose and Core Functionality
The core functionality of this module revolves around the `tavily_search_tool` function, which acts as a factory for creating a search tool. This tool enables agents to perform targeted web searches. Developers can pre-configure various search parameters, which are then hidden from the LLM, or leave them open for the LLM to decide on a per-call basis.

### `tavily_search_tool`
This function initializes and returns a `Tool` instance configured for Tavily web searches. It allows for detailed control over search parameters:

- **`api_key`**: Your Tavily API key. Essential for authentication if an `AsyncTavilyClient` is not provided.
- **`client`**: An optional pre-existing `AsyncTavilyClient` instance, useful for resource sharing.
- **`max_results`**: Specifies the maximum number of search results to retrieve. This is always controlled by the developer and not exposed to the LLM.
- **`search_depth`**: Defines the depth of the search, e.g., 'basic', 'advanced', 'fast', 'ultra-fast'.
- **`topic`**: Filters search results by category, such as 'general', 'news', or 'finance'.
- **`time_range`**: Restricts results to a specific time frame, e.g., 'day', 'week', 'month', 'year'.
- **`include_domains`**: A list of domains to prioritize in the search results.
- **`exclude_domains`**: A list of domains to explicitly omit from the search results.

Parameters provided during the tool's creation are fixed for all subsequent searches made with that tool instance and are not presented to the LLM. Conversely, parameters left `_UNSET` become available for the LLM to dynamically specify in its tool calls.

## Architecture and Component Relationships

The `tavily_integration` module is a leaf module within the [pydantic_ai_tools](pydantic_ai_tools.md) ecosystem, specifically within the `third_party_toolsets` sub-module. It primarily interacts with the external Tavily API through the `AsyncTavilyClient` and produces a generic `Tool` object, which is a fundamental abstraction for agent interaction.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "tavily_search_tool", "label": "tavily_search_tool", "type": "component", "link": null},
        {"id": "tavily_api_client", "label": "AsyncTavilyClient (External)", "type": "external", "link": null},
        {"id": "pydantic_ai_tools", "label": "pydantic_ai_tools", "type": "external", "link": "pydantic_ai_tools.md"}
    ],
    "edges": [
        {"source": "tavily_search_tool", "target": "tavily_api_client"},
        {"source": "tavily_search_tool", "target": "pydantic_ai_tools"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    tavily_search_tool[tavily_search_tool]
    tavily_api_client[AsyncTavilyClient (External)]
    pydantic_ai_tools[pydantic_ai_tools]
    tavily_search_tool --> tavily_api_client
    tavily_search_tool --> pydantic_ai_tools
```

### How the Module Fits into the Overall System
This module serves as a bridge, allowing AI agents built with the `pydantic_ai_agent_core` to leverage real-time web search capabilities provided by Tavily. It abstracts the complexities of the Tavily API into a simple, configurable `Tool` that can be seamlessly integrated into an agent's toolset, enhancing the agent's ability to retrieve up-to-date information. Its placement under [pydantic_ai_tools](pydantic_ai_tools.md) signifies its role as a specific implementation of a broader tool interface.
