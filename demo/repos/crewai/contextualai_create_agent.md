# contextualai_create_agent Module Documentation

## Introduction
The `contextualai_create_agent` module provides a specialized tool designed for the programmatic creation of RAG (Retrieval Augmented Generation) agents within the Contextual AI platform. This module allows CrewAI agents to dynamically provision and manage their knowledge bases and associated RAG agents.

## Core Functionality
The primary component of this module, `ContextualAICreateAgentTool`, enables the following key functionalities:
1.  **Client Initialization**: Initializes the Contextual AI client using a provided API key, establishing a connection to the Contextual AI services.
2.  **Datastore Creation**: Programmatically creates new datastores within the Contextual AI platform to house document collections.
3.  **Document Ingestion**: Uploads documents from specified file paths into the created datastores, effectively building the knowledge base for RAG.
4.  **RAG Agent Creation**: Creates new RAG agents, linking them to the appropriate datastores containing the ingested documents. This allows the agents to leverage specific information for enhanced retrieval and generation tasks.

## Architecture and Component Relationships

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "contextual_ai_create_agent_tool", "label": "ContextualAICreateAgentTool", "type": "component", "link": null},
        {"id": "contextual_client_sdk", "label": "Contextual AI Client (SDK)", "type": "external", "link": null},
        {"id": "base_tool", "label": "BaseTool", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "contextual_ai_query_tool", "label": "ContextualAIQueryTool", "type": "external", "link": "contextualai_query_agent.md"}
    ],
    "edges": [
        {"source": "contextual_ai_create_agent_tool", "target": "contextual_client_sdk"},
        {"source": "contextual_ai_create_agent_tool", "target": "base_tool"},
        {"source": "contextual_ai_create_agent_tool", "target": "contextual_ai_query_tool", "label": "Complements"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    contextual_ai_create_agent_tool[ContextualAICreateAgentTool]
    contextual_client_sdk(Contextual AI Client (SDK))
    base_tool[BaseTool]
    contextual_ai_query_tool[ContextualAIQueryTool]

    contextual_ai_create_agent_tool --> contextual_client_sdk
    contextual_ai_create_agent_tool --> base_tool
    contextual_ai_create_agent_tool -- Complements --> contextual_ai_query_tool
```

The `contextualai_create_agent` module contains the `ContextualAICreateAgentTool`, which is the central point of its functionality.

*   **`ContextualAICreateAgentTool`**: This is the concrete implementation of the tool, inheriting from `BaseTool` provided by the [crewai_tool_base.md](crewai_tool_base.md) module. It defines the tool's name, description, and the schema for its input arguments (`ContextualAICreateAgentSchema`).
*   **`Contextual AI Client (SDK)`**: This is an external dependency (the `contextual-client` Python package). The `ContextualAICreateAgentTool` instantiates and utilizes this client to interact with the Contextual AI platform's API for managing datastores and agents.
*   **`BaseTool`**: The foundation for `ContextualAICreateAgentTool`, providing the basic structure and interface for all CrewAI tools.
*   **`ContextualAIQueryTool`**: While not a direct dependency, this module conceptually complements the `contextualai_create_agent` module. The [contextualai_query_agent.md](contextualai_query_agent.md) module focuses on querying existing agents, whereas this module focuses on their creation.

## How the Module Fits into the Overall System
The `contextualai_create_agent` module is a crucial part of the `crewai_tools_platform_automation` ecosystem, specifically nested under `contextualai_tools`. It empowers CrewAI agents with the ability to programmatically manage their external knowledge resources on the Contextual AI platform. By allowing agents to create and populate RAG agents with specific documents, it enhances their capacity for informed decision-making and generation, making the CrewAI framework more dynamic and adaptable. This integration is vital for scenarios where agents need to build and utilize custom knowledge bases on the fly.
