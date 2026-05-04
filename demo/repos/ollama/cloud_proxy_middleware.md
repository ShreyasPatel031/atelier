# Cloud Proxy Middleware

This middleware intercepts incoming HTTP requests, decompresses Zstd-encoded bodies, checks for size limits, identifies if the request targets a cloud model, and either proxies it to an external cloud service or passes it to local server handlers.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "http_request",
            "label": "HTTP Request",
            "type": "external",
            "link": null
        },
        {
            "id": "decompress_zstd",
            "label": "Decompress Zstd Body",
            "type": "component",
            "link": null
        },
        {
            "id": "check_size",
            "label": "Check Body Size Limit",
            "type": "component",
            "link": null
        },
        {
            "id": "identify_cloud_model",
            "label": "Identify Cloud Model",
            "type": "component",
            "link": null
        },
        {
            "id": "proxy_cloud_service",
            "label": "Cloud Proxy Service",
            "type": "external",
            "link": null
        },
        {
            "id": "local_processing",
            "label": "Local Request Processing",
            "type": "component",
            "link": null
        },
        {
            "id": "error_response",
            "label": "Error Response (400)",
            "type": "component",
            "link": null
        },
        {
            "id": "server_management",
            "label": "Server Management Module",
            "type": "external",
            "link": "server_management.md"
        }
    ],
    "edges": [
        {
            "source": "http_request",
            "target": "decompress_zstd",
            "label": "receives"
        },
        {
            "source": "decompress_zstd",
            "target": "check_size",
            "label": "decompressed body"
        },
        {
            "source": "check_size",
            "target": "identify_cloud_model",
            "label": "size OK"
        },
        {
            "source": "check_size",
            "target": "error_response",
            "label": "body too large"
        },
        {
            "source": "identify_cloud_model",
            "target": "proxy_cloud_service",
            "label": "cloud model"
        },
        {
            "source": "identify_cloud_model",
            "target": "local_processing",
            "label": "local model"
        },
        {
            "source": "decompress_zstd",
            "target": "server_management",
            "label": "integrates with"
        }
    ],
    "groups": [
        {
            "id": "middleware_logic",
            "label": "Cloud Proxy Logic",
            "role": "analytical",
            "nodes": [
                "decompress_zstd",
                "check_size",
                "identify_cloud_model"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    http_request["HTTP Request"]

    subgraph middleware_logic["Cloud Proxy Logic"]
        decompress_zstd["Decompress Zstd Body"]
        check_size["Check Body Size Limit"]
        identify_cloud_model["Identify Cloud Model"]
    end

    proxy_cloud_service["Cloud Proxy Service"]

    local_processing["Local Request Processing"]

    error_response["Error Response (400)"]

    server_management["Server Management Module"]

    http_request ==>|"receives"| decompress_zstd
    decompress_zstd -->|"decompressed body"| check_size
    check_size -->|"size OK"| identify_cloud_model
    check_size -->|"body too large"| error_response
    identify_cloud_model -->|"cloud model"| proxy_cloud_service
    identify_cloud_model -->|"local model"| local_processing
    decompress_zstd -.->|"integrates with"| server_management

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef external fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e

    class http_request external
    class proxy_cloud_service external
    class server_management external
    class decompress_zstd,check_size,identify_cloud_model analytical
    class local_processing,error_response analytical
```