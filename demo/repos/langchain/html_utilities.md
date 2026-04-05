# `html_utilities`

The `html_utilities` module, located within `core_utils.general_utilities`, provides essential functions for processing HTML content. Its primary purpose is to simplify the extraction and normalization of links from raw HTML, making it easier to navigate and analyze web content within the system.

## Module Architecture

This module is a leaf module, focusing on a specific set of utility functions related to HTML processing. It encapsulates the logic for identifying and transforming various types of URLs into absolute paths, ensuring consistency and reliability when dealing with web links.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "extract_sub_links", "label": "extract_sub_links", "type": "component", "link": null},
        {"id": "find_all_links", "label": "find_all_links (internal helper)", "type": "component", "link": null},
        {"id": "urllib_parse", "label": "urllib.parse (Python stdlib)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "extract_sub_links", "target": "find_all_links"},
        {"source": "extract_sub_links", "target": "urllib_parse"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    extract_sub_links[extract_sub_links]
    find_all_links[find_all_links (internal helper)]
    urllib_parse(urllib.parse (Python stdlib))

    extract_sub_links --> find_all_links
    extract_sub_links --> urllib_parse
```

## Core Components

### `extract_sub_links`

The `extract_sub_links` function is the core component of this module. It is responsible for parsing an HTML string, identifying all contained links, and converting them into their absolute URL forms. This function is critical for any operation that requires reliable link extraction, such as web crawling, content analysis, or building navigation structures.

**Purpose:**

Extracts all links from a raw HTML string and converts them into absolute paths. It provides flexible options to control which links are included or excluded based on their origin and prefixes.

**Parameters:**

*   `raw_html` (`str`): The original HTML content from which to extract links.
*   `url` (`str`): The URL of the HTML document itself, used as a reference for resolving relative links.
*   `base_url` (`str | None`, optional): An optional base URL to check for outside links. If not provided, `url` is used.
*   `pattern` (`str | re.Pattern | None`, optional): A regular expression pattern to use for extracting links. If not provided, a default mechanism (likely `find_all_links`) is used.
*   `prevent_outside` (`bool`, optional): If `True`, external links that are not children of the `base_url` are ignored. Defaults to `True`.
*   `exclude_prefixes` (`Sequence[str]`, optional): A sequence of string prefixes. Any URLs starting with one of these prefixes will be excluded from the results. Defaults to an empty tuple.
*   `continue_on_failure` (`bool`, optional): If `True`, the function will log a warning and continue if an error occurs while processing a link. If `False`, an exception will be raised. Defaults to `False`.

**Returns:**

*   `list[str]`: A list of absolute paths to the extracted sub-links.

**Key Functionality:**

1.  **Link Discovery:** Utilizes an internal helper function (`find_all_links`) to locate all potential links within the `raw_html` based on the provided `pattern` or a default method.
2.  **Absolute Path Conversion:** Transforms relative links, protocol-relative links (e.g., `//example.com/path`), and already absolute links into a consistent absolute URL format using `urllib.parse.urljoin` and `urllib.parse.urlparse`.
3.  **Filtering:**
    *   **Prefix Exclusion:** Filters out links that match any of the `exclude_prefixes`.
    *   **Outside Link Prevention:** If `prevent_outside` is `True`, it ensures that only links belonging to the same domain or path hierarchy as the `base_url` are returned.
4.  **Error Handling:** Provides an option (`continue_on_failure`) to gracefully handle errors during link processing, either by logging and continuing or by raising an exception.

## Relationships to Other Modules

The `html_utilities` module is part of the `core_utils.general_utilities` package. It provides general-purpose utility functions that can be leveraged by other modules across the `core` library that need to interact with and process HTML content. For instance, document loaders or web scrapers might use `extract_sub_links` to discover navigable links. It does not have direct dependencies on other specific functional modules within the system, making it a foundational utility.

For other general utility functions, refer to the [general_utilities](general_utilities.md) module documentation.
