# Anthropic Partner Integration
This module provides integration with Anthropic models, offering core LLM functionalities, experimental tooling utilities for XML-to-tool calls and system message generation, and various middleware for agent development, including state management, file search, and prompt caching.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "libs_partners_anthropic",
            "label": "Anthropic Partner Integration",
            "type": "module"
        },
        {
            "id": "llm_core",
            "label": "Anthropic LLM Core",
            "type": "module",
            "link": "llm_core.md"
        },
        {
            "id": "tooling_and_prompts",
            "label": "Anthropic Tooling and Prompts",
            "type": "module",
            "link": "tooling_and_prompts.md"
        },
        {
            "id": "agent_middleware",
            "label": "Anthropic Agent Middleware",
            "type": "module",
            "link": "agent_middleware.md"
        }
    ],
    "edges": [
        {
            "source": "tooling_and_prompts",
            "target": "agent_middleware",
            "label": "provides tool definitions"
        },
        {
            "source": "agent_middleware",
            "target": "llm_core",
            "label": "modifies LLM requests"
        },
        {
            "source": "tooling_and_prompts",
            "target": "llm_core",
            "label": "configures LLM"
        }
    ],
    "groups": [
        {
            "id": "llm_integration",
            "label": "LLM Integration",
            "role": "generative",
            "nodes": [
                "llm_core"
            ]
        },
        {
            "id": "agent_components",
            "label": "Agent Components",
            "role": "analytical",
            "nodes": [
                "tooling_and_prompts",
                "agent_middleware"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph llm_integration["LLM Integration"]
        llm_core["Anthropic LLM Core"]
    end
    subgraph agent_components["Agent Components"]
        tooling_and_prompts["Anthropic Tooling and Prompts"]
        agent_middleware["Anthropic Agent Middleware"]
    end

    tooling_and_prompts -->|"provides tool definitions"| agent_middleware
    agent_middleware -->|"modifies LLM requests"| llm_core
    tooling_and_prompts -->|"configures LLM"| llm_core

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class llm_core generative
    class tooling_and_prompts,agent_middleware analytical

    click llm_core "llm_core.md"
    click tooling_and_prompts "tooling_and_prompts.md"
    click agent_middleware "agent_middleware.md"
```