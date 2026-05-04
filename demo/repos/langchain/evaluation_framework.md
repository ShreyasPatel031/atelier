# Evaluation Framework
This module provides a comprehensive framework for evaluating language model outputs and agent trajectories, including various concrete evaluator implementations and tools for running evaluations on datasets.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "core_evaluators",
            "label": "Core Evaluator Implementations",
            "type": "module",
            "link": "core_evaluators.md"
        },
        {
            "id": "evaluation_framework_orchestration",
            "label": "Evaluation Framework & Orchestration",
            "type": "module",
            "link": "evaluation_framework_orchestration.md"
        }
    ],
    "edges": [
        {
            "source": "evaluation_framework_orchestration",
            "target": "core_evaluators",
            "label": "utilizes"
        }
    ],
    "groups": [
        {
            "id": "eval_impl",
            "label": "Evaluator Implementations",
            "role": "analytical",
            "nodes": [
                "core_evaluators"
            ]
        },
        {
            "id": "eval_orch",
            "label": "Framework and Orchestration",
            "role": "analytical",
            "nodes": [
                "evaluation_framework_orchestration"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph eval_impl["Evaluator Implementations"]
        core_evaluators["Core Evaluator Implementations"]
    end
    subgraph eval_orch["Evaluation Framework and Orchestration"]
        evaluation_framework_orchestration["Evaluation Framework and Orchestration"]
    end
    evaluation_framework_orchestration -->|"utilizes"| core_evaluators

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class core_evaluators,evaluation_framework_orchestration analytical

    click core_evaluators "core_evaluators.md" "View Core Evaluator Implementations Module"
    click evaluation_framework_orchestration "evaluation_framework_orchestration.md" "View Evaluation Framework and Orchestration Module"
```