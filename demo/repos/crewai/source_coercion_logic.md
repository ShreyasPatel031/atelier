# source_coercion_logic Module Documentation

## Introduction

The `source_coercion_logic` module is responsible for defining the core logic for coercing various input types into a standardized `FileSource` representation. This module ensures that file-related operations throughout the system can seamlessly handle different forms of file inputs, such as file paths, URLs, byte data, and file stream objects, by converting them into a consistent internal format.

## Core Functionality

This module provides two primary components for handling file source coercion: a standalone utility function and a Pydantic-compatible coercer.

### `_normalize_source`

The `_normalize_source` function acts as a universal converter for transforming raw input values into concrete `FileSource` instances. It supports a wide range of input types, including:

*   Existing `FilePath`, `FileBytes`, `FileStream`, `AsyncFileStream`, or `FileUrl` objects (returned directly).
*   Strings:
    *   If starting with "http://" or "https://", converted to `FileUrl`.
    *   Otherwise, treated as a local file path and converted to `FilePath`.
*   `pathlib.Path` objects: Converted to `FilePath`.
*   Bytes: Converted to `FileBytes`.
*   `AsyncReadable` objects: Converted to `AsyncFileStream`.
*   Objects with `read` and `seek` attributes (standard synchronous file-like objects): Converted to `FileStream`.

Any other input type that cannot be coerced will raise a `ValueError`. This function is crucial for standardizing how file inputs are interpreted across the system.

### `_FileSourceCoercer`

The `_FileSourceCoercer` class provides a Pydantic-compatible mechanism for coercing diverse inputs into `FileSource` types. It is designed to be used within Pydantic models for automatic data validation and transformation.

*   **`_coerce` Method**: This class method implements the core coercion logic, mirroring the functionality of `_normalize_source`. It inspects the input value and returns the appropriate `FileSource` subclass. It specifically handles `IOBase` and `BinaryIO` types for `FileStream` conversion, in addition to the types supported by `_normalize_source`.
*   **`__get_pydantic_core_schema__` Method**: This special Pydantic V2 method registers the `_coerce` method as a `no_info_plain_validator_function`. This allows Pydantic to automatically invoke `_coerce` whenever a field is typed with `_FileSourceCoercer`, ensuring that inputs are correctly transformed into `FileSource` objects during model instantiation and validation. It also configures a simple serializer that returns the coerced `FileSource` object as is.

## Architecture and Component Relationships

The `source_coercion_logic` module contains the fundamental components for converting diverse data representations into a unified `FileSource` format. It primarily interacts with various `FileSource` types, which are foundational data structures for handling files within the `crewai-files` system. The `_FileSourceCoercer` component also integrates with the Pydantic library for robust data validation and serialization in models.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "normalize_source", "label": "_normalize_source()", "type": "component", "link": null},
        {"id": "file_source_coercer", "label": "_FileSourceCoercer", "type": "component", "link": null},
        {"id": "file_source_types", "label": "FileSource Types", "type": "external", "link": "crewai_files_core.md"},
        {"id": "pydantic_library", "label": "Pydantic Library", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "normalize_source", "target": "file_source_types"},
        {"source": "file_source_coercer", "target": "file_source_types"},
        {"source": "file_source_coercer", "target": "pydantic_library"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    normalize_source[_normalize_source()]
    file_source_coercer[_FileSourceCoercer]
    file_source_types[FileSource Types]
    pydantic_library[Pydantic Library]

    normalize_source --> file_source_types
    file_source_coercer --> file_source_types
    file_source_coercer --> pydantic_library
```

## Integration with Overall System

The `source_coercion_logic` module is a critical sub-module within the `file_source_coercion` module, which itself is part of the `file_source_handling` sub-system under `crewai_files_core`. Its role is foundational:

*   **Standardization**: It provides the core algorithms for converting any supported input into a `FileSource`, ensuring that all subsequent file processing operations ([crewai_files_processing.md]), caching ([crewai_files_cache.md]), and resolution ([crewai_files_resolution.md]) can rely on a consistent data structure.
*   **Pydantic Integration**: Through `_FileSourceCoercer`, it enables seamless integration with Pydantic models used across the `crewai-files` system, allowing developers to define fields that automatically handle various file input formats.
*   **Data Ingestion**: This module sits at the initial stages of file data ingestion, ensuring flexibility in how users provide file inputs (e.g., directly as strings, `Path` objects, or file streams) while maintaining strict internal type consistency.

This module is essential for the robustness and user-friendliness of the `crewai-files` system, as it abstracts away the complexities of handling diverse file input formats.