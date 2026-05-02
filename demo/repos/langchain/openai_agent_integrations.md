# openai_agent_integrations
This module provides integrations for OpenAI agents, including a middleware for moderating agent traffic and a decorator for defining custom tools.

<!-- DIAGRAM_JSON
{
  "nodes": [
    {"id": "moderation_middleware", "label": "OpenAIModerationMiddleware"},
    {"id": "custom_tool_decorator", "label": "Custom Tool Decorator"},
    {"id": "agent_framework", "label": "Agent Framework"},
    {"id": "openai_api", "label": "OpenAI API"}
  ],
  "edges": [
    {"source": "agent_framework", "target": "moderation_middleware", "label": "uses"},
    {"source": "agent_framework", "target": "custom_tool_decorator", "label": "uses to define tools"},
    {"source": "moderation_middleware", "target": "openai_api", "label": "calls"}
  ],
  "groups": [
    {"id": "openai_agent_integrations_group", "label": "openai_agent_integrations", "nodes": ["moderation_middleware", "custom_tool_decorator"]}
  ]
}
-->
```mermaid
flowchart TD
    subgraph openai_agent_integrations
        moderation_middleware[OpenAIModerationMiddleware]
        custom_tool_decorator[Custom Tool Decorator]
    end

    agent_framework[Agent Framework]
    openai_api[OpenAI API]

    agent_framework -- uses --> moderation_middleware
    agent_framework -- "uses to define tools" --> custom_tool_decorator
    moderation_middleware -- calls --> openai_api
```