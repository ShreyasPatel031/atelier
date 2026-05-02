# Request Middleware
This module provides an abstraction layer for handling incoming API requests and transforming outgoing responses, supporting various models and API specifications like Anthropic and OpenAI.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "anthropic_api_middleware", "label": "Anthropic API Middleware", "type": "module", "link": "anthropic_api_middleware.md"},
        {"id": "openai_api_middleware", "label": "OpenAI API Middleware", "type": "module", "link": "openai_api_middleware.md"}
    ],
    "edges": [
        {"source": "anthropic_api_middleware", "target": "openai_api_middleware", "label": "API request/response flow"}
    ],
    "groups": [
        {"id": "api_handling", "label": "API Request/Response Handling", "role": "analytical", "nodes": ["anthropic_api_middleware", "openai_api_middleware"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph api_handling["API Request/Response Handling"]
        anthropic_api_middleware["Anthropic API Middleware"]
        openai_api_middleware["OpenAI API Middleware"]
    end
    anthropic_api_middleware -->|"API request/response flow"| openai_api_middleware

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    class anthropic_api_middleware,openai_api_middleware analytical

    click anthropic_api_middleware "anthropic_api_middleware.md" "View Anthropic API Middleware Docs"
    click openai_api_middleware "openai_api_middleware.md" "View OpenAI API Middleware Docs"
```