# `composio_tool`

## Introduction
The `composio_tool` module facilitates the integration of Composio actions as tools within the CrewAI framework. This module enables CrewAI agents to leverage a wide array of third-party application functionalities and services that are exposed through the Composio platform, enhancing the capabilities of autonomous agents.

## Architecture and Component Relationships

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "composio_tool_class", "label": "ComposioTool", "type": "component", "link": null},
        {"id": "run_method", "label": "_run()", "type": "component", "link": null},
        {"id": "check_connected_account_method", "label": "_check_connected_account()", "type": "component", "link": null},
        {"id": "from_action_method", "label": "from_action()", "type": "component", "link": null},
        {"id": "from_app_method", "label": "from_app()", "type": "component", "link": null},
        {"id": "crewai_tool_base", "label": "crewai_tool_base", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "composio_library", "label": "Composio Library", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "composio_tool_class", "target": "run_method"},
        {"source": "composio_tool_class", "target": "check_connected_account_method"},
        {"source": "composio_tool_class", "target": "from_action_method"},
        {"source": "composio_tool_class", "target": "from_app_method"},
        {"source": "composio_tool_class", "target": "crewai_tool_base"},
        {"source": "check_connected_account_method", "target": "composio_library"},
        {"source": "from_action_method", "target": "composio_library"},
        {"source": "from_app_method", "target": "composio_library"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    composio_tool_class[ComposioTool]
    run_method[_run()]
    check_connected_account_method[_check_connected_account()]
    from_action_method[from_action()]
    from_app_method[from_app()]
    crewai_tool_base[crewai_tool_base]:::external
    composio_library[Composio Library]:::external
    composio_tool_class --> run_method
    composio_tool_class --> check_connected_account_method
    composio_tool_class --> from_action_method
    composio_tool_class --> from_app_method
    composio_tool_class --> crewai_tool_base
    check_connected_account_method --> composio_library
    from_action_method --> composio_library
    from_app_method --> composio_library

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

## Module Components

### `ComposioTool`
`ComposioTool` is the central class in this module, serving as a wrapper for Composio actions to be used as tools within CrewAI. It inherits from `BaseTool` (see [crewai_tool_base](crewai_tool_base.md) for more details on `BaseTool`).

#### Attributes
- `composio_action`: A callable representing the actual Composio action to be executed.
- `env_vars`: A list of `EnvVar` objects defining environment variables required for the tool. Currently, it mandates `COMPOSIO_API_KEY` for Composio services.

#### Methods

##### `_run(*args: Any, **kwargs: Any) -> Any`
This method executes the encapsulated `composio_action` with the provided arguments. It serves as the core execution logic for the tool.

##### `_check_connected_account(tool: Any, toolset: Any) -> None`
A static method responsible for verifying if a connected account is necessary for a given Composio `tool` and if it exists within the `toolset`. If authentication is required but no connected account is found, it raises a `RuntimeError` with instructions to remedy the situation.

##### `from_action(action: Any, **kwargs: Any) -> Self`
A class method used to instantiate a `ComposioTool` from a specific Composio `action`.
1. It ensures the provided `action` is a `Composio` `Action` object.
2. Calls `_check_connected_account` to validate account connection.
3. Retrieves the action's schema from the `ComposioToolSet`.
4. Constructs a wrapper function that executes the Composio action using `toolset.execute_action`.
5. Returns a `ComposioTool` instance configured with the action's name, description, arguments schema, and the wrapper function.

##### `from_app(*apps: Any, tags: list[str] | None = None, use_case: str | None = None, **kwargs: Any) -> list[Self]`
A class method designed to create a list of `ComposioTool` instances based on one or more specified Composio applications.
- It requires either `use_case` or `tags` to filter the actions.
- It leverages the `ComposioToolSet` to find actions by `use_case` or `tags` within the given `apps`.
- For each found action, it calls `from_action` to create a `ComposioTool` instance.

## How the Module Fits into the Overall System
The `composio_tool` module plays a crucial role in extending the capabilities of CrewAI agents by providing a standardized way to integrate with the Composio platform. It acts as a bridge, allowing agents to access and execute a wide range of external services and applications. This enhances the overall system's ability to perform complex tasks that require interaction with external APIs and services, without requiring direct, low-level integration for each individual service. It is a key component within the `crewai_tools_platform_automation` module, which focuses on providing tools for automating various platforms and services.