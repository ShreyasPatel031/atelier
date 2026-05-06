## Data Query & Integrations
This module provides a comprehensive suite of tools for agents to interact with diverse data sources, including databases, vector stores, and external APIs, facilitating information retrieval and system integrations.

<!-- DIAGRAM_JSON
{
    "direction": "LR",
    "nodes": [
        {"id": "api_external_integrations", "label": "API & External Integrations", "type": "module", "link": "api_and_integration_tools.md"},
        {"id": "database_vector_search", "label": "Database & Vector Search", "type": "module", "link": "database_and_vector_store_tools.md"},
        {"id": "rag_ai_agents", "label": "RAG & AI Agents", "type": "module", "link": "rag_and_ai_agent_tools.md"},
        {"id": "external_api", "label": "External APIs", "type": "external"},
        {"id": "databases_vectorstores", "label": "Databases & Vector Stores", "type": "external"},
        {"id": "ai_platforms", "label": "AI Platforms", "type": "external"}
    ],
    "edges": [
        {"source": "api_external_integrations", "target": "external_api", "label": "queries/actions"},
        {"source": "database_vector_search", "target": "databases_vectorstores", "label": "queries/data"},
        {"source": "rag_ai_agents", "target": "ai_platforms", "label": "agent/data interaction"},
        {"source": "api_external_integrations", "target": "rag_ai_agents", "label": "integration support"}
    ],
    "groups": [
        {"id": "integrations_group", "label": "External Systems", "role": "surface", "nodes": ["external_api", "databases_vectorstores", "ai_platforms"]},
        {"id": "tool_categories", "label": "Tool Categories", "role": "generative", "nodes": ["api_external_integrations", "database_vector_search", "rag_ai_agents"]}
    ]
}
-->