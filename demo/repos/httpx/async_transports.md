# `async_transports` Module Documentation

## Introduction and Purpose

The `async_transports` module in `httpx` provides the core asynchronous HTTP transport mechanisms, enabling `httpx` to send and receive HTTP requests and responses in a non-blocking manner. It specifically focuses on the default asynchronous implementations for handling HTTP connections, requests, and responses. This module is crucial for applications requiring high concurrency and responsiveness without blocking the main thread of execution.

## Architecture and Core Functionality

The `async_transports` module primarily consists of two key components: `AsyncHTTPTransport` and `AsyncResponseStream`. These components work together to manage asynchronous network communication, connection pooling, and stream processing for HTTP requests and responses.

### `AsyncHTTPTransport`

The `AsyncHTTPTransport` class is responsible for establishing and managing asynchronous HTTP connections. It acts as the primary interface for sending `httpx.Request` objects and receiving `httpx.Response` objects asynchronously.

**Key Responsibilities:**
- **Connection Management:** It leverages the `httpcore` library for asynchronous connection pooling, allowing efficient reuse of connections and adherence to defined limits (see [configuration.md](configuration.md) for `Limits`).
- **SSL/TLS Handling:** Configures SSL contexts based on provided verification settings, certificates, and environment trust settings.
- **Proxy Support:** Supports various proxy types, including HTTP, HTTPS, SOCKS5, and SOCKS5H, by integrating with `httpcore`'s proxy functionalities (refer to [configuration.md](configuration.md) for `Proxy` and [urls.md](urls.md) for `URL` parsing).
- **Request/Response Conversion:** Translates `httpx.Request` objects into `httpcore.Request` objects for underlying network operations and converts `httpcore.Response` back into `httpx.Response`.
- **Asynchronous Lifecycle:** Implements `__aenter__`, `__aexit__`, and `aclose` for proper asynchronous resource management and connection shutdown.

This transport inherits from `AsyncBaseTransport`, providing a common interface for asynchronous transports (see [base_transports.md](base_transports.md) for more details on base transports).

### `AsyncResponseStream`

The `AsyncResponseStream` class provides an asynchronous iterable interface for reading the content of an HTTP response. It wraps the underlying `httpcore` asynchronous byte stream, making it compatible with `httpx`'s streaming capabilities.

**Key Responsibilities:**
- **Asynchronous Iteration:** Allows consumers to asynchronously iterate over chunks of the response body as bytes.
- **Error Handling:** Maps exceptions from `httpcore` to `httpx`'s exception hierarchy for consistent error reporting.
- **Resource Cleanup:** Provides an `aclose` method to properly close the underlying `httpcore` stream if it supports asynchronous closing.

This stream implements the `AsyncByteStream` interface (see [types.md](types.md) for `AsyncByteStream` definition).

## Relationship to Overall System

The `async_transports` module is a fundamental part of `httpx`'s asynchronous client capabilities, specifically nested within the `default_http_transports` module, which also includes `sync_transports`. It enables the `httpx.AsyncClient` (see [client.md](client.md)) to perform non-blocking HTTP operations. It relies heavily on the `httpcore` library for low-level network interactions and integrates with other `httpx` modules like [configuration.md](configuration.md) for settings, [models.md](models.md) for request and response structures, and [types.md](types.md) for stream definitions.
