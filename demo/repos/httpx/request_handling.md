# Module: `request_handling`

## Introduction
The `request_handling` module, a sub-module of `httpx._models.http_messages`, is central to defining how HTTP requests are structured and managed within the HTTPX library. It provides the `Request` class, which encapsulates all the necessary information to construct and send an HTTP request, including the method, URL, headers, and body content. This module is critical for clients to articulate their intentions to a server.

## Architecture and Component Relationships

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "request", "label": "Request Class", "type": "component", "link": null},
        {"id": "_prepare", "label": "_prepare() Method", "type": "component", "link": null},
        {"id": "read_content", "label": "read()/aread() Methods", "type": "component", "link": null},
        {"id": "urls_module", "label": "urls Module", "type": "external", "link": "urls.md"},
        {"id": "http_headers_module", "label": "http_headers Module", "type": "external", "link": "http_headers.md"},
        {"id": "http_cookies_module", "label": "http_cookies Module", "type": "external", "link": "http_cookies.md"},
        {"id": "types_module", "label": "types Module", "type": "external", "link": "types.md"},
        {"id": "content_module", "label": "content Module", "type": "external", "link": "content.md"}
    ],
    "edges": [
        {"source": "request", "target": "_prepare"},
        {"source": "request", "target": "read_content"},
        {"source": "request", "target": "urls_module"},
        {"source": "request", "target": "http_headers_module"},
        {"source": "request", "target": "http_cookies_module"},
        {"source": "request", "target": "types_module"},
        {"source": "request", "target": "content_module"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    request[Request Class]
    _prepare[_prepare() Method]
    read_content[read()/aread() Methods]
    urls_module[urls Module]
    http_headers_module[http_headers Module]
    http_cookies_module[http_cookies Module]
    types_module[types Module]
    content_module[content Module]

    request --> _prepare
    request --> read_content
    request --> urls_module
    request --> http_headers_module
    request --> http_cookies_module
    request --> types_module
    request --> content_module
```

The diagram above illustrates the key components within the `request_handling` module and its interactions with external modules. The `Request` class is the central component, encapsulating the entire HTTP request. It utilizes helper methods like `_prepare` for header management and `read`/`aread` for content access.

### External Dependencies
- **`urls` Module**: The `Request` class relies on the `URL` object from the [urls module](urls.md) to parse and manage the request's Uniform Resource Locator.
- **`http_headers` Module**: Request headers are managed using the `Headers` class from the [http_headers module](http_headers.md).
- **`http_cookies` Module**: Cookies associated with the request are handled by the `Cookies` class from the [http_cookies module](http_cookies.md).
- **`types` Module**: The `stream` attribute of a request can be either a `SyncByteStream` or an `AsyncByteStream`, both defined in the [types module](types.md).
- **`content` Module**: This module provides the `ByteStream` and `UnattachedStream` classes, which are used for managing and encapsulating the request's body content.

## Core Functionality

### `httpx._models.Request`

The `Request` class is a comprehensive representation of an HTTP request. It provides a flexible way to construct requests with various types of content, headers, and authentication mechanisms.

#### Purpose
To provide a complete and adaptable object for defining HTTP requests, enabling the client to specify all aspects of a request prior to transmission.

#### Attributes
- `method` (str): The HTTP method (e.g., "GET", "POST"). Automatically converted to uppercase.
- `url` ([URL](urls.md)): The target URL of the request.
- `headers` ([Headers](http_headers.md)): A collection of HTTP headers for the request.
- `extensions` (dict): A dictionary for storing request-specific extensions.
- `stream` ([SyncByteStream](types.md) | [AsyncByteStream](types.md)): An iterable or asynchronous iterable stream representing the request body. This allows for both in-memory and streaming content.
- `_content` (bytes): Internally stores the request body after it has been read.

#### Constructor (`__init__`)
```python
Request(
    method: str,
    url: URL | str,
    *,
    params: QueryParamTypes | None = None,
    headers: HeaderTypes | None = None,
    cookies: CookieTypes | None = None,
    content: RequestContent | None = None,
    data: RequestData | None = None,
    files: RequestFiles | None = None,
    json: typing.Any | None = None,
    stream: SyncByteStream | AsyncByteStream | None = None,
    extensions: RequestExtensions | None = None,
)
```
The constructor initializes a new `Request` instance. It intelligently handles various forms of request body content (`content`, `data`, `files`, `json`) by encoding them into an appropriate stream if a `stream` is not explicitly provided. It also manages the setting of default headers like `Host` and `Content-Length`.

#### Methods
- `_prepare(self, default_headers: dict[str, str]) -> None`:
  An internal method used to set default headers for the request, such as `Host` and `Content-Length`, if they are not already present. It avoids overwriting `Transfer-Encoding` if `Content-Length` is set.
- `@property content(self) -> bytes`:
  A property that returns the request body as bytes. If the content has not yet been read from the stream, it will raise a `RequestNotRead` exception.
- `read(self) -> bytes`:
  Reads the entire request body from the `stream` into memory and returns it as bytes. If the stream is not a `ByteStream`, it replaces it with a `ByteStream` containing the read content to ensure replayability. This method is for synchronous use.
- `async aread(self) -> bytes`:
  Asynchronously reads the entire request body from the `stream` into memory and returns it as bytes. Similar to `read`, it ensures replayability by potentially replacing the stream with a `ByteStream`. This method is for asynchronous use.

## How the Module Fits into the Overall System
The `request_handling` module is a foundational component of the HTTPX library, specifically within the `models` hierarchy. It works in conjunction with other modules to facilitate the complete lifecycle of an HTTP request:

- **Client Interaction**: Clients (from the [client module](client.md)) construct `Request` objects using this module to define the outgoing HTTP call.
- **Serialization**: The module leverages internal helpers to serialize various input types (e.g., `json`, `data`, `files`) into a byte stream suitable for transmission, often interacting with the [multipart module](multipart.md) for complex content types.
- **Header Management**: It integrates with the [http_headers module](http_headers.md) for precise control over HTTP headers and the [http_cookies module](http_cookies.md) for cookie handling.
- **Transport Layer**: The `Request` object is passed to the various [transports module](transports.md) implementations, which are responsible for sending the request over the network.
- **Response Generation**: After a request is sent, the server's reply is encapsulated in a `Response` object (from the [response_handling module](response_handling.md)), which often mirrors the structure and principles of the `Request` object.

In essence, `request_handling` provides the blueprint for any communication originating from the HTTPX client, ensuring that requests are well-formed and ready for processing by the underlying transport mechanisms.
