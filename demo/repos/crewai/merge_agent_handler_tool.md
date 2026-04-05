# merge_agent_handler_tool

## Introduction
The `merge_agent_handler_tool` module provides the `MergeAgentHandlerTool` class, enabling CrewAI agents to securely interact with third-party integrations via Merge Agent Handler. This integration leverages the Model Context Protocol (MCP) to manage authentication, permissions, and monitoring of tool execution.

## Module Purpose and Core Functionality
The primary purpose of this module is to bridge CrewAI agents with the Merge Agent Handler platform. This allows agents to execute a wide array of tools hosted on Agent Handler, facilitating interactions with various external services without direct management of individual API keys or authentication flows by the agent itself.

The `MergeAgentHandlerTool` acts as a wrapper, abstracting away the complexities of the MCP communication and providing a straightforward interface for CrewAI agents to call specific tools by name. It dynamically fetches tool schemas from Agent Handler to ensure proper argument validation and descriptions.

## Architecture and Component Relationships

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "merge_agent_handler_tool", "label": "MergeAgentHandlerTool", "type": "component"},
        {"id": "get_api_key", "label": "_get_api_key()", "type": "component"},
        {"id": "make_mcp_request", "label": "_make_mcp_request()", "type": "component"},
        {"id": "run_method", "label": "_run()", "type": "component"},
        {"id": "from_tool_name_method", "label": "from_tool_name()", "type": "component"},
        {"id": "from_tool_pack_method", "label": "from_tool_pack()", "type": "component"},
        {"id": "base_tool", "label": "BaseTool", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "agent_handler_api", "label": "Agent Handler API", "type": "external", "link": null},
        {"id": "pydantic", "label": "Pydantic", "type": "external", "link": null},
        {"id": "requests", "label": "Requests Library", "type": "external", "link": null},
        {"id": "env_vars", "label": "Environment Variables", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "merge_agent_handler_tool", "target": "base_tool"},
        {"source": "merge_agent_handler_tool", "target": "get_api_key"},
        {"source": "merge_agent_handler_tool", "target": "make_mcp_request"},
        {"source": "merge_agent_handler_tool", "target": "run_method"},
        {"source": "merge_agent_handler_tool", "target": "from_tool_name_method"},
        {"source": "merge_agent_handler_tool", "target": "from_tool_pack_method"},
        {"source": "get_api_key", "target": "env_vars"},
        {"source": "make_mcp_request", "target": "get_api_key"},
        {"source": "make_mcp_request", "target": "requests"},
        {"source": "make_mcp_request", "target": "agent_handler_api"},
        {"source": "run_method", "target": "make_mcp_request"},
        {"source": "from_tool_name_method", "target": "merge_agent_handler_tool"},
        {"source": "from_tool_name_method", "target": "make_mcp_request"},
        {"source": "from_tool_name_method", "target": "pydantic"},
        {"source": "from_tool_pack_method", "target": "merge_agent_handler_tool"},
        {"source": "from_tool_pack_method", "target": "make_mcp_request"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    merge_agent_handler_tool[MergeAgentHandlerTool]
    get_api_key[_get_api_key()]
    make_mcp_request[_make_mcp_request()]
    run_method[_run()]
    from_tool_name_method[from_tool_name()]
    from_tool_pack_method[from_tool_pack()]
    base_tool[BaseTool]:::external
    agent_handler_api[Agent Handler API]:::external
    pydantic[Pydantic]:::external
    requests[Requests Library]:::external
    env_vars[Environment Variables]:::external

    merge_agent_handler_tool --> base_tool
    merge_agent_handler_tool --> get_api_key
    merge_agent_handler_tool --> make_mcp_request
    merge_agent_handler_tool --> run_method
    merge_agent_handler_tool --> from_tool_name_method
    merge_agent_handler_tool --> from_tool_pack_method
    get_api_key --> env_vars
    make_mcp_request --> get_api_key
    make_mcp_request --> requests
    make_mcp_request --> agent_handler_api
    run_method --> make_mcp_request
    from_tool_name_method --> merge_agent_handler_tool
    from_tool_name_method --> make_mcp_request
    from_tool_name_method --> pydantic
    from_tool_pack_method --> merge_agent_handler_tool
    from_tool_pack_method --> make_mcp_request

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

### Core Components

#### `MergeAgentHandlerTool`
This is the main class within the module, inheriting from `BaseTool` ([crewai_tool_base.md](crewai_tool_base.md)). It encapsulates all the logic required to interact with the Merge Agent Handler.

-   **Attributes**:
    -   `tool_pack_id`: Unique identifier for the Agent Handler Tool Pack.
    -   `registered_user_id`: Identifier for the user registered with Agent Handler.
    -   `tool_name`: The specific name of the tool to be executed within the Tool Pack.
    -   `base_url`: The base URL for the Agent Handler API (defaults to `https://ah-api.merge.dev`).
    -   `session_id`: An optional MCP session ID, automatically generated if not provided.
    -   `env_vars`: A list of required environment variables, specifically `AGENT_HANDLER_API_KEY`.

-   **`model_post_init(__context: Any) -> None`**:
    Automatically initializes a `session_id` using `uuid4()` if one is not explicitly provided during instantiation.

-   **`_get_api_key() -> str`**:
    A private helper method responsible for retrieving the `AGENT_HANDLER_API_KEY` from the environment variables. It raises a `MergeAgentHandlerToolError` if the key is not found, ensuring secure and authenticated access to the Agent Handler API.

-   **`_make_mcp_request(method: str, params: dict[str, Any] | None = None) -> dict[str, Any]`**:
    This private method handles all communication with the Merge Agent Handler API. It constructs JSON-RPC 2.0 requests, including the necessary authorization headers (using the API key obtained from `_get_api_key()`) and a session ID. It uses the `requests` library to send HTTP POST requests and processes the responses, handling both successful results and JSON-RPC error payloads.

-   **`_run(**kwargs: Any) -> Any`**:
    The core execution method of the tool. It takes arbitrary keyword arguments, which represent the parameters for the specific Agent Handler tool being called. It constructs a `tools/call` MCP request using `_make_mcp_request` and extracts the relevant content from the Agent Handler's response, often parsing JSON-encoded text content.

-   **`from_tool_name(cls, tool_name: str, tool_pack_id: str, registered_user_id: str, base_url: str = "https://ah-api.merge.dev", **kwargs: Any) -> te.Self`**:
    A class method for creating a `MergeAgentHandlerTool` instance for a single, named tool. It dynamically fetches the tool's schema (description and parameters) from Agent Handler using a `tools/list` MCP request. This schema is then used to create a Pydantic `args_schema` for the tool, allowing for proper argument validation during execution. It maps JSON schema types to Python types for robust argument handling.

-   **`from_tool_pack(cls, tool_pack_id: str, registered_user_id: str, tool_names: list[str] | None = None, base_url: str = "https://ah-api.merge.dev", **kwargs: Any) -> list[te.Self]`**:
    A class method designed to instantiate multiple `MergeAgentHandlerTool` instances from a given Tool Pack. It first retrieves a list of all available tools within the specified `tool_pack_id` from Agent Handler. If `tool_names` are provided, it filters the list to include only the requested tools. For each identified tool, it calls `from_tool_name` to create and configure an individual `MergeAgentHandlerTool` instance.

## How the Module Fits into the Overall System
The `merge_agent_handler_tool` module is a vital part of the `crewai_tools_platform_automation` family of tools, which focuses on integrating CrewAI with various external platforms and services for automation.

It provides a standardized and secure way for CrewAI agents to interact with Merge Agent Handler, which itself acts as a gateway to numerous third-party APIs. This allows CrewAI workflows to extend their capabilities significantly by leveraging a vast ecosystem of integrations managed and secured by Merge Agent Handler.

This module ensures that agents can execute complex actions in external systems (e.g., creating issues in Linear, fetching data from databases, interacting with CRM systems) without requiring the CrewAI application itself to directly manage credentials or API specifics for each integration. Instead, Agent Handler handles these concerns, providing a more robust, scalable, and secure solution for platform automation within CrewAI.

It relies on the [crewai_tool_base](crewai_tool_base.md) module for its foundational `BaseTool` class, which defines the basic structure and behavior of all tools within CrewAI. The dynamic schema generation using Pydantic also highlights its reliance on robust data modeling and validation practices, which are common across CrewAI's tool development.