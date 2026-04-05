# partners_perplexity_tools

This module provides tools for interacting with the Perplexity Search API. It offers a convenient way to integrate Perplexity's search capabilities into larger systems, allowing for programmatic queries and structured retrieval of search results.

## Module: Perplexity Search Tools

### Purpose and Core Functionality

The `partners_perplexity_tools` module currently contains the `PerplexitySearchResults` tool. This tool acts as a wrapper around the Perplexity Search API, enabling applications to perform search queries and receive results in a structured JSON format. It abstracts away the complexities of direct API calls, providing a simplified interface for search operations.

### Architecture and Component Relationships

#### PerplexitySearchResults

- **Description**: The `PerplexitySearchResults` class is a specialized tool designed to interact with the Perplexity Search API. It inherits from `BaseTool` (from [core_tools.md](core_tools.md)), making it compatible with frameworks that utilize `BaseTool` for defining callable functionalities.
- **Functionality**: It allows users to submit a search query along with optional parameters such as `max_results`, `country`, `search_domain_filter`, `search_recency_filter`, `search_after_date`, and `search_before_date`. The tool processes these parameters, makes an API call to Perplexity, and returns a list of dictionaries, each representing a search result with fields like `title`, `url`, `snippet`, `date`, and `last_updated`.
- **Error Handling**: The tool includes basic error handling, catching exceptions during the API call and returning a descriptive error message.

### How the Module Fits into the Overall System

This module serves as a bridge between the application and the Perplexity Search API. It can be utilized in various scenarios where search capabilities are required, such as:
- **Information Retrieval**: To fetch relevant information from the web based on user queries.
- **Agentic Workflows**: As a tool for AI agents to gather external knowledge and augment their decision-making process.
- **Data Augmentation**: To enrich existing data with real-time search results.

It depends on the core `BaseTool` for its foundational structure and `pydantic` utilities for configuration management (e.g., `SecretStr` for API keys).

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "PerplexitySearchResults", "label": "PerplexitySearchResults", "type": "component", "link": null},
        {"id": "initialize_client", "label": "initialize_client", "type": "component", "link": null},
        {"id": "core_tools", "label": "core_tools.BaseTool", "type": "external", "link": "core_tools.md"},
        {"id": "core_utils", "label": "core_utils (Pydantic)", "type": "external", "link": "core_utils.md"}
    ],
    "edges": [
        {"source": "PerplexitySearchResults", "target": "core_tools"},
        {"source": "PerplexitySearchResults", "target": "core_utils"},
        {"source": "PerplexitySearchResults", "target": "initialize_client"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    PerplexitySearchResults[PerplexitySearchResults]
    initialize_client[initialize_client]
    core_tools[core_tools.BaseTool]
    core_utils[core_utils (Pydantic)]
    PerplexitySearchResults --> core_tools
    PerplexitySearchResults --> core_utils
    PerplexitySearchResults --> initialize_client
```