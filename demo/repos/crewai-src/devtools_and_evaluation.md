# DevTools and Evaluation
This module provides a suite of developer tools for managing project versions, facilitating release processes, and ensuring documentation quality, alongside an experimental framework for evaluating agent and crew performance.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "cli_devtools", "label": "CLI DevTools", "type": "module", "link": "cli_devtools.md"},
        {"id": "evaluation_framework", "label": "Evaluation Framework", "type": "module", "link": "evaluation_framework.md"}
    ],
    "edges": [
        {"source": "cli_devtools", "target": "evaluation_framework", "label": "leverages for quality checks"}
    ],
    "groups": [
        {"id": "development_operations", "label": "Development Operations", "role": "surface", "nodes": ["cli_devtools"]},
        {"id": "quality_assurance", "label": "Quality Assurance", "role": "analytical", "nodes": ["evaluation_framework"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph development_operations["Development Operations"]
        cli_devtools["CLI DevTools"]
    end

    subgraph quality_assurance["Quality Assurance"]
        evaluation_framework["Evaluation Framework"]
    end

    cli_devtools -.->|"leverages for quality checks"| evaluation_framework

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class cli_devtools surface
    class evaluation_framework analytical

    click cli_devtools "cli_devtools.md"
    click evaluation_framework "evaluation_framework.md"
```