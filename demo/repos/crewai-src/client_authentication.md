# Client Authentication Schemes

This module provides various client-side authentication schemes, including API Key, Bearer Token, HTTP Basic, HTTP Digest, and OAuth2 flows, and handles automatic retries for 401 authentication errors.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "auth_base", "label": "ClientAuthScheme (Base)", "type": "component", "link": null},
        {"id": "api_key", "label": "APIKeyAuth", "type": "component", "link": null},
        {"id": "bearer_token", "label": "BearerTokenAuth", "type": "component", "link": null},
        {"id": "http_basic", "label": "HTTPBasicAuth", "type": "component", "link": null},
        {"id": "http_digest", "label": "HTTPDigestAuth", "type": "component", "link": null},
        {"id": "oauth2_cc", "label": "OAuth2 Client Credentials", "type": "component", "link": null},
        {"id": "oauth2_ac", "label": "OAuth2 Authorization Code", "type": "component", "link": null},
        {"id": "retry_handler", "label": "Retry on 401 Handler", "type": "component", "link": null},
        {"id": "http_client_lib", "label": "HTTP Client (httpx)", "type": "external", "link": null},
        {"id": "a2a_comm_module", "label": "A2A Communication", "type": "external", "link": "a2a_communication.md"}
    ],
    "edges": [
        {"source": "api_key", "target": "auth_base", "label": "inherits"},
        {"source": "bearer_token", "target": "auth_base", "label": "inherits"},
        {"source": "http_basic", "target": "auth_base", "label": "inherits"},
        {"source": "http_digest", "target": "auth_base", "label": "inherits"},
        {"source": "oauth2_cc", "target": "auth_base", "label": "inherits"},
        {"source": "oauth2_ac", "target": "auth_base", "label": "inherits"},
        {"source": "retry_handler", "target": "auth_base", "label": "uses base interface"},
        {"source": "a2a_comm_module", "target": "retry_handler", "label": "employs"},
        {"source": "retry_handler", "target": "http_client_lib", "label": "applies auth with"},
        {"source": "api_key", "target": "http_client_lib", "label": "configures/applies to"},
        {"source": "bearer_token", "target": "http_client_lib", "label": "applies to"},
        {"source": "http_basic", "target": "http_client_lib", "label": "applies to"},
        {"source": "http_digest", "target": "http_client_lib", "label": "configures"},
        {"source": "oauth2_cc", "target": "http_client_lib", "label": "fetches/applies token to"},
        {"source": "oauth2_ac", "target": "http_client_lib", "label": "fetches/applies token to"},
        {"source": "a2a_comm_module", "target": "http_client_lib", "label": "initiates requests with"}
    ],
    "groups": [
        {"id": "auth_schemes_grp", "label": "Client Authentication Schemes", "role": "generative", "nodes": ["api_key", "bearer_token", "http_basic", "http_digest", "oauth2_cc", "oauth2_ac"]},
        {"id": "auth_flow_grp", "label": "Authentication Flow Management", "role": "analytical", "nodes": ["retry_handler"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph auth_schemes_grp["Client Authentication Schemes"]
        api_key["APIKeyAuth"]
        bearer_token["BearerTokenAuth"]
        http_basic["HTTPBasicAuth"]
        http_digest["HTTPDigestAuth"]
        oauth2_cc["OAuth2 Client Credentials"]
        oauth2_ac["OAuth2 Authorization Code"]
    end

    subgraph auth_flow_grp["Authentication Flow Management"]
        retry_handler["Retry on 401 Handler"]
    end

    auth_base["ClientAuthScheme (Base)"]

    http_client_lib["HTTP Client (httpx)"]
    a2a_comm_module["A2A Communication"]

    api_key -->|"inherits"| auth_base
    bearer_token -->|"inherits"| auth_base
    http_basic -->|"inherits"| auth_base
    http_digest -->|"inherits"| auth_base
    oauth2_cc -->|"inherits"| auth_base
    oauth2_ac -->|"inherits"| auth_base

    retry_handler -.->|"uses base interface"| auth_base
    a2a_comm_module -->|"employs"| retry_handler

    api_key -->|"configures/applies to"| http_client_lib
    bearer_token -->|"applies to"| http_client_lib
    http_basic -->|"applies to"| http_client_lib
    http_digest -->|"configures"| http_client_lib
    oauth2_cc ==>|"fetches/applies token to"| http_client_lib
    oauth2_ac ==>|"fetches/applies token to"| http_client_lib

    a2a_comm_module -->|"initiates requests with"| http_client_lib

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    class api_key,bearer_token,http_basic,http_digest,oauth2_cc,oauth2_ac generative
    class retry_handler analytical
```