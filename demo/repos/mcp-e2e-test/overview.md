# MCP E2E Test


4-tool MCP surface verified end-to-end

<!-- DIAGRAM_JSON
{
  "direction": "LR",
  "nodes": [
    {
      "id": "client",
      "label": "Client App",
      "type": "external",
      "link": null
    },
    {
      "id": "gateway",
      "label": "API Gateway",
      "type": "module",
      "link": "gateway.md"
    },
    {
      "id": "auth",
      "label": "Auth Service",
      "type": "module",
      "link": "auth.md"
    },
    {
      "id": "orders",
      "label": "Order Service",
      "type": "component",
      "link": null
    },
    {
      "id": "db",
      "label": "Postgres",
      "type": "external",
      "link": null
    },
    {
      "id": "cache",
      "label": "Redis",
      "type": "external",
      "link": null
    },
    {
      "id": "worker",
      "label": "Background Worker",
      "type": "component",
      "link": null
    }
  ],
  "edges": [
    {
      "source": "client",
      "target": "gateway",
      "label": "HTTPS"
    },
    {
      "source": "gateway",
      "target": "auth",
      "label": "validate"
    },
    {
      "source": "gateway",
      "target": "orders",
      "label": "route"
    },
    {
      "source": "orders",
      "target": "db",
      "label": "query"
    },
    {
      "source": "gateway",
      "target": "cache",
      "label": "session"
    },
    {
      "source": "orders",
      "target": "worker",
      "label": "enqueue"
    },
    {
      "source": "worker",
      "target": "db",
      "label": "process"
    }
  ],
  "groups": [
    {
      "id": "g_api",
      "label": "API Layer",
      "nodes": [
        "gateway",
        "auth"
      ]
    },
    {
      "id": "g_core",
      "label": "Core",
      "nodes": [
        "orders",
        "worker"
      ]
    },
    {
      "id": "g_storage",
      "label": "Storage",
      "nodes": [
        "db",
        "cache"
      ]
    }
  ]
}
-->
