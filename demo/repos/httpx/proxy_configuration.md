# `proxy_configuration` Module

The `proxy_configuration` module is a core component within the `httpx` configuration system, specifically designed to manage and encapsulate proxy settings. It provides a structured way to define and apply proxy details, including the proxy URL, authentication credentials, and custom headers.

## Core Functionality

The primary component of this module is the `Proxy` class, which serves as a comprehensive wrapper for all proxy-related configurations.

### `httpx._config.Proxy` Class

```python
class Proxy:
    def __init__(
        self,
        url: URL | str,
        *,
        ssl_context: ssl.SSLContext | None = None,
        auth: tuple[str, str] | None = None,
        headers: HeaderTypes | None = None,
    ) -> None:
    # ... (code omitted for brevity)
```

This class facilitates the creation of a proxy configuration object with the following key features:

*   **Initialization**: The constructor takes a proxy URL (as a string or `URL` object), an optional `ssl_context`, authentication tuple (`username`, `password`), and custom `headers`. It validates the proxy scheme, ensuring it is one of "http", "https", "socks5", or "socks5h". It also extracts authentication details from the URL if present.
*   **URL Handling**: It internally converts the `url` input into a `URL` object, stripping any authentication credentials from the URL itself and storing them separately in the `auth` attribute.
*   **Authentication**: The `auth` attribute stores proxy authentication credentials as a tuple of strings. The `raw_auth` property provides these credentials encoded as bytes, suitable for network requests.
*   **Headers**: Custom headers can be provided and are managed using the `Headers` object from the [models](models.md) module.
*   **SSL Context**: Allows for specifying a custom `ssl.SSLContext` for the proxy connection.

## Architecture and Component Relationships

The `proxy_configuration` module's `Proxy` class directly interacts with the `URL` component from the [urls](urls.md) module for parsing and manipulating proxy URLs, and the `Headers` component from the [models](models.md) module for handling custom proxy headers. It is a fundamental part of `network_configuration` which in turn is part of the `configuration` module.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "proxy_class", "label": "Proxy Class", "type": "component", "link": null},
        {"id": "url_module", "label": "URL (from urls)", "type": "external", "link": "urls.md"},
        {"id": "headers_module", "label": "Headers (from models)", "type": "external", "link": "models.md"},
        {"id": "ssl_context", "label": "ssl.SSLContext", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "proxy_class", "target": "url_module"},
        {"source": "proxy_class", "target": "headers_module"},
        {"source": "proxy_class", "target": "ssl_context"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    proxy_class[Proxy Class]
    url_module[URL (from urls)]
    headers_module[Headers (from models)]
    ssl_context[ssl.SSLContext]

    proxy_class --> url_module
    proxy_class --> headers_module
    proxy_class --> ssl_context
```

## Integration with the Overall System

The `proxy_configuration` module, through its `Proxy` class, is an integral part of the `httpx` library's networking capabilities. It is utilized by higher-level components within the [network_configuration](network_configuration.md) and [configuration](configuration.md) modules to establish and manage network connections through proxies. This ensures that HTTPX clients can be configured to route their traffic through specified proxy servers, supporting various authentication and secure communication requirements.