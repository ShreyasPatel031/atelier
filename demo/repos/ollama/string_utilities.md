# string_utilities Module Documentation

## Introduction

The `string_utilities` module provides a collection of essential utility functions for efficient string manipulation within the `llama.cpp` project. It offers core functionalities such as removing suffixes from strings and partially finding stop words, which are crucial for text processing tasks like tokenization and output formatting.

## Architecture and Component Relationships

This module focuses on low-level string operations, designed to be highly efficient and directly support more complex text processing logic found in its parent modules. It interacts with other string manipulation utilities to ensure robust and consistent string handling.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "string_remove_suffix", "label": "string_remove_suffix", "type": "component", "link": null},
        {"id": "string_find_partial_stop", "label": "string_find_partial_stop", "type": "component", "link": null},
        {"id": "string_ends_with", "label": "string_ends_with (Helper)", "type": "component", "link": null},
        {"id": "string_processing", "label": "string_processing", "type": "external", "link": "string_processing.md"}
    ],
    "edges": [
        {"source": "string_remove_suffix", "target": "string_ends_with"},
        {"source": "string_find_partial_stop", "target": "string_ends_with"},
        {"source": "string_processing", "target": "string_remove_suffix"},
        {"source": "string_processing", "target": "string_find_partial_stop"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    string_remove_suffix[string_remove_suffix]
    string_find_partial_stop[string_find_partial_stop]
    string_ends_with[string_ends_with (Helper)]
    string_processing[string_processing]

    string_remove_suffix --> string_ends_with
    string_find_partial_stop --> string_ends_with
    string_processing --> string_remove_suffix
    string_processing --> string_find_partial_stop
```

### Core Components

#### `string_remove_suffix`

```cpp
bool string_remove_suffix(std::string & str, const std::string_view & suffix) {
    bool has_suffix = string_ends_with(str, suffix);
    if (has_suffix) {
        str = str.substr(0, str.size() - suffix.size());
    }
    return has_suffix;
}
```

This function attempts to remove a specified `suffix` from the end of a given string `str`. It first checks if the string indeed ends with the suffix using `string_ends_with`. If it does, the suffix is removed, and `true` is returned; otherwise, the string remains unchanged, and `false` is returned. This utility is crucial for cleaning up strings and normalizing text by ensuring specific endings are not present.

#### `string_find_partial_stop`

```cpp
size_t string_find_partial_stop(const std::string_view & str, const std::string_view & stop) {
    if (!str.empty() && !stop.empty()) {
        const char text_last_char = str.back();
        for (int64_t char_index = stop.size() - 1; char_index >= 0; char_index--) {
            if (stop[char_index] == text_last_char) {
                const auto current_partial = stop.substr(0, char_index + 1);
                if (string_ends_with(str, current_partial)) {
                    return str.size() - char_index - 1;
                }
            }
        }
    }

    return std::string::npos;
}
```

The `string_find_partial_stop` function identifies if a given string `str` partially ends with a specified `stop` string. This is particularly useful in scenarios where a complete stop word might not yet be generated, but a partial match indicates a potential stopping point. It iterates backward through the `stop` string, checking for partial matches against the end of `str` using `string_ends_with`. If a partial stop is found, it returns the index in `str` where the partial stop begins; otherwise, it returns `std::string::npos`. This function is vital for real-time text generation and processing where output needs to be truncated or controlled based on partial matches.

## Integration with the Overall System

The `string_utilities` module is a fundamental building block within the [llama_cpp_common](llama_cpp_common.md) library, specifically nested under [common_utils](common_utils.md) -> [string_manipulation](string_manipulation.md) -> [string_processing](string_processing.md). It provides the low-level string operations that are leveraged by higher-level components for tasks such as:

*   **Tokenization**: Helping to identify and process tokens by cleaning up their boundaries.
*   **Text Generation Control**: Assisting in detecting completion criteria or partial stop sequences during text generation, ensuring coherent and controlled output.
*   **Data Preprocessing**: Providing basic string sanitization for various inputs within the `llama.cpp` ecosystem.

By centralizing these common string operations, the module ensures consistency and reduces code duplication across the project, making the overall system more maintainable and robust.
