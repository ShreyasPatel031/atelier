# Optimizers Module

This module provides a suite of advanced teleprompters for optimizing DSPy programs, encompassing strategies for prompt evolution, few-shot demonstration management, and fine-tuning, to significantly enhance program performance.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "program_optimization_parent",
            "label": "Parent: Program Optimization",
            "type": "external"
        },
        {
            "id": "prompt_strategies",
            "label": "Prompt Strategy Evolution",
            "type": "module",
            "link": "prompt_strategies.md"
        },
        {
            "id": "demo_and_finetune",
            "label": "Demonstration & Model Refinement",
            "type": "module",
            "link": "demo_and_finetune.md"
        },
        {
            "id": "meta_optimizers",
            "label": "Orchestrated Optimization",
            "type": "module",
            "link": "meta_optimizers.md"
        }
    ],
    "edges": [
        {
            "source": "program_optimization_parent",
            "target": "prompt_strategies",
            "label": "defines objectives for"
        },
        {
            "source": "program_optimization_parent",
            "target": "demo_and_finetune",
            "label": "provides resources to"
        },
        {
            "source": "program_optimization_parent",
            "target": "meta_optimizers",
            "label": "integrates"
        },
        {
            "source": "meta_optimizers",
            "target": "prompt_strategies",
            "label": "orchestrates"
        },
        {
            "source": "meta_optimizers",
            "target": "demo_and_finetune",
            "label": "selects from"
        }
    ],
    "groups": [
        {
            "id": "core_optimization_methods",
            "label": "Core Optimization Methods",
            "role": "analytical",
            "nodes": [
                "prompt_strategies",
                "demo_and_finetune"
            ]
        },
        {
            "id": "meta_control",
            "label": "Meta-Control",
            "role": "generative",
            "nodes": [
                "meta_optimizers"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    program_optimization_parent['''Parent: Program Optimization''']:::external

    subgraph core_optimization_methods['''Core Optimization Methods''']
        prompt_strategies['''Prompt Strategy Evolution''']:::generative
        demo_and_finetune['''Demonstration & Model Refinement''']:::analytical
    end

    subgraph meta_control['''Meta-Control''']
        meta_optimizers['''Orchestrated Optimization''']:::analytical
    end

    program_optimization_parent -->|'''defines objectives for'''| prompt_strategies
    program_optimization_parent -->|'''provides resources to'''| demo_and_finetune
    program_optimization_parent -->|'''integrates'''| meta_optimizers

    meta_optimizers -->|'''orchestrates'''| prompt_strategies
    meta_optimizers -->|'''selects from'''| demo_and_finetune

    click prompt_strategies "prompt_strategies.md"
    click demo_and_finetune "demo_and_finetune.md"
    click meta_optimizers "meta_optimizers.md"

    classDef external fill:#ccfbf1,stroke:#2dd4bf,stroke-width:1px,color:#0f766e
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
```