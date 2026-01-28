# wsgi_transport_details

## Introduction

The `wsgi_transport_details` module provides core components for integrating HTTPX with WSGI (Web Server Gateway Interface) applications. It defines a custom transport, `WSGITransport`, that allows HTTPX clients to make requests directly to a WSGI application, bypassing network I/O. This is particularly useful for testing WSGI applications or integrating them within a larger application without actual HTTP requests.

## Architecture and Component Relationships

This module contains two primary components: `WSGITransport` and `WSGIByteStream`.

The `WSGITransport` acts as a bridge between HTTPX requests and WSGI applications. It extends the `BaseTransport` from the [base_transports](base_transports.md) module, implementing the `handle_request` method to process HTTPX `Request` objects. It then translates these into the WSGI `environ` dictionary, invokes the WSGI application, and finally converts the WSGI response back into an HTTPX `Response`.

The `WSGIByteStream` is a crucial component for handling the response body from the WSGI application. It wraps the iterable response returned by a WSGI application and implements the `SyncByteStream` interface from the [types](types.md) module, allowing HTTPX to consume the response content synchronously.

The `WSGITransport` also interacts with `Request` and `Response` objects defined in the [models](models.md) module to process incoming HTTPX requests and construct outgoing HTTPX responses.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "wsgi_transport", "label": "WSGITransport", "type": "component", "link": null},
        {"id": "wsgi_byte_stream", "label": "WSGIByteStream", "type": "component", "link": null},
        {"id": "base_transport", "label": "BaseTransport", "type": "external", "link": "base_transports.md"},
        {"id": "sync_byte_stream", "label": "SyncByteStream", "type": "external", "link": "types.md"},
        {"id": "request_response", "label": "Request/Response (models)", "type": "external", "link": "models.md"}
    ],
    "edges": [
        {"source": "wsgi_transport", "target": "wsgi_byte_stream"},
        {"source": "wsgi_transport", "target": "base_transport"},
        {"source": "wsgi_byte_stream", "target": "sync_byte_stream"},
        {"source": "wsgi_transport", "target": "request_response"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    wsgi_transport[WSGITransport]
    wsgi_byte_stream[WSGIByteStream]
    base_transport[BaseTransport]
    sync_byte_stream[SyncByteStream]
    request_response[Request/Response (models)]

    wsgi_transport --> wsgi_byte_stream
    wsgi_transport --> base_transport
    wsgi_byte_stream --> sync_byte_stream
    wsgi_transport --> request_response
```

## Core Functionality

### `WSGITransport`

The `WSGITransport` class provides a custom transport mechanism to integrate directly with WSGI applications. It inherits from `BaseTransport` and overrides the `handle_request` method to implement the WSGI protocol.

**Initialization Arguments:**

*   `app` (WSGIApplication): The WSGI application to interact with.
*   `raise_app_exceptions` (bool): If `True` (default), exceptions raised by the WSGI application will be re-raised by the transport. Set to `False` for testing application error handling.
*   `script_name` (str): The root path on which the WSGI application should be mounted (e.g., `/submount`). Defaults to an empty string.
*   `remote_addr` (str): The client IP address to report in the WSGI `environ`. Defaults to `127.0.0.1`.
*   `wsgi_errors` (typing.TextIO | None): A file-like object to use for `wsgi.errors`. Defaults to `sys.stderr`.

**`handle_request(request: Request) -> Response`**

This method is the core of `WSGITransport`. It performs the following steps:

1.  **Reads Request Content:** Ensures the incoming `httpx.Request` body is fully read.
2.  **Prepares WSGI `environ`:** Constructs the standard WSGI `environ` dictionary using information from the `httpx.Request` (method, URL, headers, content, etc.) and the transport's configuration (`script_name`, `remote_addr`).
3.  **Invokes WSGI Application:** Calls the provided WSGI `app` with the prepared `environ` and a `start_response` callable.
4.  **Processes WSGI Response:**
    *   Captures the status and response headers passed to `start_response`.
    *   If `raise_app_exceptions` is `True` and an exception occurred in the WSGI app, it re-raises the exception.
    *   Creates a `WSGIByteStream` instance to wrap the iterable response body returned by the WSGI application.
5.  **Constructs HTTPX Response:** Returns an `httpx.Response` object, populating its status code, headers, and stream with the information gathered from the WSGI application's response.

**Usage Example:**

```python
import httpx
from my_wsgi_app import app # Assume 'app' is your WSGI application

# Using the 'app' argument directly with the client
client = httpx.Client(app=app)
response = client.get("http://example.com/some-path")
print(response.text)

# Explicitly setting up the transport
transport = httpx.WSGITransport(
    app=app,
    script_name="/api",
    remote_addr="192.168.1.10"
)
client = httpx.Client(transport=transport)
response = client.post("http://example.com/api/users", json={"name": "Test User"})
print(response.status_code)
```

### `WSGIByteStream`

The `WSGIByteStream` class is a synchronous byte stream implementation designed to wrap the iterable response body produced by a WSGI application.

**Inheritance:**

*   It inherits from `SyncByteStream` ([types](types.md)), providing a consistent interface for synchronous byte streaming within HTTPX.

**Initialization Arguments:**

*   `result` (typing.Iterable[bytes]): The iterable of bytes returned by the WSGI application.

**Methods:**

*   `__iter__() -> typing.Iterator[bytes]`: Iterates over the wrapped `result` iterable, yielding chunks of bytes from the WSGI application's response. It also handles skipping any leading empty chunks from the WSGI iterable.
*   `close() -> None`: If the underlying WSGI `result` iterable has a `close` method, this method is called to ensure proper resource cleanup.