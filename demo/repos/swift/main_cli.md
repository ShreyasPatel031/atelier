# main_cli Module Documentation

## Introduction

The `main_cli` module serves as the primary command-line interface (CLI) for the bug reduction tools within the `bug_reducer_tools` suite. Its main purpose is to provide a unified entry point for users to access various bug reduction functionalities, specifically designed to help in debugging Swift Intermediate Language (SIL) and Swift AST (SIB) crashers. It dispatches commands to specialized bug reduction modules such as `function_reducer` and `pass_reducer` based on user input.

## Architecture and Component Relationships

The `main_cli` module's core functionality revolves around parsing command-line arguments and invoking the appropriate bug reduction sub-commands. It leverages the `argparse` Python library to manage different subcommands and their respective options.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "main_cli_entry_point", "label": "main() CLI Entry Point", "type": "component", "link": null},
        {"id": "function_reducer", "label": "Function Reducer", "type": "external", "link": "function_reducer.md"},
        {"id": "pass_reducer", "label": "Pass Reducer", "type": "external", "link": "pass_reducer.md"},
        {"id": "argparse_lib", "label": "argparse Library", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "main_cli_entry_point", "target": "function_reducer"},
        {"source": "main_cli_entry_point", "target": "pass_reducer"},
        {"source": "main_cli_entry_point", "target": "argparse_lib"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    %% Internal Components
    main_cli_entry_point[main() CLI Entry Point]

    %% External Dependencies
    function_reducer[Function Reducer]
    pass_reducer[Pass Reducer]
    argparse_lib[argparse Library]

    %% Relationships
    main_cli_entry_point --> function_reducer
    main_cli_entry_point --> pass_reducer
    main_cli_entry_point --> argparse_lib
```

### Core Components

- **`utils.bug_reducer.bug_reducer.bug_reducer.main`**: This is the central function that initializes the argument parser, defines the subcommands (`opt`, `random-search`, `func`), and dispatches to the corresponding bug reduction logic based on user input. It acts as the orchestrator for the entire bug reduction CLI.

## How it Fits into the Overall System

The `main_cli` module is a crucial part of the `bug_reducer_tools` system, providing the user-facing interface for all bug reduction operations. It abstracts away the complexity of directly calling individual reduction scripts by offering a consolidated command-line tool. Users interact with `main_cli` to initiate various bug reduction tasks, which in turn utilize the specialized functionalities provided by modules like `function_reducer` (for function-level reductions) and `pass_reducer` (for optimization pass-level and random search reductions).

For more details on specific bug reduction techniques, refer to:
- [Function Reducer Documentation](function_reducer.md)
- [Pass Reducer Documentation](pass_reducer.md)
