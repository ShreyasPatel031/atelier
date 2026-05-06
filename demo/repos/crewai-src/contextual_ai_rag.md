# Contextual AI RAG Tools
This module provides tools for creating and querying Contextual AI RAG agents. It enables users to manage document ingestion into datastores and retrieve information from configured agents.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "user", "label": "User", "type": "external", "link": null},
        {"id": "create_tool", "label": "Create RAG Agent (Tool)", "type": "component", "link": null},
        {"id": "query_tool", "label": "Query RAG Agent (Tool)", "type": "component", "link": null},
        {"id": "contextual_ai_platform", "label": "Contextual AI Platform", "type": "external", "link": null},
        {"id": "input_documents", "label": "Input Documents", "type": "component", "link": null},
        {"id": "ai_datastores", "label": "AI Datastores", "type": "component", "link": null},
        {"id": "rag_agent_instances", "label": "RAG Agent Instances", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "user", "target": "create_tool", "label": "initiates agent creation"},
        {"source": "user", "target": "query_tool", "label": "sends query"},
        {"source": "create_tool", "target": "contextual_ai_platform", "label": "calls API on"},
        {"source": "create_tool", "target": "input_documents", "label": "ingests"},
        {"source": "input_documents", "target": "ai_datastores", "label": "stored in"},
        {"source": "contextual_ai_platform", "target": "ai_datastores", "label": "manages"},
        {"source": "create_tool", "target": "rag_agent_instances", "label": "creates"},
        {"source": "contextual_ai_platform", "target": "rag_agent_instances", "label": "hosts"},
        {"source": "query_tool", "target": "contextual_ai_platform", "label": "queries"},
        {"source": "query_tool", "target": "rag_agent_instances", "label": "targets"},
        {"source": "contextual_ai_platform", "target": "query_tool", "label": "returns response"}
    ],
    "groups": [
        {"id": "rag_pipeline_ops", "label": "RAG Pipeline Operations", "role": "analytical", "nodes": ["create_tool", "query_tool"]},
        {"id": "rag_data_components", "label": "RAG Data Components", "role": "data", "nodes": ["input_documents", "ai_datastores"]}
    ]
}
-->
```mermaid
flowchart TD
    user(("User"))
    subgraph rag_pipeline_ops["RAG Pipeline Operations"]
        create_tool["Create RAG Agent (Tool)"]
        query_tool["Query RAG Agent (Tool)"]
    end

    subgraph rag_data_components["RAG Data Components"]
        input_documents[("Input Documents")]
        ai_datastores[("AI Datastores")]
    end

    rag_agent_instances["RAG Agent Instances"]
    contextual_ai_platform["Contextual AI Platform"]

    user -->|
initiates agent creation
| create_tool
    user -->|
sends query
| query_tool

    create_tool -->|
calls API on
| contextual_ai_platform
    create_tool -->|
ingests
| input_documents
    input_documents -->|
stored in
| ai_datastores
    contextual_ai_platform -.->|
manages
| ai_datastores
    create_tool -->|
creates
| rag_agent_instances
    contextual_ai_platform -.->|
hosts
| rag_agent_instances

    query_tool -->|
queries
| contextual_ai_platform
    query_tool -->|
targets
| rag_agent_instances
    contextual_ai_platform -->|
returns response
| query_tool

    classDef userNode fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class user userNode
    class create_tool,query_tool analytical
    class input_documents,ai_datastores data
    class rag_agent_instances generative
```