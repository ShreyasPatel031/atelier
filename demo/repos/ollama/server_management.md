# server_management
This module provides core server management functionalities, including process lifecycle, inference information extraction, cloud proxy handling, and a sophisticated scheduler for managing model loading and execution on available resources.

<!-- DIAGRAM_JSON
{
  "nodes": [
    { "id": "A", "label": "Server.Run" },
    { "id": "B", "label": "TestGetInferenceInfo" },
    { "id": "C", "label": "TestCloudPassthroughMiddleware_ZstdBody" },
    { "id": "D", "label": "TestCloudPassthroughMiddleware_ZstdBodyTooLarge" },
    { "id": "E", "label": "TestSchedGetRunner" },
    { "id": "F", "label": "TestSchedPrematureExpired" },
    { "id": "G", "label": "TestSchedRequestsSameModelSameRequest" },
    { "id": "H", "label": "TestSchedRequestsSimpleReloadSameModel" },
    { "id": "I", "label": "TestSchedRequestsMultipleLoadedModels" },
    { "id": "J", "label": "TestSchedAlreadyCanceled" },
    { "id": "K", "label": "CloudPassthroughMiddleware" },
    { "id": "L", "label": "Scheduler" }
  ],
  "edges": [
    { "source": "A", "target": "L" },
    { "source": "C", "target": "K" },
    { "source": "D", "target": "K" },
    { "source": "E", "target": "L" },
    { "source": "F", "target": "L" },
    { "source": "G", "target": "L" },
    { "source": "H", "target": "L" },
    { "source": "I", "target": "L" },
    { "source": "J", "target": "L" }
  ],
  "groups": [
    { "id": "server_core", "label": "Server Core", "nodes": ["A"] },
    { "id": "cloud_proxy", "label": "Cloud Proxy", "nodes": ["K", "C", "D"] },
    { "id": "scheduler", "label": "Scheduler", "nodes": ["L", "E", "F", "G", "H", "I", "J"] },
    { "id": "inference_info", "label": "Inference Info", "nodes": ["B"] }
  ]
}
-->
```mermaid
flowchart TD
    subgraph Server Core
        A[Server.Run]
    end

    subgraph Cloud Proxy
        K[CloudPassthroughMiddleware]
        C[TestCloudPassthroughMiddleware_ZstdBody]
        D[TestCloudPassthroughMiddleware_ZstdBodyTooLarge]
    end

    subgraph Scheduler
        L[Scheduler]
        E[TestSchedGetRunner]
        F[TestSchedPrematureExpired]
        G[TestSchedRequestsSameModelSameRequest]
        H[TestSchedRequestsSimpleReloadSameModel]
        I[TestSchedRequestsMultipleLoadedModels]
        J[TestSchedAlreadyCanceled]
    end

    subgraph Inference Info
        B[TestGetInferenceInfo]
    end

    A --> L
    C --> K
    D --> K
    E --> L
    F --> L
    G --> L
    H --> L
    I --> L
    J --> L
```