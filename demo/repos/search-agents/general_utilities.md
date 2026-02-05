# general_utilities

## Introduction
The `general_utilities` module serves as a repository for generic utility functions that support various operations across the system, particularly within the evaluation harness. This module aims to provide reusable tools that simplify common tasks, promoting code consistency and reducing redundancy.

## Core Functionality
The primary component within this module is `get_query_text_lowercase`, which is designed to extract and normalize text content from web pages.

### `get_query_text_lowercase`
This function retrieves the text content of a specified HTML element on a web page and converts it to lowercase. This normalization is crucial for case-insensitive comparisons and consistent data processing during evaluations.

**Path:** `evaluation_harness/helper_functions.py`

```python
def get_query_text_lowercase(page: Page | PseudoPage, selector: str) -> str:
    """Get the lowercase text content of the element matching the given selector."""
    return get_query_text(page, selector).lower()
```

## Architecture and Component Relationships
The `general_utilities` module is a leaf module, providing a specific utility function. It depends on a core text extraction function, `get_query_text`, which is part of the broader `evaluation_harness.helper_functions` suite, falling under the [evaluation_helpers module](evaluation_helpers.md).

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "get_query_text_lowercase", "label": "get_query_text_lowercase", "type": "component", "link": null},
        {"id": "page_text_extraction_base", "label": "Page Text Extraction Base (get_query_text)", "type": "external", "link": "evaluation_helpers.md"}
    ],
    "edges": [
        {"source": "get_query_text_lowercase", "target": "page_text_extraction_base"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    get_query_text_lowercase[get_query_text_lowercase]
    page_text_extraction_base[Page Text Extraction Base (get_query_text)]
    get_query_text_lowercase --> page_text_extraction_base
```

## How the Module Fits into the Overall System
The `general_utilities` module, through functions like `get_query_text_lowercase`, plays a supporting role in various evaluation and automation tasks. It ensures that textual data extracted from web interfaces is consistently formatted, which is vital for accurate comparisons and assertions within the [evaluators module](evaluators.md) and other parts of the [evaluation_harness](evaluation_harness.md) (not a direct module, but conceptually refers to the parent component). For instance, when validating if expected text is present on a page, using a lowercase version of the extracted text prevents issues due to case mismatches.
