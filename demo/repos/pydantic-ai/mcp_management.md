# MCP Management Module

The `mcp_management` module provides the `MCP` capability, which is central to integrating and managing Micro Capability Protocol (MCP) servers within the system. This module enables the agent to interact with both builtin and local MCP servers, offering a flexible mechanism for extending agent functionalities through external services or local process capabilities.

## Module Overview

The `MCP` capability acts as an interface to various MCP server implementations. It allows for seamless communication, tool discovery, and execution, whether the MCP server is natively supported by the model (builtin) or hosted as a local service. This design ensures that agents can leverage a wide array of tools and services, enhancing their adaptability and problem-solving abilities.

Key functionalities include:
*   **Flexible Server Connection**: Support for both model-builtin and local HTTP/SSE MCP servers.
*   **Dynamic Tool Filtering**: Ability to specify and filter allowed tools from the MCP server.
*   **Authentication and Headers**: Configuration for authorization tokens and custom HTTP headers for secure communication.
*   **Automatic ID Resolution**: Generates a unique ID for the MCP server if not explicitly provided, ensuring clear identification.

## Core Components

### MCP (pydantic_ai_slim.pydantic_ai.capabilities.mcp.MCP)

The `MCP` class is the primary component of this module. It inherits from `BuiltinOrLocalTool` and provides the necessary logic to configure and interact with an MCP server.

**Attributes**:

*   `url` (str): The URL of the MCP server, crucial for establishing the connection.
*   `id` (str | None): An optional unique identifier for the MCP server. If not provided, an ID is automatically generated from the URL.
*   `authorization_token` (str | None): An optional authorization header value used for securing requests to the MCP server.
*   `headers` (dict[str, str] | None): Optional dictionary of custom HTTP headers to be included in requests.
*   `allowed_tools` (list[str] | None): An optional list of tool names. If provided, the capability will only expose these specific tools from the MCP server.
*   `description` (str | None): An optional description of the MCP server, primarily used for builtin model integrations.

**Methods**:

*   `__init__(...)`: Initializes the `MCP` capability with the server URL and various configuration options, including parameters to specify whether to use a builtin or local MCP server.
*   `_resolved_id()`: An internal helper property that returns the unique ID for the MCP server, generating one from the URL if `id` is not set.
*   `_default_builtin()`: Creates and returns an `MCPServerTool` instance configured for builtin model support, utilizing the provided URL, authorization token, headers, allowed tools, and description.
*   `_builtin_unique_id()`: Generates a unique identifier string for the builtin MCP server, useful for internal tracking.
*   `_default_local()`: Determines the appropriate local MCP server handler (`MCPServerSSE` or `MCPServerStreamableHTTP`) based on the URL and configures it with the necessary headers and instructions.
*   `get_toolset()`: Overrides the base method to retrieve the toolset from the MCP server. It applies the `allowed_tools` filter if specified, ensuring only permitted tools are exposed.

## How it Connects

The `mcp_management` module, through its `MCP` capability, integrates deeply into the agent's overall architecture.

*   It extends the [capabilities_tool_integration](capabilities_tool_integration.md) module by inheriting from `BuiltinOrLocalTool`, providing a unified interface for tools that can be either natively supported or run locally.
*   It relies on components from the [mcp_core](mcp_core.md) module, specifically `MCPServerTool` for builtin integration, and `MCPServerSSE` and `MCPServerStreamableHTTP` for handling local MCP server connections.
*   It interacts with the [toolset_management](toolset_management.md) module by providing and filtering `AbstractToolset` instances, which are then used by the agent to discover and execute available tools.
*   The `MCP` capability can be dynamically instantiated and configured as part of an agent's capabilities, enabling agents to communicate with and leverage external services that expose tools via the MCP.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "mcp_capability", "label": "MCP Capability", "type": "component", "link": null},
        {"id": "builtin_or_local_tool", "label": "BuiltinOrLocalTool", "type": "external", "link": "capabilities_tool_integration.md"},
        {"id": "mcp_server_tool", "label": "MCPServerTool", "type": "external", "link": "mcp_core.md"},
        {"id": "mcp_server_streamable_http", "label": "MCPServerStreamableHTTP", "type": "external", "link": "mcp_core.md"},
        {"id": "mcp_server_sse", "label": "MCPServerSSE", "type": "external", "link": "mcp_core.md"},
        {"id": "abstract_toolset", "label": "AbstractToolset", "type": "external", "link": "toolset_management.md"},
        {"id": "resolve_id", "label": "Resolve MCP ID", "type": "component", "link": null},
        {"id": "create_builtin_tool", "label": "Create Builtin Tool", "type": "component", "link": null},
        {"id": "create_local_tool", "label": "Create Local Tool", "type": "component", "link": null},
        {"id": "filter_tools", "label": "Filter Tools", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "mcp_capability", "target": "builtin_or_local_tool", "label": "inherits"},
        {"source": "mcp_capability", "target": "resolve_id", "label": "uses"},
        {"source": "mcp_capability", "target": "create_builtin_tool", "label": "uses builtin config"},
        {"source": "mcp_capability", "target": "create_local_tool", "label": "uses local config"},
        {"source": "mcp_capability", "target": "filter_tools", "label": "applies filters"},
        {"source": "create_builtin_tool", "target": "mcp_server_tool", "label": "instantiates"},
        {"source": "create_local_tool", "target": "mcp_server_streamable_http", "label": "instantiates HTTP"},
        {"source": "create_local_tool", "target": "mcp_server_sse", "label": "instantiates SSE"},
        {"source": "filter_tools", "target": "abstract_toolset", "label": "filters and returns"}
    ],
    "groups": [
        {
            "id": "mcp_internal_logic",
            "label": "MCP Internal Logic",
            "role": "core",
            "nodes": ["resolve_id", "create_builtin_tool", "create_local_tool", "filter_tools"]
        }
    ]
}
-->
```mermaid
flowchart TD
    %% Internal MCP Capability
    subgraph mcp_internal_logic["MCP Internal Logic"]
        resolve_id["Resolve MCP ID"]
        create_builtin_tool["Create Builtin Tool"]
        create_local_tool["Create Local Tool"]
        filter_tools["Filter Tools"]
    end

    %% Main MCP Component
    mcp_capability["MCP Capability"]

    %% External Dependencies
    builtin_or_local_tool["BuiltinOrLocalTool"]:::external
    mcp_server_tool["MCPServerTool"]:::external
    mcp_server_streamable_http["MCPServerStreamableHTTP"]:::external
    mcp_server_sse["MCPServerSSE"]:::external
    abstract_toolset["AbstractToolset"]:::external

    %% Connections
    mcp_capability --|>|"inherits"| builtin_or_local_tool
    mcp_capability -->|"uses"| resolve_id
    mcp_capability -->|"uses builtin config"| create_builtin_tool
    mcp_capability -->|"uses local config"| create_local_tool
    mcp_capability -->|"applies filters"| filter_tools

    create_builtin_tool -->|"instantiates"| mcp_server_tool
    create_local_tool -->|"instantiates HTTP"| mcp_server_streamable_http
    create_local_tool -->|"instantiates SSE"| mcp_server_sse
    filter_tools -->|"filters and returns"| abstract_toolset

    %% Styling for external nodes
    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```
