# Module: `basic_auth`

## Introduction

The `basic_auth` module provides functionality for handling HTTP Basic Authentication within the `httpx` library. It offers a straightforward way to apply username and password credentials to outgoing requests.

## Core Functionality

The primary component of this module is the `BasicAuth` class, which extends the `Auth` class from the `auth_base` module. It facilitates the creation of the `Authorization` header required for Basic Authentication.

### `BasicAuth` Class

```python
class BasicAuth(Auth):
    """
    Allows the 'auth' argument to be passed as a (username, password) pair,
    and uses HTTP Basic authentication.
    """

    def __init__(self, username: str | bytes, password: str | bytes) -> None:
        self._auth_header = self._build_auth_header(username, password)

    def auth_flow(self, request: Request) -> typing.Generator[Request, Response, None]:
        request.headers["Authorization"] = self._auth_header
        yield request

    def _build_auth_header(self, username: str | bytes, password: str | bytes) -> str:
        userpass = b":".join((to_bytes(username), to_bytes(password)))
        token = b64encode(userpass).decode()
        return f"Basic {token}"
```

-   **`__init__(self, username: str | bytes, password: str | bytes) -> None`**:
    -   Initializes the `BasicAuth` instance with a username and password.
    -   Calls `_build_auth_header` to pre-construct the `Authorization` header.

-   **`auth_flow(self, request: Request) -> typing.Generator[Request, Response, None]`**:
    -   This method implements the authentication logic.
    -   It sets the pre-built `Authorization` header on the outgoing `Request` object.
    -   It yields the modified `Request` object, allowing the request to proceed with the authentication credentials.

-   **`_build_auth_header(self, username: str | bytes, password: str | bytes) -> str`**:
    -   A private helper method responsible for generating the HTTP Basic `Authorization` header string.
    -   It concatenates the username and password with a colon, encodes the resulting string in Base64, and prefixes it with "Basic ".

## Architecture and Component Relationships

The `basic_auth` module, specifically the `BasicAuth` class, is a concrete implementation of the abstract `Auth` class defined in the [`auth_base`](auth_base.md) module. This establishes an inheritance relationship, ensuring that `BasicAuth` adheres to the general authentication interface of `httpx`.

It interacts with the `Request` and `Response` objects (defined in the [`models`](models.md) module) during its `auth_flow` to modify outgoing requests.

## Overall System Integration

The `basic_auth` module is a fundamental part of the `authentication` package within `httpx`. It provides one of the most common authentication mechanisms, allowing users to easily secure their HTTP requests with basic username/password credentials. By conforming to the `Auth` interface, it seamlessly integrates with `httpx` clients, which can accept any `Auth` subclass for handling authentication. This modular design ensures that different authentication schemes can be plugged in and out without affecting the core client logic.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "basic_auth_class", "label": "BasicAuth Class", "type": "component", "link": null},
        {"id": "auth_base", "label": "Auth (from auth_base)", "type": "external", "link": "auth_base.md"},
        {"id": "request", "label": "Request (from models)", "type": "external", "link": "models.md"},
        {"id": "response", "label": "Response (from models)", "type": "external", "link": "models.md"}
    ],
    "edges": [
        {"source": "basic_auth_class", "target": "auth_base", "label": "inherits"},
        {"source": "basic_auth_class", "target": "request", "label": "uses in auth_flow"},
        {"source": "basic_auth_class", "target": "response", "label": "uses in auth_flow"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    basic_auth_class[BasicAuth Class]
    auth_base[Auth (from auth_base)]
    request[Request (from models)]
    response[Response (from models)]

    basic_auth_class -- inherits --> auth_base
    basic_auth_class -- uses in auth_flow --> request
    basic_auth_class -- uses in auth_flow --> response
```