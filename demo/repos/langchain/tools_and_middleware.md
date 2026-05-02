# Tools and Middleware Overview
This module provides core tool definitions and a comprehensive suite of middleware for agent execution, including content processing, PII detection, summarization, and robust error handling.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "core_tool_definitions", "label": "Core Tool Definitions", "type": "module", "link": "core_tool_definitions.md"},
        {"id": "agent_execution_middleware", "label": "Agent Execution Middleware", "type": "module", "link": "agent_execution_middleware.md"},
        {"id": "content_processing_middleware", "label": "Content Processing Middleware", "type": "module", "link": "content_processing_middleware.md"}
    ],
    "edges": [
        {"source": "core_tool_definitions", "target": "agent_execution_middleware", "label": "defines base tools"},
        {"source": "core_tool_definitions", "target": "content_processing_middleware", "label": "defines base tools"},
        {"source": "content_processing_middleware", "target": "agent_execution_middleware", "label": "enhances agent flow"}
    ],
    "groups": [
        {"id": "tool_foundations", "label": "Tool Foundations", "role": "analytical", "nodes": ["core_tool_definitions"]},
        {"id": "agent_middleware_layer", "label": "Agent Middleware Layer", "role": "generative", "nodes": ["agent_execution_middleware", "content_processing_middleware"]}
    ]
}
-->

```mermaid
flowchart TD
    subgraph tool_foundations["Tool Foundations"]
        core_tool_definitions["Core Tool Definitions"]
    end
    subgraph agent_middleware_layer["Agent Middleware Layer"]
        agent_execution_middleware["Agent Execution Middleware"]
        content_processing_middleware["Content Processing Middleware"]
    end

    core_tool_definitions -->|'defines base tools'| agent_execution_middleware
    core_tool_definitions -->|'defines base tools'| content_processing_middleware
    content_processing_middleware -->|'enhances agent flow'| agent_execution_middleware

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class core_tool_definitions analytical
    class agent_execution_middleware,content_processing_middleware generative

    click core_tool_definitions "core_tool_definitions.md"
    click agent_execution_middleware "agent_execution_middleware.md"
    click content_processing_middleware "content_processing_middleware.md"
```