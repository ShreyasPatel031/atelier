# Atelier — CodeWiki workspace


Layout of this repository: the codewiki Python package (CLI, backend pipeline, FastAPI app, MCP integration, templates), the static demo viewer, the Vercel serverless API, and supporting tests/scripts/docker/benchmarking.

<!-- DIAGRAM_JSON
{
  "direction": "LR",
  "nodes": [
    {
      "id": "cli",
      "label": "CLI",
      "type": "module",
      "link": "cli.md"
    },
    {
      "id": "backend",
      "label": "Backend",
      "type": "module",
      "link": "backend.md"
    },
    {
      "id": "frontend",
      "label": "FastAPI",
      "type": "module",
      "link": "frontend.md"
    },
    {
      "id": "mcp",
      "label": "MCP",
      "type": "module",
      "link": "mcp.md"
    },
    {
      "id": "templates",
      "label": "Templates",
      "type": "module",
      "link": "templates.md"
    },
    {
      "id": "demo",
      "label": "Demo viewer",
      "type": "module",
      "link": "demo.md"
    },
    {
      "id": "api",
      "label": "Vercel /api",
      "type": "module",
      "link": "api.md"
    },
    {
      "id": "tests",
      "label": "tests",
      "type": "module",
      "link": "tests.md"
    },
    {
      "id": "scripts",
      "label": "scripts",
      "type": "module",
      "link": "scripts.md"
    },
    {
      "id": "docker",
      "label": "docker",
      "type": "module",
      "link": "docker.md"
    },
    {
      "id": "benchmarking",
      "label": "benchmarking",
      "type": "module",
      "link": "benchmarking.md"
    },
    {
      "id": "pkg",
      "label": "pyproject / workspace",
      "type": "external",
      "link": null
    }
  ],
  "edges": [
    {
      "source": "cli",
      "target": "backend",
      "label": "generate"
    },
    {
      "source": "frontend",
      "target": "backend",
      "label": "jobs"
    },
    {
      "source": "backend",
      "target": "templates",
      "label": "render"
    },
    {
      "source": "backend",
      "target": "demo",
      "label": "IR / assets"
    },
    {
      "source": "mcp",
      "target": "demo",
      "label": "repos/"
    },
    {
      "source": "api",
      "target": "demo",
      "label": "job paths"
    },
    {
      "source": "api",
      "target": "backend",
      "label": "agent JSON"
    },
    {
      "source": "tests",
      "target": "backend"
    },
    {
      "source": "scripts",
      "target": "mcp"
    },
    {
      "source": "docker",
      "target": "backend"
    },
    {
      "source": "benchmarking",
      "target": "backend"
    },
    {
      "source": "pkg",
      "target": "cli",
      "label": "codewiki"
    }
  ],
  "groups": [
    {
      "id": "g_pkg",
      "label": "Python package",
      "nodes": [
        "cli",
        "backend",
        "frontend",
        "mcp",
        "templates"
      ]
    },
    {
      "id": "g_delivery",
      "label": "Viewer & API",
      "nodes": [
        "demo",
        "api"
      ]
    },
    {
      "id": "g_eng",
      "label": "Repo tooling",
      "nodes": [
        "tests",
        "scripts",
        "docker",
        "benchmarking",
        "pkg"
      ]
    }
  ]
}
-->
