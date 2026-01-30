# Module: `custom_cli_types`

## Introduction

The `custom_cli_types` module provides specialized Click parameter types designed to extend the functionality of Flask's command-line interface (CLI). These types facilitate the handling of complex input scenarios, such as multiple file paths or various certificate specifications, ensuring robust and flexible CLI commands.

## Core Components

### `SeparatedPathType`

The `SeparatedPathType` class is a custom Click parameter type that extends `click.Path`. Its primary function is to process a string containing multiple paths, separated by the operating system's path separator (e.g., `:` on Unix, `;` on Windows). Each individual path within the string is then validated using the standard `click.Path` type. This allows CLI commands to accept a single argument representing a list of paths, simplifying user input for scenarios like specifying multiple configuration files or directories.

**Key Features:**
*   **Path List Handling:** Parses a single string into a list of paths based on the OS path separator.
*   **Individual Path Validation:** Each extracted path is validated for existence and type (file/directory) by `click.Path`.
*   **Integration with Click:** Seamlessly integrates with Click's command and option decorators.

### `CertParamType`

The `CertParamType` class is a specialized Click parameter type designed for handling certificate specifications, particularly for the `--cert` option in Flask CLI commands. This type offers flexibility by accepting several forms of input for defining an SSL context:

*   **File Path:** A direct path to an existing certificate file.
*   **'adhoc' String:** The literal string `'adhoc'`, which triggers the generation of a temporary, self-signed certificate. This option requires the `cryptography` library to be installed.
*   **Import String:** A string representing an importable Python object that resolves to an `ssl.SSLContext` instance. This allows for dynamic loading of pre-configured SSL contexts.

**Key Features:**
*   **Flexible Certificate Input:** Supports file paths, ad-hoc generation, and `ssl.SSLContext` object imports.
*   **SSL Context Validation:** Ensures that if an import string is provided, it resolves to a valid `ssl.SSLContext` object.
*   **Dependency Management:** Checks for `ssl` and `cryptography` library availability when necessary, providing informative error messages.

## Architecture

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "SeparatedPathType", "label": "SeparatedPathType", "type": "component", "link": null},
        {"id": "CertParamType", "label": "CertParamType", "type": "component", "link": null},
        {"id": "click", "label": "Click Library", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "SeparatedPathType", "target": "click"},
        {"source": "CertParamType", "target": "click"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    SeparatedPathType[SeparatedPathType]
    CertParamType[CertParamType]
    click[Click Library]
    SeparatedPathType --> click
    CertParamType --> click
```
