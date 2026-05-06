количество # Server Authentication

This module provides various server-side authentication schemes like simple token, OIDC, OAuth2, API key, and mTLS, allowing A2A servers to secure communication by validating incoming requests based on configured methods.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "incoming_credentials", "label": "Incoming Credentials", "type": "component", "link": null},
        {"id": "simple_token", "label": "Validate Simple Token", "type": "component", "link": null},
        {"id": "oidc", "label": "Validate OIDC JWT", "type": "component", "link": null},
        {"id": "oauth2", "label": "Validate OAuth2 Token (JWKS / Introspection)", "type": "component", "link": null},
        {"id": "api_key", "label": "Validate API Key", "type": "component", "link": null},
        {"id": "mtls", "label": "Verify mTLS Client Certificate", "type": "component", "link": null},
        {"id": "enterprise", "label": "Verify Enterprise Token", "type": "component", "link": null},
        {"id": "authenticated_user", "label": "Authenticated User", "type": "component", "link": null},
        {"id": "config", "label": "A2A Configuration", "type": "external", "link": "a2a_configuration.md"}
    ],
    "edges": [
        {"source": "incoming_credentials", "target": "simple_token", "label": "presents"},
        {"source": "incoming_credentials", "target": "oidc", "label": "presents"},
        {"source": "incoming_credentials", "target": "oauth2", "label": "presents"},
        {"source": "incoming_credentials", "target": "api_key", "label": "presents"},
        {"source": "incoming_credentials", "target": "mtls", "label": "presents"},
        {"source": "incoming_credentials", "target": "enterprise", "label": "presents"},
        {"source": "config", "target": "simple_token", "label": "configures"},
        {"source": "config", "target": "oidc", "label": "configures"},
        {"source": "config", "target": "oauth2", "label": "configures"},
        {"source": "config", "target": "api_key", "label": "configures"},
        {"source": "config", "target": "mtls", "label": "configures"},
        {"source": "config", "target": "enterprise", "label": "configures"},
        {"source": "simple_token", "target": "authenticated_user", "label": "grants access"},
        {"source": "oidc", "target": "authenticated_user", "label": "grants access"},
        {"source": "oauth2", "target": "authenticated_user", "label": "grants access"},
        {"source": "api_key", "target": "authenticated_user", "label": "grants access"},
        {"source": "mtls", "target": "authenticated_user", "label": "grants access"},
        {"source": "enterprise", "target": "authenticated_user", "label": "grants access"}
    ],
    "groups": [
        {"id": "server_auth_schemes", "label": "Server Authentication Schemes", "role": "analytical", "nodes": ["simple_token", "oidc", "oauth2", "api_key", "mtls", "enterprise"]}
    ]
}
-->
```mermaid
flowchart TD
    incoming_credentials["Incoming Credentials"]
    authenticated_user["Authenticated User"]
    config["A2A Configuration"]

    subgraph server_auth_schemes["Server Authentication Schemes"]
        simple_token["Validate Simple Token"]
        oidc["Validate OIDC JWT"]
        oauth2["Validate OAuth2 Token (JWKS / Introspection)"]
        api_key["Validate API Key"]
        mtls["Verify mTLS Client Certificate"]
        enterprise["Verify Enterprise Token"]
    end

    incoming_credentials -->|"presents"| simple_token
    incoming_credentials -->|"presents"| oidc
    incoming_credentials -->|"presents"| oauth2
    incoming_credentials -->|"presents"| api_key
    incoming_credentials -->|"presents"| mtls
    incoming_credentials -->|"presents"| enterprise

    config -.->|"configures"| simple_token
    config -.->|"configures"| oidc
    config -.->|"configures"| oauth2
    config -.->|"configures"| api_key
    config -.->|"configures"| mtls
    config -.->|"configures"| enterprise

    simple_token -->|"grants access"| authenticated_user
    oidc -->|"grants access"| authenticated_user
    oauth2 -->|"grants access"| authenticated_user
    api_key -->|"grants access"| authenticated_user
    mtls -->|"grants access"| authenticated_user
    enterprise -->|"grants access"| authenticated_user

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef external fill:#fff7ed,stroke:#fdba74,stroke-width:1px,color:#7c2d12

    class simple_token,oidc,oauth2,api_key,mtls,enterprise,incoming_credentials,authenticated_user analytical
    class config external

    click config "a2a_configuration.md" "View A2A Configuration"
```