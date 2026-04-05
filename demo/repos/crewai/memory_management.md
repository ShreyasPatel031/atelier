# `memory_management` Module Documentation

The `memory_management` module, part of the `crewai_cli.memory_and_output_utilities` package, provides functionality for managing and resetting various memory components within the CrewAI system via the command-line interface. Its primary function is to allow users to clear stored data, including general memory, knowledge bases, agent-specific knowledge, and kickoff outputs, ensuring a clean slate for new operations or debugging.

### Purpose and Core Functionality

The main purpose of the `memory_management` module is to offer a robust CLI interface for memory control. It centralizes the process of clearing different types of persistent data used by CrewAI agents and crews. This is crucial for:

*   **Debugging and Development**: Easily resetting memory to test agent behavior from a fresh state.
*   **Privacy and Data Management**: Clearing sensitive information after tasks are completed.
*   **System Maintenance**: Ensuring optimal performance by removing old or irrelevant data.

The core functionality is encapsulated in the `reset_memories` command, which allows granular control over what memory components are reset.

### Architecture and Component Relationships

The `memory_management` module is a leaf module within the `crewai_cli` structure, specifically residing under `memory_and_output_utilities`. Its architecture is straightforward, primarily consisting of a single exposed CLI command that orchestrates the memory reset process.

#### Core Components:

*   **`reset_memories`**: The main entry point for CLI-based memory reset operations. It parses command-line arguments, handles deprecated flags, validates user input, and delegates the actual memory clearing to an internal command.

The `reset_memories` function relies on an internal utility (referred to here as `reset_memories_command_internal`) to perform the actual data deletion. It also interacts with the `click` framework for argument parsing and user feedback.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "reset_memories", "label": "reset_memories (CLI Command)", "type": "component", "link": null},
        {"id": "reset_memories_command_internal", "label": "reset_memories_command (Internal Utility)", "type": "component", "link": null},
        {"id": "click_cli_framework", "label": "Click CLI Framework", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "reset_memories", "target": "reset_memories_command_internal"},
        {"source": "reset_memories", "target": "click_cli_framework"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    reset_memories[reset_memories (CLI Command)]
    reset_memories_command_internal[reset_memories_command (Internal Utility)]
    click_cli_framework[Click CLI Framework]
    reset_memories --> reset_memories_command_internal
    reset_memories --> click_cli_framework
```

### How the Module Fits into the Overall System

The `memory_management` module plays a vital role in the `crewai_cli` by providing essential maintenance capabilities. As part of `crewai_cli.memory_and_output_utilities`, it complements the [task_output_management](task_output_management.md) module by offering control over input/output persistence and agent memory.

It integrates directly with the CLI, making it accessible to developers and administrators who need to manage the state of their CrewAI applications from the command line. This module ensures that memory-related operations are straightforward and well-defined, contributing to the overall stability and manageability of the CrewAI ecosystem. Its position under `crewai_cli` signifies its direct interaction with user commands and its role in facilitating system control and debugging.