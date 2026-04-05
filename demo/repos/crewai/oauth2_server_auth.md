# `oauth2_server_auth` Module Documentation

## Introduction

The `oauth2_server_auth` module provides robust OAuth2 authentication capabilities for server-side agent-to-agent (A2A) communication within the CrewAI framework. It enables secure interactions by handling the declaration of OAuth2 security schemes and validating access tokens using either JSON Web Key Set (JWKS) for JWT tokens or an OAuth2 introspection endpoint for opaque tokens.

This module is crucial for environments requiring standard-compliant and flexible token-based authentication for server-side services interacting with other agents or external systems.

## Architecture and Component Relationships

The `oauth2_server_auth` module's core component is the `OAuth2ServerAuth` class, which extends the `ServerAuthScheme` base class. It orchestrates the entire OAuth2 authentication flow, from configuration to token validation.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "oauth2_server_auth", "label": "OAuth2ServerAuth", "type": "component", "link": null},
        {"id": "authenticate_jwt", "label": "_authenticate_jwt (JWT Validation)", "type": "component", "link": null},
        {"id": "authenticate_introspection", "label": "_authenticate_introspection (Token Introspection)", "type": "component", "link": null},
        {"id": "server_auth_scheme", "label": "ServerAuthScheme", "type": "external", "link": "server_auth_schemes.md"},
        {"id": "a2a_types", "label": "A2A Types (OAuth2SecurityScheme, AuthenticatedUser)", "type": "external", "link": null},
        {"id": "pyjwkclient_jwt", "label": "PyJWKClient/PyJWT", "type": "external", "link": null},
        {"id": "httpx", "label": "httpx", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "oauth2_server_auth", "target": "server_auth_scheme", "label": "inherits"},
        {"source": "oauth2_server_auth", "target": "authenticate_jwt", "label": "calls if JWKS configured"},
        {"source": "oauth2_server_auth", "target": "authenticate_introspection", "label": "calls if Introspection configured"},
        {"source": "authenticate_jwt", "target": "pyjwkclient_jwt", "label": "uses for JWT validation"},
        {"source": "authenticate_introspection", "target": "httpx", "label": "uses for HTTP requests"},
        {"source": "oauth2_server_auth", "target": "a2a_types", "label": "uses for types and return values"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    oauth2_server_auth[OAuth2ServerAuth]
    authenticate_jwt[_authenticate_jwt (JWT Validation)]
    authenticate_introspection[_authenticate_introspection (Token Introspection)]
    server_auth_scheme[ServerAuthScheme]
    a2a_types[A2A Types (OAuth2SecurityScheme, AuthenticatedUser)]
    pyjwkclient_jwt[PyJWKClient/PyJWT]
    httpx[httpx]

    oauth2_server_auth -- inherits --> server_auth_scheme
    oauth2_server_auth -- "calls if JWKS configured" --> authenticate_jwt
    oauth2_server_auth -- "calls if Introspection configured" --> authenticate_introspection
    authenticate_jwt -- "uses for JWT validation" --> pyjwkclient_jwt
    authenticate_introspection -- "uses for HTTP requests" --> httpx
    oauth2_server_auth -- "uses for types and return values" --> a2a_types
```

### `OAuth2ServerAuth` Class

**Purpose:** The central class for defining and managing OAuth2 server-side authentication. It supports two primary token validation methods: JWKS for JWTs and token introspection for opaque tokens.

**Key Attributes:**

*   `token_url`: OAuth2 token endpoint URL.
*   `authorization_url`: Optional OAuth2 authorization endpoint URL for `authorization_code` flow.
*   `scopes`: Defines available OAuth2 scopes and their descriptions.
*   `jwks_url`: URL for the JSON Web Key Set, used for JWT signature validation. Mutually exclusive with `introspection_url` if only one validation method is chosen.
*   `introspection_url`: URL for the OAuth2 token introspection endpoint (RFC 7662). Alternative to `jwks_url` for opaque token validation.
*   `introspection_client_id`, `introspection_client_secret`: Credentials for authenticating with the introspection endpoint.
*   `audience`, `issuer`: Expected claims for JWT validation.
*   `algorithms`: Allowed JWT signing algorithms.
*   `required_claims`: Claims that must be present in the token.

**Core Methods:**

*   `_validate_and_init()`: A Pydantic `model_validator` that ensures either `jwks_url` or `introspection_url` is provided. If `introspection_url` is used, it validates the presence of `introspection_client_id` and `introspection_client_secret`. It also initializes the `PyJWKClient` if `jwks_url` is configured.

*   `authenticate(token: str) -> AuthenticatedUser`: The main public method for authenticating an incoming access token. It intelligently dispatches the authentication request to either `_authenticate_jwt` or `_authenticate_introspection` based on the configured validation method.

*   `_authenticate_jwt(token: str) -> AuthenticatedUser`: Handles the validation of JWT tokens using the configured JWKS URL. It retrieves the signing key, decodes the JWT, and validates claims such as audience, issuer, and required claims. Various `jwt` exceptions are caught and transformed into appropriate HTTP exceptions.

*   `_authenticate_introspection(token: str) -> AuthenticatedUser`: Performs token validation by calling an OAuth2 introspection endpoint. It sends the token to the `introspection_url` with client credentials and checks the `active` status in the response. HTTP errors and other exceptions during introspection are handled.

*   `to_security_scheme() -> OAuth2SecurityScheme`: Generates an `OAuth2SecurityScheme` object, which is used to declare the OAuth2 security requirements in an `AgentCard`. This method dynamically configures `ClientCredentialsOAuthFlow` and `AuthorizationCodeOAuthFlow` based on the provided `token_url` and `authorization_url`.

## How the Module Fits into the Overall System

The `oauth2_server_auth` module is a vital part of the `crewai_agent_to_agent_communication` system, specifically within the `server_auth_schemes` sub-module. It provides a standardized and secure mechanism for server-side agents to verify the authenticity and authorization of incoming requests from other agents or clients through OAuth2 tokens.

This module integrates with the broader A2A authentication framework by implementing the `ServerAuthScheme` interface, allowing it to be seamlessly plugged into the CrewAI's agent communication security layer. The `to_security_scheme` method ensures that the OAuth2 requirements are correctly published in the `AgentCard`, enabling clients to understand and comply with the server's authentication policies.

By centralizing OAuth2 token validation, this module enhances the security posture of the CrewAI ecosystem, ensuring that only properly authenticated and authorized agents can interact with protected resources and functionalities.