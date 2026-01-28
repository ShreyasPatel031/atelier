# Utilities Module Documentation

The `utilities` module provides essential utility functions and classes used across the HTTPX library. Currently, its primary component is `URLPattern`, which facilitates flexible URL matching for various internal functionalities, such as proxy configurations.

## Core Components

### `URLPattern`

The `URLPattern` class is designed to match URLs against predefined patterns, supporting wildcards for schemes and hostnames. This is particularly useful for scenarios requiring flexible URL matching, such as determining which proxy to use for a given request.

**Key Features:**

- **Wildcard Matching:** Supports "all://" for schemes and "*" or "*.domain" for hostnames.
- **Priority-based Sorting:** Allows sorting URL patterns from most specific to least specific, ensuring correct matching order.

**Example Usage (from docstring):**

```python
# Wildcard matching...
>>> pattern = URLPattern("all://")
>>> pattern.matches(httpx.URL("http://example.com"))
True

# Witch scheme matching...
>>> pattern = URLPattern("https://")
>>> pattern.matches(httpx.URL("https://example.com"))
True
>>> pattern.matches(httpx.URL("http://example.com"))
False

# With domain matching...
>>> pattern = URLPattern("https://example.com")
>>> pattern.matches(httpx.URL("https://example.com"))
True
>>> pattern.matches(httpx.URL("http://example.com"))
False
>>> pattern.matches(httpx.URL("https://other.com"))
False

# Wildcard scheme, with domain matching...
>>> pattern = URLPattern("all://example.com")
>>> pattern.matches(httpx.URL("https://example.com"))
True
>>> pattern.matches(httpx.URL("http://example.com"))
True
>>> pattern.matches(httpx.URL("https://other.com"))
False

# With port matching...
>>> pattern = URLPattern("https://example.com:1234")
>>> pattern.matches(httpx.URL("https://example.com:1234"))
True
>>> pattern.matches(httpx.URL("https://example.com"))
False
```

## Architecture Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "url_pattern", "label": "URLPattern", "type": "component", "link": null},
        {"id": "url_module", "label": "URL (from urls module)", "type": "external", "link": "urls.md"}
    ],
    "edges": [
        {"source": "url_pattern", "target": "url_module"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    url_pattern[URLPattern]
    url_module[URL (from urls module)]

    url_pattern --> url_module
```
