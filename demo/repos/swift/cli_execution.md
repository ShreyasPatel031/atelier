# cli_execution Module Documentation

The `cli_execution` module is responsible for handling the command-line interface (CLI) of the GYB (Generate Your Boilerplate!) tool. It parses command-line arguments, manages input/output files, and orchestrates the template parsing and execution process. This module serves as the primary entry point for users interacting with the GYB templating engine.

## Core Functionality

The main functionality of this module is encapsulated in the `main` function, which acts as the CLI driver for GYB.

### `utils.gyb.main`

The `main` function initializes the argument parser, defines available command-line options such as defining variables (`-D`), specifying input/output files (`file`, `-o`), and enabling testing or debugging modes (`--test`, `--verbose-test`, `--dump`). It handles file reading, template parsing, and execution, writing the generated output to the specified target. It also manages the execution context for templates, allowing them to access system functionalities like file I/O and module imports relative to the template's directory.

**Key operations:**
- Argument parsing using `argparse`.
- Reading template content from standard input or a specified file.
- Setting up variable bindings for the template's execution context.
- Invoking `parse_template` to convert the raw template into an Abstract Syntax Tree (AST).
- Executing the template's AST using `execute_template` with the defined context.
- Handling output to standard output or a specified file.
- Providing self-testing capabilities via the `doctest` module.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "main_cli", "label": "utils.gyb.main", "type": "component", "link": null},
        {"id": "argparse_lib", "label": "argparse", "type": "external", "link": null},
        {"id": "sys_lib", "label": "sys", "type": "external", "link": null},
        {"id": "io_lib", "label": "io", "type": "external", "link": null},
        {"id": "os_lib", "label": "os", "type": "external", "link": null},
        {"id": "doctest_lib", "label": "doctest", "type": "external", "link": null},
        {"id": "gyb_core", "label": "gyb_core (parse_template, execute_template)", "type": "external", "link": "gyb_core.md"}
    ],
    "edges": [
        {"source": "main_cli", "target": "argparse_lib"},
        {"source": "main_cli", "target": "sys_lib"},
        {"source": "main_cli", "target": "io_lib"},
        {"source": "main_cli", "target": "os_lib"},
        {"source": "main_cli", "target": "doctest_lib"},
        {"source": "main_cli", "target": "gyb_core"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    %% CLI Execution Module
    main_cli[utils.gyb.main]

    %% External Dependencies (Standard Libraries)
    argparse_lib[argparse]
    sys_lib[sys]
    io_lib[io]
    os_lib[os]
    doctest_lib[doctest]

    %% External Module Dependencies
    gyb_core(gyb_core (parse_template, execute_template))
    click gyb_core "gyb_core.md"

    %% Relationships
    main_cli --> argparse_lib
    main_cli --> sys_lib
    main_cli --> io_lib
    main_cli --> os_lib
    main_cli --> doctest_lib
    main_cli --> gyb_core
```

## How it Fits into the Overall System

The `cli_execution` module, specifically the `utils.gyb.main` function, is the user-facing interface for the entire GYB templating system. It orchestrates the flow from command-line input to template processing and output generation. It relies heavily on components from the [gyb_core](gyb_core.md) module for the actual parsing and execution logic of GYB templates. This module is critical for enabling users to leverage the GYB tool for boilerplate generation across various projects.
