# citation_conversion Module Documentation

## Introduction

The `citation_conversion` module, part of the `dspy.adapters.types.citation` package, is responsible for the critical task of converting citation data between different structured formats. It primarily facilitates the transformation of raw citation information, typically provided as lists of dictionaries, into a standardized `Citations` object representation and vice-versa. This ensures consistent handling and manipulation of citation data throughout the system.

## Purpose and Core Functionality

This module provides essential utilities for structuring and destructuring citation data. Its core functions enable seamless integration of external citation data sources and preparation of internal citation objects for external consumption or storage.

### `from_dict_list(citations_dicts: list[dict[str, Any]])`

This class method converts a list of dictionaries, where each dictionary represents a single citation, into a `Citations` object. This is particularly useful when ingesting citation data from various sources that might provide information in a dictionary-based format.

**Key Features:**
*   **Input Flexibility:** Accepts a list of dictionaries, each containing citation attributes like `cited_text`, `document_index`, `document_title`, `start_char_index`, `end_char_index`, and `supported_text`.
*   **Object Instantiation:** Internally constructs `Citations.Citation` objects for each dictionary item and aggregates them into a `Citations` instance.

**Example:**
```python
citations_dict = [
    {
        "cited_text": "The sky is blue",
        "document_index": 0,
        "document_title": "Weather Guide",
        "start_char_index": 0,
        "end_char_index": 15,
        "supported_text": "The sky was blue yesterday."
    }
]
citations = Citations.from_dict_list(citations_dict)
```

### `format()`

This instance method converts the internal `Citations` object back into a list of dictionaries. This is crucial for outputting citation data in a universally understood format, such as for serialization, API responses, or storage.

**Key Features:**
*   **Serialization:** Transforms structured `Citations` objects into a list of dictionaries, making them easy to serialize (e.g., to JSON) or exchange with other systems.
*   **Consistency:** Ensures that the output format adheres to a consistent dictionary structure, aligning with typical data exchange patterns.

**Example:**
```python
# Assuming `citations` is a Citations object
formatted_citations = citations.format()
print(formatted_citations)
# Output:
# [
#     {
#         'cited_text': 'The sky is blue',
#         'document_index': 0,
#         'document_title': 'Weather Guide',
#         'start_char_index': 0,
#         'end_char_index': 15,
#         'supported_text': 'The sky was blue yesterday.'
#     }
# ]
```

## Architecture and Component Relationships

The `citation_conversion` module acts as a bridge between raw dictionary-based citation data and the internal `Citations` object representation. Its functions directly interact with the `Citations` data structure to perform the necessary transformations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "from_dict_list", "label": "from_dict_list", "type": "component", "link": null},
        {"id": "format_func", "label": "format()", "type": "component", "link": null},
        {"id": "citation_object_repr", "label": "Citations Object", "type": "component", "link": null},
        {"id": "external_dict_list", "label": "List of Dictionaries", "type": "component", "link": null},
        {"id": "citation_validation", "label": "citation_validation", "type": "external", "link": "citation_validation.md"}
    ],
    "edges": [
        {"source": "external_dict_list", "target": "from_dict_list"},
        {"source": "from_dict_list", "target": "citation_object_repr"},
        {"source": "citation_object_repr", "target": "format_func"},
        {"source": "format_func", "target": "external_dict_list"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    external_dict_list[List of Dictionaries]
    from_dict_list[from_dict_list]
    citation_object_repr[Citations Object]
    format_func[format()]
    citation_validation[citation_validation]

    external_dict_list --> from_dict_list
    from_dict_list --> citation_object_repr
    citation_object_repr --> format_func
    format_func --> external_dict_list
```

## How the Module Fits into the Overall System

The `citation_conversion` module is a crucial part of the `dspy.adapters` ecosystem, specifically within the `custom_types` and `citation_handling` sub-modules. It provides the foundational capabilities for consistently managing citation data, which is vital for applications requiring factual grounding, verification, or attribution.

It works in conjunction with the [citation_validation](citation_validation.md) module, which ensures the integrity and correctness of citation data. Together, these modules ensure that citation information is not only correctly structured but also validated before being used by other parts of the system. This integration enhances the reliability and trustworthiness of information processed by dspy applications.

This module's ability to abstract away the complexities of citation data formatting allows other modules, such as various `dspy_adapters` implementations, to interact with citation information in a standardized `Citations` object format, promoting modularity and reducing potential errors from inconsistent data representations.