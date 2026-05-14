# MCP E2E Test


A real diagram created via MCP call from Cursor agent.

<!-- DIAGRAM_JSON
{
  "direction": "LR",
  "nodes": [
    {
      "id": "user",
      "label": "User",
      "type": "external",
      "link": null
    },
    {
      "id": "api",
      "label": "API Gateway",
      "type": "module",
      "link": "api.md"
    },
    {
      "id": "auth",
      "label": "Auth Service",
      "type": "component",
      "link": null
    },
    {
      "id": "db",
      "label": "Database",
      "type": "external",
      "link": null
    },
    {
      "id": "cache",
      "label": "Redis Cache",
      "type": "external",
      "link": null
    },
    {
      "id": "worker",
      "label": "Background Worker",
      "type": "component",
      "link": null
    },
    {
      "id": "queue",
      "label": "Message Queue",
      "type": "external",
      "link": null
    },
    {
      "id": "monitor",
      "label": "Monitoring",
      "type": "component",
      "link": null
    }
  ],
  "edges": [
    {
      "source": "user",
      "target": "api",
      "label": "HTTP"
    },
    {
      "source": "api",
      "target": "auth",
      "label": "validate"
    },
    {
      "source": "api",
      "target": "db",
      "label": "query"
    },
    {
      "source": "api",
      "target": "cache",
      "label": "read/write"
    },
    {
      "source": "api",
      "target": "worker",
      "label": "enqueue"
    },
    {
      "source": "worker",
      "target": "db",
      "label": "process"
    },
    {
      "source": "worker",
      "target": "queue",
      "label": "publish"
    },
    {
      "source": "queue",
      "target": "api",
      "label": "events"
    },
    {
      "source": "monitor",
      "target": "api",
      "label": "health"
    },
    {
      "source": "monitor",
      "target": "db",
      "label": "metrics"
    }
  ],
  "groups": [
    {
      "id": "g_backend",
      "label": "Backend Services",
      "nodes": [
        "api",
        "auth",
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
    },
    {
      "id": "g_infra",
      "label": "Infrastructure",
      "nodes": [
        "queue",
        "monitor"
      ]
    }
  ]
}
-->
