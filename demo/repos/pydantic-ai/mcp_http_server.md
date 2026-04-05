# `mcp_http_server`

## Introduction

The `mcp_http_server` module provides the `MCPServerHTTP` class, an implementation of the Model Context Protocol (MCP) server that utilizes HTTP with Server-Sent Events (SSE) for communication. This module enables Pydantic AI agents to connect to and interact with existing MCP servers, leveraging them as toolsets within their operational flow.

## Core Functionality

The primary component of this module is `MCPServerHTTP`.

### `MCPServerHTTP`

`MCPServerHTTP` acts as a client-side representation of an MCP server, specifically designed for communication over HTTP using the SSE transport mechanism. It allows agents to register and utilize tools or resources exposed by an MCP server. By treating an `MCPServerHTTP` instance as a toolset, agents can seamlessly integrate external MCP capabilities into their execution graph.

Key features:

*   **SSE Transport**: Implements the Server-Sent Events (SSE) transport specified by the MCP, ensuring real-time communication for agent interactions.
*   **Toolset Integration**: Can be instantiated and directly used as a `toolset` for Pydantic AI `Agent` instances, facilitating the execution of remote MCP-defined capabilities.
*   **Async Context Management**: Designed to be used as an asynchronous context manager to manage HTTP connection pools to the target MCP server.

## Architecture and Component Relationships

The `mcp_http_server` module is a leaf module within the broader `mcp_integration` component of the `pydantic_ai_misc` module. It focuses specifically on the HTTP/SSE transport layer for MCP.

It interacts with several other modules:

*   **`mcp_server_sse_base`**: `MCPServerHTTP` inherits from `MCPServerSSE`, which provides the foundational SSE transport logic. This base class is an internal component within the same `mcp` package.
*   **`pydantic_ai_agent_core`**: Agents defined in `pydantic_ai_agent_core` utilize `MCPServerHTTP` instances as toolsets to extend their capabilities by connecting to external MCP services.
*   **`mcp_config_loader`**: While `MCPServerHTTP` directly handles connections, the overall management and discovery of MCP servers might involve configurations loaded by the `mcp_config_loader` module.
*   **`mcp_resource_models`**: As an MCP-related component, `MCPServerHTTP` likely interacts with or processes `Resource` and `ResourceTemplate` objects defined in the `mcp_resource_models` module.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "mcp_server_http", "label": "MCPServerHTTP", "type": "component", "link": null},
        {"id": "mcp_server_sse_base", "label": "MCPServerSSE (Base)", "type": "component", "link": null},
        {"id": "pydantic_ai_agent_core", "label": "Pydantic AI Agent Core", "type": "external", "link": "pydantic_ai_agent_core.md"},
        {"id": "mcp_config_loader", "label": "MCP Config Loader", "type": "external", "link": "mcp_config_loader.md"},
        {"id": "mcp_resource_models", "label": "MCP Resource Models", "type": "external", "link": "mcp_resource_models.md"}
    ],
    "edges": [
        {"source": "mcp_server_http", "target": "mcp_server_sse_base"},
        {"source": "pydantic_ai_agent_core", "target": "mcp_server_http"},
        {"source": "mcp_server_http", "target": "mcp_config_loader"},
        {"source": "mcp_server_http", "target": "mcp_resource_models"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    mcp_server_http[MCPServerHTTP]
    mcp_server_sse_base[MCPServerSSE (Base)]
    pydantic_ai_agent_core[Pydantic AI Agent Core]
    mcp_config_loader[MCP Config Loader]
    mcp_resource_models[MCP Resource Models]

    mcp_server_http --> mcp_server_sse_base
    pydantic_ai_agent_core --> mcp_server_http
    mcp_server_http --> mcp_config_loader
    mcp_server_http --> mcp_resource_models
```

## How it Fits into the Overall System

The `mcp_http_server` module is crucial for enabling external communication and extensibility within the Pydantic AI ecosystem. By providing an HTTP/SSE-based MCP client, it allows Pydantic AI agents to seamlessly integrate with and utilize capabilities exposed by any compliant MCP server. This facilitates a modular architecture where specialized tools and services can be hosted externally and dynamically made available to agents, significantly expanding their operational scope without requiring tight coupling or direct code integration.

It specifically supports the `pydantic_ai_misc` module's `mcp_integration` efforts, acting as the concrete transport layer that allows agents to "talk" to the broader MCP world. This separation of concerns ensures that core agent logic remains clean, while complex external interactions are handled by dedicated transport implementations like `MCPServerHTTP`.