## Tool Adapters for Langchain Integration
This module facilitates seamless interoperability by providing functions to convert tool definitions between CrewAI\'s `BaseTool` representation and Langchain\'s `CrewStructuredTool` format, enabling flexible integration with Langchain-compatible agent frameworks.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "crewai_base_tool", "label": "CrewAI Base Tool", "type": "external", "link": "tool_core.md"},
        {"id": "langchain_structured_tool", "label": "Langchain Structured Tool", "type": "external", "link": null},
        {"id": "to_langchain", "label": "Convert to Langchain Format", "type": "component", "link": null},
        {"id": "from_langchain", "label": "Convert from Langchain Format", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "crewai_base_tool", "target": "to_langchain", "label": "converts"},
        {"source": "to_langchain", "target": "langchain_structured_tool", "label": "produces"},
        {"source": "langchain_structured_tool", "target": "from_langchain", "label": "converts"},
        {"source": "from_langchain", "target": "crewai_base_tool", "label": "produces"}
    ],
    "groups": [
        {"id": "tool_conversion_logic", "label": "Tool Conversion Logic", "role": "analytical", "nodes": ["to_langchain", "from_langchain"]}
    ]
}
-->