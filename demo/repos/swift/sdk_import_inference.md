# `sdk_import_inference`

The `sdk_import_inference` module is a crucial component within the `api_checker_utilities` system. Its primary role is to infer and output lists of SDK imports (either for Clang or Swift) based on a specified SDK path. This functionality is vital for various API checking and analysis tools that need accurate lists of available modules or frameworks.

## Core Functionality

This module provides a command-line utility for generating import lists. It can distinguish between Swift frameworks, Swift overlays, and Catalyst frameworks, offering flexible options to tailor the output to specific needs.

The main functionalities include:
-   **SDK Path Specification**: Users can provide the path to the SDK to be analyzed.
-   **Output Mode Selection**: Supports outputting imports in "clang-import", "swift-import", or a simple "list" format.
-   **Framework Filtering**: Options to specifically target Swift frameworks, Swift overlays, or Catalyst frameworks.
-   **Hashing**: Ability to include hashes in Clang import output.

## Architecture and Component Relationships

The `sdk_import_inference` module is centered around its `main` function, which handles command-line argument parsing and orchestrates the import inference process. It leverages several internal helper functions to retrieve framework lists and format the output according to the chosen mode.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "main", "label": "main (CLI Entrypoint)", "type": "component", "link": null},
        {"id": "optparse", "label": "optparse (Python StdLib)", "type": "external", "link": null},
        {"id": "get_overlays", "label": "get_overlays", "type": "component", "link": null},
        {"id": "get_catalyst_frameworks", "label": "get_catalyst_frameworks", "type": "component", "link": null},
        {"id": "get_frameworks", "label": "get_frameworks", "type": "component", "link": null},
        {"id": "print_clang_imports", "label": "print_clang_imports", "type": "component", "link": null},
        {"id": "print_swift_imports", "label": "print_swift_imports", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "main", "target": "optparse"},
        {"source": "main", "target": "get_overlays"},
        {"source": "main", "target": "get_catalyst_frameworks"},
        {"source": "main", "target": "get_frameworks"},
        {"source": "main", "target": "print_clang_imports"},
        {"source": "main", "target": "print_swift_imports"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    %% CLI Entrypoint
    main[main (CLI Entrypoint)]

    %% External Dependencies
    optparse(optparse (Python StdLib))

    %% Internal Components
    get_overlays[get_overlays]
    get_catalyst_frameworks[get_catalyst_frameworks]
    get_frameworks[get_frameworks]
    print_clang_imports[print_clang_imports]
    print_swift_imports[print_swift_imports]

    %% Relationships
    main --> optparse
    main --> get_overlays
    main --> get_catalyst_frameworks
    main --> get_frameworks
    main --> print_clang_imports
    main --> print_swift_imports
```

### Components

*   **`main`**: The primary entry point for the module when executed as a script. It parses command-line arguments using `optparse` and directs the flow based on the specified options. It determines which framework discovery function to call (`get_overlays`, `get_catalyst_frameworks`, or `get_frameworks`) and then which printing function (`print_clang_imports`, `print_swift_imports`) to use.
*   **`get_overlays`**: (Assumed internal helper) Responsible for identifying and returning a list of Swift overlays within the given SDK path.
*   **`get_catalyst_frameworks`**: (Assumed internal helper) Responsible for identifying and returning a list of Catalyst frameworks within the given SDK path.
*   **`get_frameworks`**: (Assumed internal helper) A more general function for identifying and returning a list of frameworks, with an option to filter for Swift-specific ones.
*   **`print_clang_imports`**: (Assumed internal helper) Formats and prints the discovered frameworks as Clang import statements, with an option to include hashes.
*   **`print_swift_imports`**: (Assumed internal helper) Formats and prints the discovered frameworks as Swift import statements.

### Dependencies

*   **`optparse` (Python Standard Library)**: Used by `main` for parsing command-line arguments. This is a standard Python library and does not represent an external module within the documentation system.

## Integration with the Overall System

The `sdk_import_inference` module is a sub-module of `api_checker_utilities`. It provides essential preliminary data (lists of SDK imports) for other tools within the `api_checker_utilities` suite, such as those that might perform API validation or compatibility checks. For instance, a tool like `swift_api_digester_wrapper` (which is also part of `api_checker_utilities`) might consume the output from `sdk_import_inference` to determine which modules to analyze or compare. This modular design allows for a clear separation of concerns, where `sdk_import_inference` specializes in gathering import information, which can then be used by downstream analysis tools.

For more information on the broader API checking utilities, refer to the [api_checker_utilities.md](api_checker_utilities.md) documentation.
