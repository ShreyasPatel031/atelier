# Builtin Tool Handling Module

The `builtin_tool_handling` module, primarily through its `BuiltinOrLocalTool` component, provides a flexible mechanism for integrating both platform-native (builtin) tools and custom local fallback tools within an AI agent's capabilities. This module is crucial for building robust agents that can leverage the most efficient tool implementation available, while ensuring graceful degradation if a specific builtin tool is not supported by the underlying model.

## Core Component: `BuiltinOrLocalTool`

The `BuiltinOrLocalTool` class serves as an adapter that intelligently decides whether to use a provider's built-in tool or a locally defined fallback tool. This decision is based on the configuration provided and the capabilities of the AI model.

### Key Functionality

1.  **Flexible Tool Configuration**: Allows specifying the builtin tool, the local fallback tool, or both.
    *   `builtin`: Can be set to `True` (for default builtin), `False` (to disable builtin), or an instance of `AbstractBuiltinTool` for specific configurations. It can also be a callable to dynamically create the builtin tool.
    *   `local`: Can be `None` (auto-detect fallback), `False` (disable local), an instance of `Tool` or `AbstractToolset` for specific local tools, or a bare callable that is automatically wrapped into a `Tool`.
2.  **Intelligent Resolution**: During initialization (`__post_init__`), it resolves `True` for `builtin` to a default instance (if subclassed) and wraps bare callables provided for `local` into `Tool` instances.
3.  **Conflict Prevention**: Validates configurations to prevent contradictory settings, such as both `builtin` and `local` being `False`, or disabling a builtin tool that is explicitly required by constraint fields.
4.  **Subclassing Hooks**: Provides methods like `_default_builtin()`, `_default_local()`, `_builtin_unique_id()`, and `_requires_builtin()` that subclasses can override to define default behaviors and specific requirements. This allows for creating specialized capabilities like `WebSearch` or `WebFetch` (which are themselves subclasses of `BuiltinOrLocalTool`).
5.  **Toolset Generation**: The `get_toolset()` method returns an `AbstractToolset` (or `None`) which can include the local fallback, optionally enhanced with `prefer_builtin` directives if a builtin counterpart is available. This mechanism guides the `ToolManager` to prioritize the platform's native tool when offered alongside a local equivalent.

### How it Works

When an agent utilizes a `BuiltinOrLocalTool` capability, the module performs the following:

*   Checks if a built-in tool is configured and available.
*   If a built-in tool is not available or explicitly disabled, it falls back to the local tool if configured.
*   If both are available, it provides hints to the `ToolManager` to prefer the built-in version, ensuring optimal performance and integration with the AI model.
*   It dynamically adapts the tool definitions presented to the agent, ensuring that only relevant and supported tools are offered.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "builtin_or_local_tool", "label": "Builtin/Local Tool Handler", "type": "component", "link": null},
        {"id": "abstract_capability", "label": "Abstract Capability Interface", "type": "external", "link": "capabilities_base.md"},
        {"id": "tool_definitions", "label": "Tool Definitions (Local Fallback)", "type": "component", "link": null},
        {"id": "builtin_tool_implementations", "label": "Builtin Tool Implementations", "type": "external", "link": "builtin_tools.md"},
        {"id": "tool_registration_system", "label": "Tool Registration System", "type": "external", "link": "toolset_management.md"},
        {"id": "agent_runtime", "label": "Agent Runtime (Execution Context)", "type": "external", "link": "agent_execution_graph.md"}
    ],
    "edges": [
        {"source": "builtin_or_local_tool", "target": "abstract_capability", "label": "Implements"},
        {"source": "builtin_or_local_tool", "target": "builtin_tool_implementations", "label": "Manages"},
        {"source": "builtin_or_local_tool", "target": "tool_definitions", "label": "Defines"},
        {"source": "builtin_or_local_tool", "target": "tool_registration_system", "label": "Registers tools with"},
        {"source": "tool_registration_system", "target": "agent_runtime", "label": "Provides tools to"},
        {"source": "builtin_or_local_tool", "target": "agent_runtime", "label": "Uses RunContext from"}
    ],
    "groups": [
        {
            "id": "tool_adaptation",
            "label": "Tool Adaptation Logic",
            "role": "control",
            "nodes": ["builtin_or_local_tool", "tool_definitions"]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph tool_adaptation["Tool Adaptation Logic"]
        builtin_or_local_tool["Builtin/Local Tool Handler"]
        tool_definitions["Tool Definitions (Local Fallback)"]
    end

    abstract_capability["Abstract Capability Interface"]:::external
    builtin_tool_implementations["Builtin Tool Implementations"]:::external
    tool_registration_system["Tool Registration System"]:::external
    agent_runtime["Agent Runtime (Execution Context)"]:::external

    builtin_or_local_tool --|>|"Implements"| abstract_capability
    builtin_or_local_tool -->|"Manages"| builtin_tool_implementations
    builtin_or_local_tool -->|"Defines"| tool_definitions
    builtin_or_local_tool -->|"Registers tools with"| tool_registration_system
    tool_registration_system -->|"Provides tools to"| agent_runtime
    builtin_or_local_tool -.->|"Uses RunContext from"| agent_runtime

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

### Connections to Other Modules

*   **[`capabilities_base`][capabilities_base.md]**: `BuiltinOrLocalTool` inherits from `AbstractCapability`, making it a fundamental building block for agent functionalities.
*   **[`builtin_tools`][builtin_tools.md]**: This module provides the concrete implementations of various built-in tools (e.g., `UrlContextTool`, `CodeExecutionTool`) that `BuiltinOrLocalTool` can manage and integrate.
*   **[`toolset_management`][toolset_management.md]**: `BuiltinOrLocalTool` generates `Tool` and `AbstractToolset` instances, which are then processed and managed by the `ToolManager` within the `toolset_management` module. It also uses `prefer_builtin` hints to guide the tool selection process.
*   **[`agent_execution_graph`][agent_execution_graph.md]**: The tools managed by `BuiltinOrLocalTool` are ultimately executed within the agent's runtime environment, often orchestrated by components within the `agent_execution_graph` module, which also provides the `RunContext`.