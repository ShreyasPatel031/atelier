# OpenAI Partner Integration
This module provides core utilities for integrating with OpenAI services, including chat model output parsing, usage metadata generation, agent moderation middleware, and custom tool creation for enhanced LLM applications.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "libs_partners_openai",
            "label": "OpenAI Partner Integration",
            "type": "module"
        },
        {
            "id": "openai_chat_utilities",
            "label": "OpenAI Chat Model Utilities",
            "type": "module",
            "link": "chat_model_utilities.md"
        },
        {
            "id": "openai_agent_integrations",
            "label": "OpenAI Agent Integrations",
            "type": "module",
            "link": "openai_agent_integrations.md"
        },
        {
            "id": "orchestration_agents",
            "label": "Orchestration & Agents",
            "type": "external",
            "link": "orchestration_and_agents.md"
        },
        {
            "id": "chat_model_utilities",
            "label": "OpenAI Chat Model Utilities",
            "type": "module",
            "link": "chat_model_utilities.md"
        }
    ],
    "edges": [
        {
            "source": "orchestration_agents",
            "target": "openai_agent_integrations",
            "label": "uses middleware & tools"
        },
        {
            "source": "openai_agent_integrations",
            "target": "openai_chat_utilities",
            "label": "processes chat outputs"
        },
        {
            "source": "libs_partners_openai",
            "target": "chat_model_utilities"
        }
    ],
    "groups": [
        {
            "id": "openai_core_func",
            "label": "OpenAI Core Functionality",
            "role": "generative",
            "nodes": [
                "openai_chat_utilities",
                "openai_agent_integrations"
            ]
        },
        {
            "id": "external_systems",
            "label": "External Integrations",
            "role": "surface",
            "nodes": [
                "orchestration_agents"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph openai_core_func["OpenAI Core Functionality"]
        openai_agent_integrations["OpenAI Agent Integrations"]
        openai_chat_utilities["OpenAI Chat Model Utilities"]
    end

    subgraph external_systems["External Integrations"]
        orchestration_agents["Orchestration & Agents"]
    end

    orchestration_agents -->|'''uses middleware & tools'''| openai_agent_integrations
    openai_agent_integrations -->|'''processes chat outputs'''| openai_chat_utilities

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f

    class openai_chat_utilities analytical
    class openai_agent_integrations generative
    class orchestration_agents surface

    click openai_chat_utilities "chat_model_utilities.md"
    click openai_agent_integrations "openai_agent_integrations.md"
    click orchestration_agents "orchestration_and_agents.md"
```