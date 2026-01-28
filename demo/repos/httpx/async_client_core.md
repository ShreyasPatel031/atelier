# `async_client_core` Module Documentation

The `async_client_core` module is a fundamental part of the `httpx` library, providing the core asynchronous HTTP client functionality. It is responsible for handling all aspects of making asynchronous HTTP requests, including connection pooling, HTTP/2 support, redirects, cookie persistence, and authentication.

## Core Functionality

The primary component of this module is the `AsyncClient` class.

### `AsyncClient`

The `AsyncClient` class is an asynchronous HTTP client designed for making requests in an `async`/`await` context. It offers a comprehensive set of features for robust and efficient asynchronous communication.

**Key Features:**

*   **Asynchronous Operations**: All network operations are non-blocking, making it suitable for high-concurrency applications.
*   **Connection Pooling**: Efficiently reuses connections to remote hosts, reducing overhead.
*   **HTTP/2 Support**: Can be configured to use HTTP/2 for improved performance.
*   **Redirect Handling**: Automatically follows HTTP redirects.
*   **Cookie Persistence**: Manages cookies across requests, maintaining session state.
*   **Authentication**: Supports various authentication schemes.
*   **Timeouts and Limits**: Configurable timeouts and connection limits to prevent resource exhaustion.
*   **Proxy Support**: Allows routing traffic through HTTP proxies.
*   **Mounts**: Provides the ability to mount different transports for specific URL patterns.

**Initialization Parameters:**

The `AsyncClient` can be initialized with a wide range of parameters to configure its behavior:

*   `auth`: An authentication class (see [authentication.md](authentication.md)).
*   `params`: Query parameters to include in request URLs.
*   `headers`: HTTP headers to include in requests.
*   `cookies`: Cookie items to include in requests.
*   `verify`: SSL verification settings.
*   `cert`: Client-side SSL certificate.
*   `http1`: Enable HTTP/1.1 support (default `True`).
*   `http2`: Enable HTTP/2 support (default `False`). Requires `h2` package.
*   `proxy`: A proxy URL (see [configuration.md](configuration.md)).
*   `mounts`: A mapping of URL patterns to `AsyncBaseTransport` instances for custom transport handling.
*   `timeout`: Timeout configuration (see [configuration.md](configuration.md)).
*   `follow_redirects`: Whether to automatically follow redirects.
*   `limits`: Connection limits configuration (see [configuration.md](configuration.md)).
*   `max_redirects`: Maximum number of redirects to follow.
*   `event_hooks`: Event hooks for request and response processing.
*   `base_url`: A base URL for all requests made by the client.
*   `transport`: A custom asynchronous transport (see [transports.md](transports.md)).
*   `trust_env`: Whether to use environment variables for configuration (e.g., proxy settings).
*   `default_encoding`: Default encoding for response text.

**Methods:**

*   `request(method, url, ...)`: Builds and sends an HTTP request. This is the generic method that other HTTP verb-specific methods (like `get`, `post`) call internally.
*   `stream(method, url, ...)`: An asynchronous context manager that allows streaming the response body, preventing the entire response from being loaded into memory.
*   `send(request, ...)`: Sends an already built `Request` object. This method handles the actual transmission of the request and reception of the raw response.
*   `get(...)`, `options(...)`, `head(...)`, `post(...)`, `put(...)`, `patch(...)`, `delete(...)`: Convenience methods for sending requests corresponding to specific HTTP verbs.
*   `aclose()`: Closes the client's transport and any mounted proxy transports, releasing resources.
*   `__aenter__()`, `__aexit__()`: Asynchronous context manager methods allowing `AsyncClient` instances to be used with `async with` statements.

## Architecture and Component Relationships

The `AsyncClient` relies on several internal helper methods and interacts with various external modules to perform its operations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "async_client", "label": "AsyncClient", "type": "component", "link": null},
        {"id": "_init_transport", "label": "_init_transport()", "type": "component", "link": null},
        {"id": "_init_proxy_transport", "label": "_init_proxy_transport()", "type": "component", "link": null},
        {"id": "_transport_for_url", "label": "_transport_for_url()", "type": "component", "link": null},
        {"id": "_send_single_request", "label": "_send_single_request()", "type": "component", "link": null},
        {"id": "_send_handling_redirects", "label": "_send_handling_redirects()", "type": "component", "link": null},
        {"id": "_send_handling_auth", "label": "_send_handling_auth()", "type": "component", "link": null},
        {"id": "request_method", "label": "request()", "type": "component", "link": null},
        {"id": "send_method", "label": "send()", "type": "component", "link": null},
        {"id": "base_client", "label": "BaseClient", "type": "external", "link": "client_base.md"},
        {"id": "auth", "label": "Auth", "type": "external", "link": "authentication.md"},
        {"id": "response", "label": "Response", "type": "external", "link": "models.md"},
        {"id": "request_model", "label": "Request", "type": "external", "link": "models.md"},
        {"id": "cookies", "label": "Cookies", "type": "external", "link": "models.md"},
        {"id": "async_base_transport", "label": "AsyncBaseTransport", "type": "external", "link": "transports.md"},
        {"id": "async_http_transport", "label": "AsyncHTTPTransport", "type": "external", "link": "transports.md"},
        {"id": "url", "label": "URL", "type": "external", "link": "urls.md"},
        {"id": "url_pattern", "label": "URLPattern", "type": "external", "link": "utilities.md"},
        {"id": "timeout_config", "label": "Timeout", "type": "external", "link": "configuration.md"},
        {"id": "limits_config", "label": "Limits", "type": "external", "link": "configuration.md"},
        {"id": "proxy_config", "label": "Proxy", "type": "external", "link": "configuration.md"},
        {"id": "client_state", "label": "ClientState", "type": "external", "link": "client_base.md"},
        {"id": "use_client_default", "label": "UseClientDefault", "type": "external", "link": "client_base.md"},
        {"id": "async_byte_stream", "label": "AsyncByteStream", "type": "external", "link": "types.md"},
        {"id": "bound_async_stream", "label": "BoundAsyncStream", "type": "external", "link": "async_stream_handler.md"}
    ],
    "edges": [
        {"source": "async_client", "target": "base_client"},
        {"source": "async_client", "target": "_init_transport"},
        {"source": "async_client", "target": "_init_proxy_transport"},
        {"source": "async_client", "target": "_transport_for_url"},
        {"source": "async_client", "target": "request_method"},
        {"source": "async_client", "target": "send_method"},
        {"source": "_init_transport", "target": "async_base_transport"},
        {"source": "_init_transport", "target": "async_http_transport"},
        {"source": "_init_transport", "target": "timeout_config"},
        {"source": "_init_transport", "target": "limits_config"},
        {"source": "_init_proxy_transport", "target": "async_base_transport"},
        {"source": "_init_proxy_transport", "target": "async_http_transport"},
        {"source": "_init_proxy_transport", "target": "timeout_config"},
        {"source": "_init_proxy_transport", "target": "limits_config"},
        {"source": "_init_proxy_transport", "target": "proxy_config"},
        {"source": "_transport_for_url", "target": "url"},
        {"source": "_transport_for_url", "target": "url_pattern"},
        {"source": "send_method", "target": "_send_handling_auth"},
        {"source": "send_method", "target": "client_state"},
        {"source": "send_method", "target": "use_client_default"},
        {"source": "send_method", "target": "request_model"},
        {"source": "_send_handling_auth", "target": "auth"},
        {"source": "_send_handling_auth", "target": "_send_handling_redirects"},
        {"source": "_send_handling_auth", "target": "request_model"},
        {"source": "_send_handling_auth", "target": "response"},
        {"source": "_send_handling_redirects", "target": "_send_single_request"},
        {"source": "_send_handling_redirects", "target": "request_model"},
        {"source": "_send_handling_redirects", "target": "response"},
        {"source": "_send_single_request", "target": "_transport_for_url"},
        {"source": "_send_single_request", "target": "request_model"},
        {"source": "_send_single_request", "target": "response"},
        {"source": "_send_single_request", "target": "async_byte_stream"},
        {"source": "_send_single_request", "target": "bound_async_stream"},
        {"source": "_send_single_request", "target": "cookies"}
    ]
}
-->
```mermaid
graph TD
    async_client[AsyncClient]
    _init_transport[_init_transport()]
    _init_proxy_transport[_init_proxy_transport()]
    _transport_for_url[_transport_for_url()]
    _send_single_request[_send_single_request()]
    _send_handling_redirects[_send_handling_redirects()]
    _send_handling_auth[_send_handling_auth()]
    request_method[request()]
    send_method[send()]
    base_client[BaseClient]:::external
    auth[Auth]:::external
    response[Response]:::external
    request_model[Request]:::external
    cookies[Cookies]:::external
    async_base_transport[AsyncBaseTransport]:::external
    async_http_transport[AsyncHTTPTransport]:::external
    url[URL]:::external
    url_pattern[URLPattern]:::external
    timeout_config[Timeout]:::external
    limits_config[Limits]:::external
    proxy_config[Proxy]:::external
    client_state[ClientState]:::external
    use_client_default[UseClientDefault]:::external
    async_byte_stream[AsyncByteStream]:::external
    bound_async_stream[BoundAsyncStream]:::external

    async_client --> base_client
    async_client --> _init_transport
    async_client --> _init_proxy_transport
    async_client --> _transport_for_url
    async_client --> request_method
    async_client --> send_method
    _init_transport --> async_base_transport
    _init_transport --> async_http_transport
    _init_transport --> timeout_config
    _init_transport --> limits_config
    _init_proxy_transport --> async_base_transport
    _init_proxy_transport --> async_http_transport
    _init_proxy_transport --> timeout_config
    _init_proxy_transport --> limits_config
    _init_proxy_transport --> proxy_config
    _transport_for_url --> url
    _transport_for_url --> url_pattern
    send_method --> _send_handling_auth
    send_method --> client_state
    send_method --> use_client_default
    send_method --> request_model
    _send_handling_auth --> auth
    _send_handling_auth --> _send_handling_redirects
    _send_handling_auth --> request_model
    _send_handling_auth --> response
    _send_handling_redirects --> _send_single_request
    _send_handling_redirects --> request_model
    _send_handling_redirects --> response
    _send_single_request --> _transport_for_url
    _send_single_request --> request_model
    _send_single_request --> response
    _send_single_request --> async_byte_stream
    _send_single_request --> bound_async_stream
    _send_single_request --> cookies

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

**Internal Components:**

*   `_init_transport()`: Initializes the underlying asynchronous transport for sending requests.
*   `_init_proxy_transport()`: Initializes a specific transport for proxy connections.
*   `_transport_for_url()`: Determines which transport (default or mounted proxy) to use for a given URL.
*   `_send_single_request()`: Handles the actual sending of a single HTTP request without considering redirects or authentication.
*   `_send_handling_redirects()`: Manages the redirection logic, recursively calling `_send_single_request`.
*   `_send_handling_auth()`: Orchestrates the authentication flow, potentially making multiple requests.
*   `request()`: Public interface for building and sending requests.
*   `send()`: Public interface for sending a prepared `Request` object.

**External Dependencies:**

*   **`client_base.md`**: `AsyncClient` inherits from `BaseClient` and utilizes `ClientState` and `UseClientDefault`.
*   **`authentication.md`**: Interacts with `Auth` classes for handling authentication flows.
*   **`models.md`**: Works with `Request`, `Response`, and `Cookies` objects for managing HTTP messages and state.
*   **`transports.md`**: Uses `AsyncBaseTransport` and `AsyncHTTPTransport` for low-level network communication.
*   **`urls.md`**: Employs `URL` for request URLs.
*   **`utilities.md`**: Uses `URLPattern` for matching URL mounts.
*   **`configuration.md`**: Relies on `Timeout`, `Limits`, and `Proxy` objects for client configuration.
*   **`types.md`**: Utilizes `AsyncByteStream` for asynchronous request and response bodies.
*   **`async_stream_handler.md`**: Wraps response streams with `BoundAsyncStream` for managing stream lifecycle.

## How it Fits into the Overall System

The `async_client_core` module, specifically the `AsyncClient`, serves as the primary asynchronous interface for developers interacting with HTTP services using `httpx`. It abstracts away the complexities of network programming, providing a high-level, user-friendly API for making concurrent HTTP requests. It builds upon the foundational `BaseClient` (from `client_base`) and integrates seamlessly with other `httpx` modules like `authentication`, `models`, `transports`, and `configuration` to deliver a complete and robust asynchronous HTTP client solution. This module is critical for any application requiring non-blocking HTTP communication.