# `digest_auth_logic`

The `digest_auth_logic` module is a critical component within the `authentication` package, specifically responsible for implementing the HTTP Digest Authentication scheme. This module provides the core logic for handling digest authentication challenges and generating the appropriate `Authorization` headers for HTTP requests.

## Core Functionality

This module encapsulates the intricate details of Digest Authentication, a more secure alternative to Basic Authentication. It manages the authentication flow, including parsing `WWW-Authenticate` headers, computing cryptographic hashes, and maintaining session-specific parameters like nonces and opaque values.

### `DigestAuth`

The `DigestAuth` class is the primary entry point for performing Digest Authentication. It inherits from the base `Auth` class (defined in `auth_base`), providing a standardized interface for authentication.

Key functionalities include:
*   **Initialization**: Stores the username and password, and initializes internal state such as the last received challenge and nonce count.
*   **Authentication Flow (`auth_flow`)**: This generator method orchestrates the entire digest authentication process.
    *   It first sends a request, optionally with a pre-computed `Authorization` header if a previous challenge exists.
    *   Upon receiving a `401 Unauthorized` response with a `WWW-Authenticate: Digest` header, it parses the challenge.
    *   It then computes the necessary cryptographic hashes (`HA1`, `HA2`, and the final `response` digest) using MD5, SHA, SHA-256, or SHA-512 algorithms, based on the server's specified `algorithm`.
    *   Finally, it constructs and attaches the `Authorization` header to the new request and yields it.
*   **Challenge Parsing (`_parse_challenge`)**: Extracts parameters like `realm`, `nonce`, `qop`, `algorithm`, and `opaque` from the `WWW-Authenticate` header into a `_DigestAuthChallenge` object.
*   **Header Construction (`_build_auth_header`)**: Generates the `Authorization` header string using the parsed challenge details, client nonces, quality of protection (`qop`), and the computed response digest.
*   **Client Nonce Generation (`_get_client_nonce`)**: Creates a unique client nonce (cnonce) for each authentication attempt to prevent replay attacks, incorporating the nonce count, server nonce, timestamp, and random data.
*   **QOP Resolution (`_resolve_qop`)**: Determines the quality of protection (e.g., "auth") based on the server's challenge. Currently, "auth-int" (authentication with integrity protection) is not implemented.

### `_DigestAuthChallenge`

This `typing.NamedTuple` serves as a data structure to store the parsed components of a Digest `WWW-Authenticate` challenge header. It provides a clear and immutable representation of the server's authentication requirements, facilitating their use by the `DigestAuth` class.

## Architecture and Component Relationships

The `digest_auth_logic` module is a leaf module responsible for the specific logic of HTTP Digest Authentication. It relies on a few internal and external components to fulfill its responsibilities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "DigestAuth", "label": "DigestAuth", "type": "component", "link": null},
        {"id": "_DigestAuthChallenge", "label": "_DigestAuthChallenge", "type": "component", "link": null},
        {"id": "auth_base", "label": "Auth (from auth_base)", "type": "external", "link": "auth_base.md"},
        {"id": "models", "label": "Request/Response (from models)", "type": "external", "link": "models.md"}
    ],
    "edges": [
        {"source": "auth_base", "target": "DigestAuth"},
        {"source": "DigestAuth", "target": "_DigestAuthChallenge"},
        {"source": "DigestAuth", "target": "models"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    auth_base[Auth (from auth_base)]
    DigestAuth[DigestAuth]
    _DigestAuthChallenge[_DigestAuthChallenge]
    models[Request/Response (from models)]

    auth_base --> DigestAuth
    DigestAuth --> _DigestAuthChallenge
    DigestAuth --> models
```

*   **`DigestAuth`**: The central component that orchestrates the Digest Authentication process. It inherits from `Auth` (from `auth_base`), providing a common interface for different authentication schemes.
*   **`_DigestAuthChallenge`**: A data container used by `DigestAuth` to store and manage the parameters extracted from the `WWW-Authenticate` header.
*   **`auth_base`**: Provides the base `Auth` class that `DigestAuth` extends, defining the fundamental interface for authentication handlers.
*   **`models`**: Contains the `Request` and `Response` objects that `DigestAuth` operates on, reading headers from responses and setting headers on requests.

## How it Fits into the Overall System

The `digest_auth_logic` module is a specialized part of the broader [authentication](authentication.md) system. It provides a concrete implementation for Digest Authentication, which can be dynamically selected and applied by higher-level components like the [client](client.md) when a server demands Digest authentication.

It works in conjunction with:
*   [auth_base](auth_base.md): Provides the abstract base class `Auth` that `DigestAuth` implements, ensuring consistency across different authentication mechanisms.
*   [digest_auth](digest_auth.md) and [digest_authentication_core](digest_authentication_core.md): These modules likely serve as organizational containers or may introduce further layers of abstraction or specific configurations related to Digest Authentication that utilize the core logic provided here.
*   [models](models.md): Essential for interacting with `Request` and `Response` objects, allowing the authentication logic to inspect incoming headers and modify outgoing requests.

By isolating the Digest Authentication logic, this module ensures maintainability and allows for easy updates or extensions to the authentication scheme without affecting other parts of the HTTP client library.
