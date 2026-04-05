# contextualai_query_agent

## Introduction

The `contextualai_query_agent` module provides the `ContextualAIQueryTool`, a specialized tool within the CrewAI framework designed to interact with and query Contextual AI's RAG (Retrieval-Augmented Generation) agents. This tool enables CrewAI agents to leverage Contextual AI's capabilities for querying documents and retrieving relevant information, forming a crucial bridge for integrating advanced RAG functionalities into automated workflows.

## Architecture and Component Relationships

This module primarily exposes the `ContextualAIQueryTool` which encapsulates the logic for connecting to the Contextual AI platform, managing API interactions, and handling asynchronous operations like waiting for document processing.

### Core Components

*   **`ContextualAIQueryTool`**: This is the main class in the module, inheriting from `BaseTool` (from [crewai_tool_base.md](crewai_tool_base.md)). It initializes the `ContextualAI` client using the provided API key and defines the methods for querying agents and handling document readiness checks.
    *   `_check_documents_ready`: A synchronous helper method to poll the Contextual AI API to determine if all documents in a specified datastore are finished processing.
    *   `_wait_for_documents_async`: An asynchronous method that repeatedly calls `_check_documents_ready` until documents are ready or a maximum number of attempts is reached. It uses `asyncio.to_thread` to run the synchronous check in a separate thread, preventing blocking.
    *   `_run`: The primary method for executing the tool's logic. It takes a query, an agent ID, and an optional datastore ID. It performs document readiness checks if a datastore ID is provided, and then sends the query to the Contextual AI agent.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "contextualai_query_tool", "label": "ContextualAIQueryTool", "type": "component", "link": null},
        {"id": "check_documents_ready", "label": "_check_documents_ready()", "type": "component", "link": null},
        {"id": "wait_for_documents_async", "label": "_wait_for_documents_async()", "type": "component", "link": null},
        {"id": "run_method", "label": "_run()", "type": "component", "link": null},
        {"id": "base_tool", "label": "BaseTool", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "contextual_ai_client", "label": "ContextualAI Client (contextual library)", "type": "external", "link": null},
        {"id": "requests_library", "label": "Requests Library", "type": "external", "link": null},
        {"id": "asyncio_library", "label": "Asyncio Library", "type": "external", "link": null},
        {"id": "contextualai_create_agent", "label": "contextualai_create_agent", "type": "external", "link": "contextualai_create_agent.md"}
    ],
    "edges": [
        {"source": "contextualai_query_tool", "target": "base_tool"},
        {"source": "contextualai_query_tool", "target": "contextual_ai_client"},
        {"source": "run_method", "target": "check_documents_ready"},
        {"source": "run_method", "target": "wait_for_documents_async"},
        {"source": "run_method", "target": "contextual_ai_client"},
        {"source": "check_documents_ready", "target": "requests_library"},
        {"source": "wait_for_documents_async", "target": "asyncio_library"},
        {"source": "wait_for_documents_async", "target": "check_documents_ready"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    contextualai_query_tool[ContextualAIQueryTool]
    check_documents_ready[_check_documents_ready()]
    wait_for_documents_async[_wait_for_documents_async()]
    run_method[_run()]
    base_tool[BaseTool]
    contextual_ai_client[ContextualAI Client (contextual library)]
    requests_library[Requests Library]
    asyncio_library[Asyncio Library]
    contextualai_create_agent[contextualai_create_agent]

    contextualai_query_tool --> base_tool
    contextualai_query_tool --> contextual_ai_client
    run_method --> check_documents_ready
    run_method --> wait_for_documents_async
    run_method --> contextual_ai_client
    check_documents_ready --> requests_library
    wait_for_documents_async --> asyncio_library
    wait_for_documents_async --> check_documents_ready
```

## How the Module Fits into the Overall System

The `contextualai_query_agent` module is a vital part of the `crewai_tools_platform_automation` suite, specifically nested under the `contextualai_tools` sub-module. It extends the capabilities of CrewAI agents by allowing them to directly interact with Contextual AI's RAG agents. This integration is crucial for scenarios where CrewAI agents need to query custom knowledge bases or documents managed within the Contextual AI platform.

*   **Parent Module**: [contextualai_tools.md](contextualai_tools.md) - This module is part of a larger set of tools for interacting with Contextual AI.
*   **Related Module**: [contextualai_create_agent.md](contextualai_create_agent.md) - While `contextualai_query_agent` focuses on querying, the `contextualai_create_agent` module provides tools for creating Contextual AI agents, offering a comprehensive interaction experience with the Contextual AI platform.
*   **Tool Usage**: CrewAI agents can incorporate `ContextualAIQueryTool` into their `tools` list, enabling them to execute queries as part of their autonomous task execution. This allows for dynamic retrieval of information from Contextual AI-powered knowledge bases, enhancing the agents' ability to access and process external information relevant to their tasks.
