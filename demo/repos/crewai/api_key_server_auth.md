# Module: `api_key_server_auth`

## Introduction
The `api_key_server_auth` module provides a robust mechanism for server-side API key authentication within the Agent-to-Agent (A2A) communication framework. This module ensures that incoming requests are validated against a pre-defined API key, enhancing the security of agent interactions.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "api_key_server_auth_component", "label": "APIKeyServerAuth", "type": "component", "link": null},
        {"id": "server_auth_scheme", "label": "ServerAuthScheme", "type": "external", "link": "server_auth_schemes.md"},
        {"id": "authenticated_user", "label": "AuthenticatedUser", "type": "external", "link": "a2a_auth_schemes.md"},
        {"id": "field", "label": "Field (Pydantic)", "type": "external", "link": null},
        {"id": "http_exception", "label": "HTTPException (FastAPI)", "type": "external", "link": null},
        {"id": "coerced_secret_str", "label": "CoercedSecretStr", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "api_key_server_auth_component", "target": "server_auth_scheme"},
        {"source": "api_key_server_auth_component", "target": "authenticated_user"},
        {"source": "api_key_server_auth_component", "target": "field"},
        {"source": "api_key_server_auth_component", "target": "http_exception"},
        {"source": "api_key_server_auth_component", "target": "coerced_secret_str"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    api_key_server_auth_component[APIKeyServerAuth]
    server_auth_scheme[ServerAuthScheme]
    authenticated_user[AuthenticatedUser]
    field[Field (Pydantic)]
    http_exception[HTTPException (FastAPI)]
    coerced_secret_str[CoercedSecretStr]

    api_key_server_auth_component --> server_auth_scheme
    api_key_server_auth_component --> authenticated_user
    api_key_server_auth_component --> field
    api_key_server_auth_component --> http_exception
    api_key_server_auth_component --> coerced_secret_str
```

## Module Purpose and Core Functionality
The primary purpose of `api_key_server_auth` is to provide a concrete implementation of `ServerAuthScheme` for API key-based authentication. It enables an A2A server to accept and validate requests based on an API key provided in the request header, query parameters, or cookies.

Its core functionality revolves around:
*   **API Key Configuration**: Defining the name of the API key parameter, its expected location in the request, and the secret API key value.
*   **Authentication Logic**: Implementing the `authenticate` method to compare an incoming token with the configured API key, raising an `HTTPException` for invalid keys.

## Architecture and Component Relationships
The `api_key_server_auth` module contains the `APIKeyServerAuth` class, which is a specialized `ServerAuthScheme`.

*   **`APIKeyServerAuth`**: This is the central component, responsible for handling API key-based authentication. It inherits from `ServerAuthScheme`, adhering to the defined interface for server-side authentication.
*   **`ServerAuthScheme`**: The base class for all server-side authentication schemes, likely defined in the [server_auth_schemes module](server_auth_schemes.md). `APIKeyServerAuth` extends this to provide specific API key validation.
*   **`AuthenticatedUser`**: A data structure used to represent a successfully authenticated user, typically containing details about the authenticated token and the scheme used. This is likely defined within the broader [a2a_auth_schemes module](a2a_auth_schemes.md).
*   **Pydantic `Field`**: Used for defining and validating the attributes of the `APIKeyServerAuth` class, such as `name`, `location`, and `api_key`.
*   **FastAPI `HTTPException`**: Utilized to signal authentication failures, returning a standard HTTP 401 Unauthorized status.
*   **`CoercedSecretStr`**: A utility (likely from a security or utility module) for securely handling secret strings, ensuring they are not accidentally exposed.

## How the Module Fits into the Overall System
The `api_key_server_auth` module is a critical piece of the `crewai_agent_to_agent_communication` framework, specifically within the `server_auth_schemes` submodule. It provides one of the concrete methods by which agents can authenticate incoming requests from other agents or external systems.

By offering a flexible API key authentication mechanism (header, query, or cookie), it allows for various deployment scenarios and integration patterns. It ensures that only authorized entities with the correct API key can interact with an A2A server implementing this scheme, thereby enforcing secure communication and protecting sensitive agent interactions. This module complements other authentication schemes available in the `server_auth_schemes` module, offering a complete suite of options for securing the A2A communication layer.

## API Reference

### Class: `APIKeyServerAuth`

```python
class APIKeyServerAuth(ServerAuthScheme):
    """API Key authentication for A2A server.

    Validates requests using an API key in a header, query parameter, or cookie.
    """
    name: str = Field(
        default="X-API-Key",
        description="Name of the API key parameter",
    )
    location: Literal["header", "query", "cookie"] = Field(
        default="header",
        description="Where to look for the API key",
    )
    api_key: CoercedSecretStr = Field(
        description="Expected API key value",
    )

    async def authenticate(self, token: str) -> AuthenticatedUser:
        """Authenticate using API key comparison.

        Args:
            token: The API key to authenticate.

        Returns:
            AuthenticatedUser on successful authentication.

        Raises:
            HTTPException: If authentication fails.
        """
        # ... (implementation details for authentication)
```

**Attributes**:

*   **`name`**: `str`
    *   Default: "X-API-Key"
    *   Description: The name of the API key parameter to look for in the specified `location`.
*   **`location`**: `Literal["header", "query", "cookie"]`
    *   Default: "header"
    *   Description: Specifies where the API key is expected to be found in the incoming request.
*   **`api_key`**: `CoercedSecretStr`
    *   Description: The actual secret API key value that incoming tokens will be compared against.

**Methods**:

*   **`authenticate(self, token: str) -> AuthenticatedUser`**:
    *   Description: Asynchronously authenticates a given `token` by comparing it with the configured `api_key`. If the tokens match, an `AuthenticatedUser` object is returned. If they do not match, an `HTTPException` with a 401 Unauthorized status is raised.
    *   **Parameters**:
        *   `token` (`str`): The API key provided in the incoming request that needs to be authenticated.
    *   **Returns**:
        *   `AuthenticatedUser`: An instance of `AuthenticatedUser` if the authentication is successful.
    *   **Raises**:
        *   `HTTPException`: If the provided `token` does not match the expected `api_key`.
