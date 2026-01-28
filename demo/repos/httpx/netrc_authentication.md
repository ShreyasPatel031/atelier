# `netrc_authentication` Module Documentation

## Introduction

The `netrc_authentication` module provides authentication mechanisms using the `netrc` file format. It contains the `NetRCAuth` class, which allows `httpx` clients to automatically look up and apply basic authentication credentials based on the URL's host, as defined in a user's `netrc` file. This module is a child of the `advanced_auth` module and contributes to the overall `authentication` framework within `httpx`.

## Module Architecture

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "netrc_auth", "label": "NetRCAuth", "type": "component", "link": null},
        {"id": "auth_base", "label": "Auth (from auth_base)", "type": "external", "link": "auth_base.md"},
        {"id": "request", "label": "Request (from models)", "type": "external", "link": "models.md"},
        {"id": "response", "label": "Response (from models)", "type": "external", "link": "models.md"},
        {"id": "url", "label": "URL (from urls)", "type": "external", "link": "urls.md"}
    ],
    "edges": [
        {"source": "netrc_auth", "target": "auth_base", "label": "inherits"},
        {"source": "netrc_auth", "target": "request", "label": "uses"},
        {"source": "netrc_auth", "target": "response", "label": "uses"},
        {"source": "netrc_auth", "target": "url", "label": "uses"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    netrc_auth[NetRCAuth]
    auth_base[Auth (from auth_base)]
    request[Request (from models)]
    response[Response (from models)]
    url[URL (from urls)]

    netrc_auth -- inherits --> auth_base
    netrc_auth -- uses --> request
    netrc_auth -- uses --> response
    netrc_auth -- uses --> url
```

## Core Functionality and Components

The `netrc_authentication` module exposes the following core component:

### `NetRCAuth` Class

The `NetRCAuth` class is an implementation of the `Auth` base class, designed to provide authentication credentials by reading a `.netrc` file.

**Purpose:**
It allows `httpx` to automatically authenticate requests to hosts for which credentials are specified in the `netrc` file, eliminating the need to manually provide usernames and passwords for each request.

**Key Features:**

*   **Automatic Credential Lookup**: During the authentication flow, it queries the `netrc` file for credentials corresponding to the target host of the outgoing request.
*   **Basic Authentication**: If credentials (username and password) are found, it constructs and adds a "Basic Authorization" header to the request.
*   **Lazy Loading of `netrc`**: The `netrc` module is only imported when an instance of `NetRCAuth` is created, optimizing import times for applications that don't utilize `netrc` authentication.
*   **Custom `netrc` File Path**: Allows specifying a custom `netrc` file path during initialization, though it defaults to the standard location.

**Methods:**

*   `__init__(self, file: str | None = None) -> None`:
    *   Initializes the `NetRCAuth` instance.
    *   Loads the `netrc` file (either specified or default).
    *   Stores the parsed `netrc` information for later use.
*   `auth_flow(self, request: Request) -> typing.Generator[Request, Response, None]`:
    *   The core authentication logic.
    *   Checks if the `netrc` file contains authenticators for the `request.url.host`.
    *   If credentials are found, it adds a `Basic` authorization header to the request.
    *   Yields the modified (or original) `Request` object.
*   `_build_auth_header(self, username: str | bytes, password: str | bytes) -> str`:
    *   An internal helper method to construct the `Basic` authentication header string from a given username and password.

## Relationship to the Overall System

The `netrc_authentication` module is a specialized authentication provider within the broader `httpx` authentication framework.

*   **Part of `authentication`**: It resides under the `authentication` module, which groups all authentication-related functionalities.
*   **Child of `advanced_auth`**: It is specifically a child of the `advanced_auth` module, indicating its role in providing more advanced or specialized authentication methods compared to basic or digest authentication.
*   **Extends `auth_base`**: By inheriting from `httpx._auth.Auth` (documented in [auth_base.md](auth_base.md)), `NetRCAuth` integrates seamlessly into the `httpx` request/response flow, allowing it to be used interchangeably with other `Auth` implementations.
*   **Leverages `models` and `urls`**: It interacts with `httpx._models.Request` and `httpx._models.Response` (documented in [models.md](models.md)) to inspect and modify request headers, and uses `httpx._urls.URL` (documented in [urls.md](urls.md)) to extract host information for `netrc` lookup.

This module provides a convenient way for users to manage their credentials externally via the `netrc` file, enhancing security and ease of use for applications interacting with multiple authenticated services.