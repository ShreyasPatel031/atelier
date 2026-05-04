# Scheduler Request Processing
This module handles the core logic for processing incoming model requests, including queuing, allocating model runners, managing model loading and unloading, and gracefully managing request lifecycles and cancellation.
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "incoming_request",
            "label": "Incoming Model Request",
            "type": "component",
            "link": null
        },
        {
            "id": "request_queue",
            "label": "Request Queue",
            "type": "data",
            "link": null
        },
        {
            "id": "process_request",
            "label": "Process Request",
            "type": "component",
            "link": null
        },
        {
            "id": "load_model",
            "label": "Load Model",
            "type": "component",
            "link": null
        },
        {
            "id": "get_runner",
            "label": "Get or Allocate Runner",
            "type": "component",
            "link": null
        },
        {
            "id": "handle_cancellation",
            "label": "Monitor Request Cancellation",
            "type": "component",
            "link": null
        },
        {
            "id": "dispatch_response",
            "label": "Dispatch Response",
            "type": "component",
            "link": null
        },
        {
            "id": "model_management",
            "label": "Scheduler Model Management",
            "type": "external",
            "link": "scheduler_model_management.md"
        },
        {
            "id": "model_runtime",
            "label": "Model Runtime & Inference",
            "type": "external",
            "link": "model_runtime_and_inference.md"
        }
    ],
    "edges": [
        {
            "source": "incoming_request",
            "target": "request_queue",
            "label": "submits"
        },
        {
            "source": "request_queue",
            "target": "process_request",
            "label": "pulls"
        },
        {
            "source": "process_request",
            "target": "get_runner",
            "label": "requests runner"
        },
        {
            "source": "get_runner",
            "target": "load_model",
            "label": "triggers load (if new)"
        },
        {
            "source": "load_model",
            "target": "model_runtime",
            "label": "loads model to"
        },
        {
            "source": "model_runtime",
            "target": "get_runner",
            "label": "provides runner"
        },
        {
            "source": "get_runner",
            "target": "process_request",
            "label": "returns runner"
        },
        {
            "source": "process_request",
            "target": "dispatch_response",
            "label": "sends outcome"
        },
        {
            "source": "process_request",
            "target": "handle_cancellation",
            "label": "monitors for"
        },
        {
            "source": "handle_cancellation",
            "target": "process_request",
            "label": "signals cancellation"
        },
        {
            "source": "process_request",
            "target": "model_management",
            "label": "interacts with"
        },
        {
            "source": "load_model",
            "target": "dispatch_response",
            "label": "sends load error"
        }
    ],
    "groups": [
        {
            "id": "request_flow",
            "label": "Request Processing Flow",
            "role": "analytical",
            "nodes": [
                "incoming_request",
                "request_queue",
                "process_request",
                "dispatch_response",
                "handle_cancellation"
            ]
        },
        {
            "id": "model_ops",
            "label": "Model Operations",
            "role": "generative",
            "nodes": [
                "load_model",
                "get_runner"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph request_flow["Request Processing Flow"]
        incoming_request["Incoming Model Request"]
        request_queue[("Request Queue")]
        process_request["Process Request"]
        handle_cancellation["Monitor Request Cancellation"]
        dispatch_response["Dispatch Response"]
    end

    subgraph model_ops["Model Operations"]
        load_model["Load Model"]
        get_runner["Get or Allocate Runner"]
    end

    model_management["Scheduler Model Management"]
    model_runtime["Model Runtime & Inference"]

    incoming_request -->|"submits"| request_queue
    request_queue -->|"pulls"| process_request
    process_request -->|"requests runner"| get_runner
    get_runner -->|"triggers load (if new)"| load_model
    load_model -->|"loads model to"| model_runtime
    model_runtime -->|"provides runner"| get_runner
    get_runner -->|"returns runner"| process_request
    process_request -->|"sends outcome"| dispatch_response
    process_request -->|"monitors for"| handle_cancellation
    handle_cancellation -.->|"signals cancellation"| process_request
    process_request -->|"interacts with"| model_management
    load_model -->|"sends load error"| dispatch_response

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef component fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f

    class incoming_request,process_request,handle_cancellation,dispatch_response analytical
    class request_queue data
    class load_model,get_runner generative

    click model_management "scheduler_model_management.md" "View Scheduler Model Management Module"
    click model_runtime "model_runtime_and_inference.md" "View Model Runtime & Inference Module"
```