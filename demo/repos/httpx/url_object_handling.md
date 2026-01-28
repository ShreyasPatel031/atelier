# Module: `url_object_handling`

The `url_object_handling` module is a crucial part of the `httpx._urls` package, focusing on the robust and comprehensive representation and manipulation of URLs within the HTTPX library. Its primary component, the `URL` class, provides a structured and normalized interface for working with URL components, ensuring consistency and ease of use when constructing, parsing, and modifying URLs.

## Core Component: `httpx._urls.URL`

The `URL` class is a powerful abstraction for handling Uniform Resource Locators. It encapsulates the various parts of a URL (scheme, userinfo, host, port, path, query, fragment) and provides convenient properties and methods for accessing and modifying them. The class performs significant normalization, such as lowercasing schemes and hosts, and IDNA encoding for internationalized domain names.

### Purpose and Features

The `URL` class serves several key purposes:

*   **Structured Representation:** Provides a clear and organized way to represent URLs, breaking them down into their constituent parts.
*   **Normalization:** Automatically normalizes various URL components, such as scheme and host casing, IDNA encoding/decoding, and default port handling, adhering to WHATWG URL Living Standard specifications.
*   **Immutability (via `copy_with`):** While instances themselves are mutable, modification methods return new `URL` instances, promoting predictable behavior.
*   **Convenient Accessors:** Offers properties to easily access individual URL components, both in their raw byte form and decoded string form.
*   **URL Manipulation:** Includes methods for joining URLs, and manipulating query parameters.

### Constructor

The `URL` class can be initialized from a string, another `URL` instance, or by specifying individual URL components as keyword arguments.

```python
# From a string
url = httpx.URL("HTTPS://jo%40email.com:a%20secret@müller.de:1234/pa%20th?search=ab#anchorlink")

# From an existing URL and modifying components
new_url = url.copy_with(scheme="http", port=8080)
```

**Supported Keyword Arguments:**

*   `scheme` (str): The URL scheme (e.g., "http", "https").
*   `username` (str): The username part of the userinfo.
*   `password` (str): The password part of the userinfo.
*   `userinfo` (bytes): The raw userinfo bytes.
*   `host` (str): The hostname.
*   `port` (int): The port number.
*   `netloc` (bytes): The raw network location (host and port).
*   `path` (str): The URL path.
*   `query` (bytes): The raw query string bytes (without leading '?').
*   `raw_path` (bytes): The raw path and query bytes.
*   `fragment` (str): The URL fragment (without leading '#').
*   `params` (object): A mapping for query parameters, converted to `QueryParams`. (See [query_parameters.md](query_parameters.md) for more details).

### Properties

The `URL` class exposes various properties for accessing different parts of the URL:

*   **`scheme`** (`str`): The URL scheme (e.g., "http", "https"), always lowercased.
*   **`raw_scheme`** (`bytes`): The raw bytes representation of the scheme.
*   **`userinfo`** (`bytes`): The raw URL userinfo bytestring (e.g., `b"jo%40email.com:a%20secret"`).
*   **`username`** (`str`): The URL username, URL-decoded (e.g., "jo@email.com").
*   **`password`** (`str`): The URL password, URL-decoded (e.g., "a secret").
*   **`host`** (`str`): The URL host, lowercased and IDNA decoded for internationalized domain names (e.g., "müller.de").
*   **`raw_host`** (`bytes`): The raw bytes representation of the host, lowercased and IDNA encoded (e.g., `b"xn--mller-kva.de"`).
*   **`port`** (`int | None`): The URL port. Default ports (80 for http, 443 for https, etc.) are normalized to `None`.
*   **`netloc`** (`bytes`): Either `<host>` or `<host>:<port>` as IDNA-encoded bytes, suitable for "Host" header.
*   **`path`** (`str`): The URL path, URL-decoded and excluding the query string (e.g., "/pa th").
*   **`query`** (`bytes`): The URL query string as raw bytes, excluding the leading `b"?"` (e.g., `b"search=ab"`).
*   **`params`** (`QueryParams`): The URL query parameters parsed into an immutable `QueryParams` instance. (Refer to [query_parameters.md](query_parameters.md) for details).
*   **`raw_path`** (`bytes`): The complete URL path and query string as raw bytes, used as the target for HTTP requests (e.g., `b"/pa%20th?search=ab"`).
*   **`fragment`** (`str`): The URL fragment, URL-decoded and without the leading `'#'`.
*   **`is_absolute_url`** (`bool`): Returns `True` if the URL has a scheme and host.
*   **`is_relative_url`** (`bool`): Returns `True` if the URL does not have a scheme and host.
*   **`raw`** (`tuple[bytes, bytes, int, bytes]`): **(Deprecated)** Provides a named tuple of `(raw_scheme, raw_host, port, raw_path)`.

### Methods

*   **`copy_with(**kwargs: typing.Any) -> URL`**:
    Returns a new `URL` instance with specified components altered. Accepts the same keyword arguments as the constructor.
    ```python
    url = httpx.URL("https://www.example.com").copy_with(username="jo@gmail.com", password="a secret")
    assert url == "https://jo%40email.com:a%20secret@www.example.com"
    ```
*   **`copy_set_param(key: str, value: typing.Any = None) -> URL`**:
    Returns a new `URL` with the specified query parameter `key` set to `value`.
*   **`copy_add_param(key: str, value: typing.Any = None) -> URL`**:
    Returns a new `URL` with the specified query parameter `key` added with `value`.
*   **`copy_remove_param(key: str) -> URL`**:
    Returns a new `URL` with the specified query parameter `key` removed.
*   **`copy_merge_params(params: QueryParamTypes) -> URL`**:
    Returns a new `URL` with the given `params` merged into the existing query parameters.
*   **`join(url: URL | str) -> URL`**:
    Returns an absolute URL by joining the current URL as a base with the provided relative or absolute URL.
    ```python
    base_url = httpx.URL("https://www.example.com/test")
    joined_url = base_url.join("/new/path")
    assert joined_url == "https://www.example.com/new/path"
    ```
*   **`__hash__()`, `__eq__()`, `__str__()`, `__repr__()`**:
    Implementations for hashing, equality comparison, string representation, and developer-friendly string representation of the `URL` object.

## Architecture

The `url_object_handling` module, specifically the `URL` class, relies on an internal `_uri_reference` which is an instance of `httpx._urlparse.ParseResult` for its core parsing logic and component storage. It also extensively uses the `httpx._urls.QueryParams` class for managing URL query parameters.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "url_object", "label": "URL", "type": "component", "link": null},
        {"id": "query_params", "label": "QueryParams", "type": "external", "link": "query_parameters.md"},
        {"id": "parse_result", "label": "ParseResult", "type": "external", "link": "url_parsing_result.md"}
    ],
    "edges": [
        {"source": "url_object", "target": "query_params"},
        {"source": "url_object", "target": "parse_result"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    url_object[URL]
    query_params[QueryParams]
    parse_result[ParseResult]
    url_object --> query_params
    url_object --> parse_result
```

### Module Relationships

The `url_object_handling` module is a sub-module of `url_parsing_and_manipulation`, which itself is part of the broader `urls` module.

*   It depends on `query_parameters` for handling URL query string logic. The `URL.params` property returns an instance of `QueryParams` (defined in `httpx._urls.QueryParams`, documented in [query_parameters.md](query_parameters.md)).
*   It internally uses `ParseResult` (from `httpx._urlparse.ParseResult`, documented in [url_parsing_result.md](url_parsing_result.md)) to store the parsed components of a URL. The `URL` class wraps and enhances `ParseResult` with additional normalization and convenience methods.

This module provides the fundamental URL object used throughout the HTTPX library, ensuring consistent and correct URL handling for all HTTP requests and responses. It serves as a central point for URL construction, parsing, and modification.