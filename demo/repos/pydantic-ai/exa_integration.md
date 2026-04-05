# exa_integration Module Documentation

The `exa_integration` module provides a comprehensive toolset for interacting with the Exa AI search API within the Pydantic AI framework. It enables agents to perform various search operations efficiently by leveraging a shared Exa API client.

## Purpose and Core Functionality

The primary purpose of the `exa_integration` module is to offer a streamlined and efficient way to integrate Exa's powerful search capabilities into AI agents. It does this by encapsulating multiple Exa tools within a single [ExaToolset](#exatoolset-class) that shares an underlying `AsyncExa` client. This design optimizes API key management and reduces overhead when using multiple Exa-related functionalities.

Key functionalities provided by this module include:
-   **Configurable Search**: Performing searches with a specified number of results and character limits.
-   **Find Similar**: Identifying content similar to a given piece of text or URL.
-   **Get Contents**: Retrieving the full content of a specified URL.
-   **Answering Questions**: Utilizing Exa's capabilities to answer questions based on search results.

## Architecture and Component Relationships

The `exa_integration` module is centered around the `ExaToolset` class. This toolset acts as a container for various Exa-specific tools, all sharing the same `AsyncExa` client instance for efficient API interaction.

The `ExaToolset` inherits from the `FunctionToolset` base class (defined in [toolset_architecture.md](toolset_architecture.md)), providing a standardized interface for integrating with the Pydantic AI agent system.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "exa_toolset", "label": "ExaToolset", "type": "component", "link": null},
        {"id": "exa_search_tool_func", "label": "exa_search_tool", "type": "component", "link": null},
        {"id": "exa_find_similar_tool_func", "label": "exa_find_similar_tool", "type": "component", "link": null},
        {"id": "exa_get_contents_tool_func", "label": "exa_get_contents_tool", "type": "component", "link": null},
        {"id": "exa_answer_tool_func", "label": "exa_answer_tool", "type": "component", "link": null},
        {"id": "async_exa_client", "label": "AsyncExa Client", "type": "external", "link": null},
        {"id": "function_toolset", "label": "FunctionToolset", "type": "external", "link": "toolset_architecture.md"},
        {"id": "pydantic_ai_agent_core", "label": "Agent (from pydantic_ai_agent_core)", "type": "external", "link": "pydantic_ai_agent_core.md"}
    ],
    "edges": [
        {"source": "exa_toolset", "target": "async_exa_client", "label": "initializes & uses"},
        {"source": "exa_toolset", "target": "function_toolset", "label": "inherits from"},
        {"source": "exa_toolset", "target": "exa_search_tool_func", "label": "creates & includes"},
        {"source": "exa_toolset", "target": "exa_find_similar_tool_func", "label": "creates & includes"},
        {"source": "exa_toolset", "target": "exa_get_contents_tool_func", "label": "creates & includes"},
        {"source": "exa_toolset", "target": "exa_answer_tool_func", "label": "creates & includes"},
        {"source": "pydantic_ai_agent_core", "target": "exa_toolset", "label": "uses"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    exa_toolset[ExaToolset]
    exa_search_tool_func[exa_search_tool]
    exa_find_similar_tool_func[exa_find_similar_tool]
    exa_get_contents_tool_func[exa_get_contents_tool]
    exa_answer_tool_func[exa_answer_tool]
    async_exa_client(AsyncExa Client)
    function_toolset[FunctionToolset]:::external
    pydantic_ai_agent_core[Agent (from pydantic_ai_agent_core)]:::external

    exa_toolset -- "initializes & uses" --> async_exa_client
    exa_toolset -- "inherits from" --> function_toolset
    exa_toolset -- "creates & includes" --> exa_search_tool_func
    exa_toolset -- "creates & includes" --> exa_find_similar_tool_func
    exa_toolset -- "creates & includes" --> exa_get_contents_tool_func
    exa_toolset -- "creates & includes" --> exa_answer_tool_func
    pydantic_ai_agent_core -- "uses" --> exa_toolset

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

### ExaToolset Class

The `ExaToolset` class is the main entry point for using Exa AI tools. It initializes an `AsyncExa` client with the provided API key and then dynamically creates and adds specific Exa tools (e.g., `exa_search_tool`, `exa_find_similar_tool`) based on the configuration parameters during its instantiation. This allows for flexible inclusion of Exa functionalities as needed by an agent.

#### `__init__(self, api_key: str, *, num_results: int = 5, max_characters: int | None = None, include_search: bool = True, include_find_similar: bool = True, include_get_contents: bool = True, include_answer: bool = True, id: str | None = None)`

**Parameters**:
-   `api_key` (str): The Exa API key, obtainable from [https://dashboard.exa.ai](https://dashboard.exa.ai).
-   `num_results` (int, optional): The maximum number of results to return for search and find_similar queries. Defaults to 5.
-   `max_characters` (int | None, optional): The maximum characters of text content per result. This helps limit token usage. Defaults to `None` (no limit).
-   `include_search` (bool, optional): If `True`, the search tool will be included in the toolset. Defaults to `True`.
-   `include_find_similar` (bool, optional): If `True`, the find_similar tool will be included. Defaults to `True`.
-   `include_get_contents` (bool, optional): If `True`, the get_contents tool will be included. Defaults to `True`.
-   `include_answer` (bool, optional): If `True`, the answer tool will be included. Defaults to `True`.
-   `id` (str | None, optional): An optional ID for the toolset, particularly useful in durable execution environments.

**Functionality**:
-   Instantiates an `AsyncExa` client using the provided `api_key`.
-   Conditionally creates and appends `Tool` instances for `exa_search_tool`, `exa_find_similar_tool`, `exa_get_contents_tool`, and `exa_answer_tool` to an internal list, based on the respective `include_` boolean flags.
-   Calls the `super().__init__` method of `FunctionToolset` with the constructed list of tools and the optional `id`.

## How the Module Fits into the Overall System

The `exa_integration` module is a vital part of the `pydantic_ai_tools` ecosystem, specifically falling under the [third_party_toolsets](third_party_toolsets.md) category. It provides concrete implementations for integrating external services like Exa AI.

-   **Integration with Agents**: Instances of `ExaToolset` are passed to an [Agent](pydantic_ai_agent_core.md) from the `pydantic_ai_agent_core` module, allowing the agent to leverage Exa's search capabilities during its operation.
-   **Extensibility**: By adhering to the `FunctionToolset` interface, `exa_integration` demonstrates how new external tools can be seamlessly added and managed within the Pydantic AI framework.
-   **Tool Management**: It relies on the broader [tool_output_management](tool_output_management.md) components for handling tool invocation, output processing, and validation within the agent's workflow.
