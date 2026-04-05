# codex_sandbox_policy

The `codex_sandbox_policy` module provides a robust execution policy for launching shell commands within the Anthropic Codex CLI sandbox. This module leverages the security features of the Codex CLI, offering syscall and filesystem restrictions for enhanced isolation and safety during command execution. It is particularly useful in environments where secure execution of untrusted code is paramount.

## Architecture and Component Relationships

The `codex_sandbox_policy` module contains the `CodexSandboxExecutionPolicy` class, which extends `BaseExecutionPolicy` from the [execution_policies](execution_policies.md) module. This class is responsible for orchestrating the execution of commands within the Codex sandbox, handling binary resolution, platform determination, and configuration overrides.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "codex_sandbox_execution_policy", "label": "CodexSandboxExecutionPolicy", "type": "component", "link": null},
        {"id": "spawn", "label": "spawn()", "type": "component", "link": null},
        {"id": "_build_command", "label": "_build_command()", "type": "component", "link": null},
        {"id": "_resolve_binary", "label": "_resolve_binary()", "type": "component", "link": null},
        {"id": "_determine_platform", "label": "_determine_platform()", "type": "component", "link": null},
        {"id": "_format_override", "label": "_format_override()", "type": "component", "link": null},
        {"id": "base_execution_policy", "label": "BaseExecutionPolicy", "type": "external", "link": "execution_policies.md"}
    ],
    "edges": [
        {"source": "codex_sandbox_execution_policy", "target": "spawn"},
        {"source": "codex_sandbox_execution_policy", "target": "_build_command"},
        {"source": "codex_sandbox_execution_policy", "target": "_resolve_binary"},
        {"source": "codex_sandbox_execution_policy", "target": "_determine_platform"},
        {"source": "codex_sandbox_execution_policy", "target": "_format_override"},
        {"source": "base_execution_policy", "target": "codex_sandbox_execution_policy", "label": "inherits"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    codex_sandbox_execution_policy[CodexSandboxExecutionPolicy]
    spawn[spawn()]
    _build_command[_build_command()]
    _resolve_binary[_resolve_binary()]
    _determine_platform[_determine_platform()]
    _format_override[_format_override()]
    base_execution_policy[BaseExecutionPolicy]

    codex_sandbox_execution_policy --> spawn
    codex_sandbox_execution_policy --> _build_command
    codex_sandbox_execution_policy --> _resolve_binary
    codex_sandbox_execution_policy --> _determine_platform
    codex_sandbox_execution_policy --> _format_override
    base_execution_policy -- inherits --> codex_sandbox_execution_policy
```

## Core Functionality

### `CodexSandboxExecutionPolicy`

This class is a specialized execution policy that utilizes the Anthropic Codex CLI sandbox for running commands. It ensures that commands are executed within a secure, isolated environment, mitigating risks associated with arbitrary code execution.

**Key Features:**

*   **Secure Execution:** Leverages syscall and filesystem restrictions provided by Anthropic's Seatbelt (macOS) or Landlock/seccomp (Linux) profiles.
*   **Platform Flexibility:** Automatically detects the operating system (Linux or macOS) to apply appropriate sandbox configurations, with an option for explicit platform specification.
*   **Configurable Sandbox Behavior:** Allows customization of sandbox settings via `config_overrides` to align with specific Codex CLI profiles.
*   **Dependency on Codex CLI:** Requires the `codex` CLI to be installed and accessible in the system's PATH.

**Methods:**

*   `spawn(*, workspace: Path, env: Mapping[str, str], command: Sequence[str]) -> subprocess.Popen[str]`
    Spawns a new subprocess to execute the given `command` within the configured Codex sandbox. It constructs the full sandboxed command and then launches it using `_launch_subprocess` (an internal helper not detailed in the snippet, but implicitly used by `BaseExecutionPolicy` or a similar mechanism).
    *   `workspace`: The working directory for the command.
    *   `env`: Environment variables to set for the subprocess.
    *   `command`: The sequence of strings representing the command and its arguments.

*   `_build_command(self, command: Sequence[str]) -> list[str]`
    An internal method that constructs the complete command string, including the `codex` binary, `sandbox` subcommand, platform argument, and any `config_overrides`. The `command` to be executed is appended after a `--` separator.

*   `_resolve_binary(self) -> str`
    Verifies the presence and accessibility of the `codex` binary in the system's PATH. Raises a `RuntimeError` if the binary is not found.

*   `_determine_platform(self) -> str`
    Determines the target platform for the sandbox. If `platform` is set to "auto", it detects whether the OS is Linux or macOS. Otherwise, it uses the explicitly set `platform` value. Raises a `RuntimeError` if the platform cannot be determined automatically and is not explicitly set.

*   `_format_override(value: typing.Any) -> str`
    A static method that formats a configuration override value into a string. It attempts to JSON-serialize the value first; if that fails, it converts the value to a string.

## Integration with the Overall System

The `codex_sandbox_policy` module fits into the larger `langchain_v1_agents_middleware` system, specifically within the `execution_policies` sub-module. It provides a secure execution environment for agents that require running external commands, particularly when those commands might come from untrusted sources or require strict resource isolation. Agents configured to use this policy will benefit from the enhanced security posture offered by the Codex CLI sandbox.

This module works in conjunction with other middleware components by ensuring that any command execution initiated by an agent adheres to the defined security policy before the command is actually run.