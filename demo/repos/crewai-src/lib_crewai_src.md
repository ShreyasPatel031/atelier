# CrewAI Tools Module
This module provides core functionalities for defining, creating, adapting, and executing tools within the CrewAI framework. It includes base classes for agent-specific tools, utilities for converting tools to and from Langchain formats, and decorators for simplifying tool creation.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "tool_core_defs", "label": "Core Tool Definitions", "type": "module", "link": "tool_core.md"},
        {"id": "tool_creation", "label": "Tool Creation Utilities", "type": "module", "link": "tool_builders.md"},
        {"id": "tool_conversion", "label": "Langchain Tool Adapters", "type": "module", "link": "tool_adapters.md"},
        {"id": "langchain", "label": "Langchain Framework", "type": "external"},
        {"id": "agent_exec", "label": "Agent Task Execution", "type": "module", "link": "agent_execution.md"}
    ],
    "edges": [
        {"source": "tool_creation", "target": "tool_core_defs", "label": "defines & builds"},
        {"source": "tool_core_defs", "target": "agent_exec", "label": "delegates tasks"},
        {"source": "tool_conversion", "target": "tool_core_defs", "label": "converts tools"},
        {"source": "tool_conversion", "target": "langchain", "label": "interacts with"}
    ],
    "groups": [
        {"id": "tool_management", "label": "Tool Management", "role": "generative", "nodes": ["tool_creation", "tool_core_defs"]},
        {"id": "interoperability", "label": "Tool Interoperability", "role": "data", "nodes": ["tool_conversion"]}
    ]
}
-->