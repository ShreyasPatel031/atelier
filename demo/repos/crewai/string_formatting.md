# Module: `string_formatting`

## Introduction
The `string_formatting` module, located within `crewai_utilities.data_serialization_and_formatting`, provides essential utilities for manipulating and formatting strings. Its primary function is to transform raw text into a clean, consistent, and URL-safe format, commonly known as "slugification." This module ensures that string data can be reliably used in contexts requiring specific formatting, such as file names, URLs, or unique identifiers.

## Purpose and Core Functionality
The core purpose of this module is to offer robust string formatting capabilities. Currently, its main functionality revolves around the `slugify` function, which converts any given text into a "slug" by normalizing Unicode characters, removing special characters, converting to lowercase, and replacing whitespace with a specified separator. This is crucial for maintaining data integrity and compatibility across various system components and external integrations.

## Architecture and Component Relationships

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "slugify_func", "label": "slugify(text, separator)", "type": "component", "link": null},
        {"id": "quote_pattern", "label": "_QUOTE_PATTERN", "type": "component", "link": null},
        {"id": "disallowed_chars_pattern", "label": "_DISALLOWED_CHARS_PATTERN", "type": "component", "link": null},
        {"id": "duplicate_separator_pattern", "label": "_duplicate_separator_pattern", "type": "component", "link": null},
        {"id": "unicodedata_lib", "label": "unicodedata (Python Lib)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "slugify_func", "target": "unicodedata_lib"},
        {"source": "slugify_func", "target": "quote_pattern"},
        {"source": "slugify_func", "target": "disallowed_chars_pattern"},
        {"source": "slugify_func", "target": "duplicate_separator_pattern"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    slugify_func[slugify(text, separator)]
    quote_pattern[_QUOTE_PATTERN]
    disallowed_chars_pattern[_DISALLOWED_CHARS_PATTERN]
    duplicate_separator_pattern[_duplicate_separator_pattern]
    unicodedata_lib[unicodedata (Python Lib)]
    slugify_func --> unicodedata_lib
    slugify_func --> quote_pattern
    slugify_func --> disallowed_chars_pattern
    slugify_func --> duplicate_separator_pattern
```

### Components

*   **`slugify(text: str, separator: str = "_") -> str`**:
    *   **Purpose**: Converts a given string into a URL-safe slug. It performs several transformations:
        1.  Normalizes Unicode characters (`unicodedata.normalize`).
        2.  Encodes to ASCII, ignoring non-ASCII characters.
        3.  Converts the text to lowercase.
        4.  Removes quotation marks using `_QUOTE_PATTERN`.
        5.  Replaces disallowed characters (e.g., symbols, punctuation) with the specified `separator` using `_DISALLOWED_CHARS_PATTERN`.
        6.  Collapses multiple consecutive separators into a single one using `_duplicate_separator_pattern`.
        7.  Strips leading/trailing separators.
    *   **Parameters**:
        *   `text`: The input string to be slugified.
        *   `separator`: The character to use in place of whitespace and disallowed characters. Defaults to `_`.
    *   **Returns**: A clean, URL-safe string.

*   **`_QUOTE_PATTERN` (Internal Helper)**: A regular expression pattern used to identify and remove quotation marks from the input text during slugification.

*   **`_DISALLOWED_CHARS_PATTERN` (Internal Helper)**: A regular expression pattern used to identify and replace characters that are not allowed in a slug (e.g., special symbols, punctuation) with the specified separator.

*   **`_duplicate_separator_pattern(separator)` (Internal Helper)**: A function that generates a regular expression pattern to find and collapse multiple occurrences of the `separator` into a single one. This prevents slugs like `hello___world` and converts them to `hello_world`.

### External Dependencies

*   **`unicodedata` (Python Standard Library)**: Used by the `slugify` function to normalize Unicode characters, ensuring consistent character representation before further processing.

## How the Module Fits into the Overall System
The `string_formatting` module is a fundamental utility within the `crewai_utilities` package. It specifically resides under `data_serialization_and_formatting`, highlighting its role in preparing string data for various uses across the CrewAI system.

Its `slugify` function is critical for:
*   **Generating Clean Identifiers**: Creating human-readable and machine-compatible identifiers for tasks, agents, or file names.
*   **URL Construction**: Ensuring that any dynamically generated URLs are valid and free of problematic characters.
*   **Data Normalization**: Providing a standardized way to format strings, which can be important for search functionality, logging, or integration with external systems that have strict naming conventions.

By providing robust string manipulation, this module supports other components in `crewai_utilities` and beyond, contributing to the overall stability and interoperability of the CrewAI framework. For instance, other utility modules might rely on `slugify` to process user inputs or internal labels before they are used in file paths or database keys.
