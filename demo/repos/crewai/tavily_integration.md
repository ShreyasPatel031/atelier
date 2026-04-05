# tavily_integration Module Documentation

## Introduction
The `tavily_integration` module provides tools for extracting content from web pages using the Tavily API. It offers both synchronous and asynchronous extraction capabilities, returning structured data from specified URLs. This module is a key component within the `crewai_tools_web_scraping` ecosystem, enabling agents to gather information from the web efficiently.

## Core Functionality
The primary functionality of this module is encapsulated within the `TavilyExtractorTool` class, which allows for:
- **Web Content Extraction**: Extracting structured data from single or multiple web pages.
- **API Key Management**: Securely handling the Tavily API key through environment variables.
- **Configurable Extraction**: Options to include images, specify extraction depth (basic or advanced), and set request timeouts.
- **Asynchronous Operations**: Support for asynchronous extraction to improve performance in concurrent environments.

## Architecture and Component Relationships

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "tavily_extractor_tool", "label": "TavilyExtractorTool", "type": "component", "link": null},
        {"id": "tavily_client", "label": "TavilyClient (tavily-python)", "type": "external", "link": null},
        {"id": "async_tavily_client", "label": "AsyncTavilyClient (tavily-python)", "type": "external", "link": null},
        {"id": "base_tool", "label": "BaseTool", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "os_module", "label": "os (Python Built-in)", "type": "external", "link": null},
        {"id": "json_module", "label": "json (Python Built-in)", "type": "external", "link": null},
        {"id": "pydantic_basemodel", "label": "BaseModel (Pydantic)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "tavily_extractor_tool", "target": "tavily_client"},
        {"source": "tavily_extractor_tool", "target": "async_tavily_client"},
        {"source": "tavily_extractor_tool", "target": "base_tool"},
        {"source": "tavily_extractor_tool", "target": "os_module"},
        {"source": "tavily_extractor_tool", "target": "json_module"},
        {"source": "tavily_extractor_tool", "target": "pydantic_basemodel"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    tavily_extractor_tool[TavilyExtractorTool]
    tavily_client(TavilyClient (tavily-python))
    async_tavily_client(AsyncTavilyClient (tavily-python))
    base_tool[BaseTool]:::external
    os_module(os (Python Built-in))
    json_module(json (Python Built-in))
    pydantic_basemodel(BaseModel (Pydantic))

    tavily_extractor_tool --> tavily_client
    tavily_extractor_tool --> async_tavily_client
    tavily_extractor_tool --> base_tool
    tavily_extractor_tool --> os_module
    tavily_extractor_tool --> json_module
    tavily_extractor_tool --> pydantic_basemodel

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

### TavilyExtractorTool
- **Purpose**: This is the core class of the module, designed to facilitate web content extraction using the Tavily API. It inherits from `BaseTool`, making it compatible with the CrewAI tools framework.
- **Dependencies**:
    - **TavilyClient & AsyncTavilyClient**: Used for making synchronous and asynchronous calls to the Tavily API. These are external libraries (`tavily-python`).
    - **BaseTool**: Inherited from `crewai_tool_base`, providing the fundamental structure and integration capabilities for CrewAI tools.
    - **os**: Utilized for accessing environment variables, specifically `TAVILY_API_KEY`.
    - **json**: Used for serializing the extracted data into a JSON string.
    - **Pydantic BaseModel**: Used for defining the `args_schema` for tool arguments and `ConfigDict` for model configuration.

## Integration with Overall System
The `tavily_integration` module, through its `TavilyExtractorTool`, is an integral part of the `crewai_tools_web_scraping` module. It provides agents with the ability to programmatically extract information from web pages, which is crucial for tasks requiring up-to-date or specific content from the internet. This allows agents to perform comprehensive research, data gathering, and content analysis by interacting with the web. It is referenced and utilized by other modules within the CrewAI ecosystem that require web content extraction functionalities.
