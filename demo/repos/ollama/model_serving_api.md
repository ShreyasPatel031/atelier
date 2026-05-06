# Model Serving API

This module provides the core API for serving models, including endpoints for chat, text generation, embeddings, model management (pull, push, delete), and listing models. It also handles cloud model integration, experimental web features, and robust streaming capabilities.

<!-- DIAGRAM_JSON
{
    "direction": "TB",
    "nodes": [
        {
            "id": "model_interaction_endpoints",
            "label": "Model Interaction Endpoints",
            "type": "module",
            "link": "model_interaction_endpoints.md"
        },
        {
            "id": "api_routing_and_testing",
            "label": "API Routing and Testing",
            "type": "module",
            "link": "api_routing_and_testing.md"
        },
        {
            "id": "cloud_and_streaming_features",
            "label": "Cloud and Streaming Features",
            "type": "module",
            "link": "cloud_and_streaming_features.md"
        }
    ],
    "edges": [
        {
            "source": "model_interaction_endpoints",
            "target": "api_routing_and_testing",
            "label": "routes requests"
        },
        {
            "source": "model_interaction_endpoints",
            "target": "cloud_and_streaming_features",
            "label": "uses cloud/streaming"
        },
        {
            "source": "api_routing_and_testing",
            "target": "cloud_and_streaming_features",
            "label": "configures"
        }
    ],
    "groups": [
        {
            "id": "api_core",
            "label": "API Core",
            "role": "surface",
            "nodes": [
                "model_interaction_endpoints"
            ]
        },
        {
            "id": "api_infra",
            "label": "API Infrastructure",
            "role": "analytical",
            "nodes": [
                "api_routing_and_testing"
            ]
        },
        {
            "id": "api_extensions",
            "label": "API Extensions",
            "role": "generative",
            "nodes": [
                "cloud_and_streaming_features"
            ]
        }
    ]
}
-->

```mermaid
flowchart TB

    subgraph api_core["API Core"]
        model_interaction_endpoints["Model Interaction Endpoints"]
    end

    subgraph api_infra["API Infrastructure"]
        api_routing_and_testing["API Routing and Testing"]
    end

    subgraph api_extensions["API Extensions"]
        cloud_and_streaming_features["Cloud and Streaming Features"]
    end

    model_interaction_endpoints -->|"routes requests"| api_routing_and_testing
    model_interaction_endpoints -->|"uses cloud/streaming"| cloud_and_streaming_features
    api_routing_and_testing -->|"configures"| cloud_and_streaming_features

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class model_interaction_endpoints surface
    class api_routing_and_testing analytical
    class cloud_and_streaming_features generative

    click model_interaction_endpoints "model_interaction_endpoints.md"
    click api_routing_and_testing "api_routing_and_testing.md"
    click cloud_and_streaming_features "cloud_and_streaming_features.md"
```