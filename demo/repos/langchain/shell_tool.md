# `shell_tool`

The `shell_tool` module provides the `ShellToolMiddleware` for integrating a persistent shell execution tool into Langchain agents. This middleware enables agents to execute shell commands, manage session lifecycles, and enforce security policies, making it a crucial component for agents requiring direct system interaction.

## Comprehensive Documentation

### Purpose
The `ShellToolMiddleware` allows agents to interact with a shell environment directly. It provisions a long-lived shell session, manages its lifecycle, and provides mechanisms for secure execution and output sanitization.

### Core Functionality
*   **Persistent Shell Session:** Establishes and maintains a single shell session throughout the agent's execution.
*   **Configurable Execution Policies:** Supports various security policies (e.g., `HostExecutionPolicy`, `CodexSandboxExecutionPolicy`, `DockerExecutionPolicy`) to control resource access and isolation.
*   **Startup and Shutdown Commands:** Executes a configurable set of commands when the shell session starts and before it shuts down.
*   **Command Redaction:** Applies specified redaction rules to sanitize command output, preventing sensitive information from being exposed to the agent.
*   **Shell Tool Interface:** Exposes a `shell` tool that agents can call to execute arbitrary shell commands or restart the session.
*   **Error Handling and Timeouts:** Manages command timeouts and reports exit codes for robust execution.

### Architecture and Component Relationships

The `shell_tool` module centers around the `ShellToolMiddleware` class, which acts as a wrapper around a `ShellSession`.

*   `ShellToolMiddleware`: The main class that initializes, manages, and exposes the shell tool. It leverages several helper methods for command normalization, resource management, and output redaction.
*   `ShellSession`: An internal component (not directly exposed in the module tree but used by the middleware) responsible for managing the actual shell process, executing commands, and capturing their output.
*   `BaseExecutionPolicy` (from [execution_policies.md](execution_policies.md)): Determines how shell commands are executed, including timeouts, output limits, and security restrictions. `HostExecutionPolicy` is the default.
*   `RedactionRule` (from [redaction.md](redaction.md)): Used by the middleware to define rules for sanitizing command output, protecting sensitive information.
*   `AgentMiddleware` (from [middleware_types.md](middleware_types.md)): `ShellToolMiddleware` inherits from this base class, integrating it into the agent middleware pipeline.
*   `ToolMessage`, `tool`, `ToolRuntime`, `ToolException` (from [core_tools.md](core_tools.md)): Used to define and interact with the `shell` tool, allowing agents to call it.

### Relationship to the Overall System
The `shell_tool` module is a crucial part of the `langchain_v1_agents_middleware` system, providing agents with a powerful capability to interact with the underlying operating system. It enables agents to perform tasks that require direct command-line execution, such as file system operations, software installation, or system configuration. By integrating configurable security policies and redaction rules, it ensures that this powerful capability can be used responsibly and securely within agent-driven applications. It depends on `execution_policies` for runtime security and `redaction` for output sanitization, making it an extensible and secure way to empower agents with shell access.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "shell_tool_middleware", "label": "ShellToolMiddleware", "type": "component", "link": null},
        {"id": "shell_session", "label": "ShellSession", "type": "component", "link": null},
        {"id": "execution_policies", "label": "Execution Policies", "type": "external", "link": "execution_policies.md"},
        {"id": "redaction", "label": "Redaction Rules", "type": "external", "link": "redaction.md"},
        {"id": "middleware_types", "label": "AgentMiddleware Base", "type": "external", "link": "middleware_types.md"},
        {"id": "core_tools", "label": "Core Tools", "type": "external", "link": "core_tools.md"},
        {"id": "before_agent_hook", "label": "before_agent/abefore_agent", "type": "component", "link": null},
        {"id": "after_agent_hook", "label": "after_agent/aafter_agent", "type": "component", "link": null},
        {"id": "run_shell_tool_func", "label": "_run_shell_tool", "type": "component", "link": null},
        {"id": "normalize_commands_func", "label": "_normalize_commands", "type": "component", "link": null},
        {"id": "create_resources_func", "label": "_create_resources", "type": "component", "link": null},
        {"id": "shell_tool_decorator", "label": "@tool decorator", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "shell_tool_middleware", "target": "shell_session", "label": "manages"},
        {"source": "shell_tool_middleware", "target": "execution_policies", "label": "uses"},
        {"source": "shell_tool_middleware", "target": "redaction", "label": "applies"},
        {"source": "shell_tool_middleware", "target": "middleware_types", "label": "inherits from"},
        {"source": "shell_tool_middleware", "target": "before_agent_hook", "label": "calls"},
        {"source": "shell_tool_middleware", "target": "after_agent_hook", "label": "calls"},
        {"source": "shell_tool_middleware", "target": "normalize_commands_func", "label": "uses"},
        {"source": "before_agent_hook", "target": "create_resources_func", "label": "calls"},
        {"source": "create_resources_func", "target": "shell_session", "label": "creates"},
        {"source": "create_resources_func", "target": "execution_policies", "label": "uses"},
        {"source": "after_agent_hook", "target": "shell_session", "label": "stops"},
        {"source": "shell_tool_decorator", "target": "shell_tool_middleware", "label": "defines tool for"},
        {"source": "shell_tool_decorator", "target": "core_tools", "label": "uses"},
        {"source": "shell_tool_decorator", "target": "run_shell_tool_func", "label": "invokes"},
        {"source": "run_shell_tool_func", "target": "shell_session", "label": "executes via"},
        {"source": "run_shell_tool_func", "target": "redaction", "label": "applies"},
        {"source": "run_shell_tool_func", "target": "execution_policies", "label": "respects"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    shell_tool_middleware[ShellToolMiddleware]
    shell_session[ShellSession]
    execution_policies[Execution Policies]
    redaction[Redaction Rules]
    middleware_types[AgentMiddleware Base]
    core_tools[Core Tools]
    before_agent_hook[before_agent/abefore_agent]
    after_agent_hook[after_agent/aafter_agent]
    run_shell_tool_func[_run_shell_tool]
    normalize_commands_func[_normalize_commands]
    create_resources_func[_create_resources]
    shell_tool_decorator[@tool decorator]

    shell_tool_middleware -- manages --> shell_session
    shell_tool_middleware -- uses --> execution_policies
    shell_tool_middleware -- applies --> redaction
    shell_tool_middleware -- inherits from --> middleware_types
    shell_tool_middleware -- calls --> before_agent_hook
    shell_tool_middleware -- calls --> after_agent_hook
    shell_tool_middleware -- uses --> normalize_commands_func
    before_agent_hook -- calls --> create_resources_func
    create_resources_func -- creates --> shell_session
    create_resources_func -- uses --> execution_policies
    after_agent_hook -- stops --> shell_session
    shell_tool_decorator -- defines tool for --> shell_tool_middleware
    shell_tool_decorator -- uses --> core_tools
    shell_tool_decorator -- invokes --> run_shell_tool_func
    run_shell_tool_func -- executes via --> shell_session
    run_shell_tool_func -- applies --> redaction
    run_shell_tool_func -- respects --> execution_policies
```