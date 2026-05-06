# Prompts and Examples Module
This module provides foundational components for defining, managing, and formatting prompts, including various template types, chat message structures, and mechanisms for few-shot example selection and dynamic prompt loading.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "prompt_definitions",
            "label": "Define Prompt Structures",
            "type": "module",
            "link": "prompt_definitions.md"
        },
        {
            "id": "few_shot_and_examples",
            "label": "Manage Few-Shot Examples",
            "type": "module",
            "link": "few_shot_and_examples.md"
        },
        {
            "id": "prompt_utilities",
            "label": "Load and Format Prompts",
            "type": "module",
            "link": "prompt_utilities.md"
        },
        {
            "id": "models_and_embeddings",
            "label": "Language Models and Embeddings",
            "type": "external",
            "link": "models_and_embeddings.md"
        },
        {
            "id": "output_parsing",
            "label": "Output Parsing",
            "type": "external",
            "link": "output_parsing.md"
        }
    ],
    "edges": [
        {
            "source": "prompt_definitions",
            "target": "few_shot_and_examples",
            "label": "uses base templates"
        },
        {
            "source": "few_shot_and_examples",
            "target": "models_and_embeddings",
            "label": "uses embeddings for selection"
        },
        {
            "source": "prompt_definitions",
            "target": "output_parsing",
            "label": "configures output parser"
        },
        {
            "source": "prompt_utilities",
            "target": "prompt_definitions",
            "label": "loads and formats"
        }
    ],
    "groups": [
        {
            "id": "prompt_construction",
            "label": "Prompt Construction",
            "role": "analytical",
            "nodes": [
                "prompt_definitions"
            ]
        },
        {
            "id": "example_management",
            "label": "Example Management",
            "role": "analytical",
            "nodes": [
                "few_shot_and_examples"
            ]
        },
        {
            "id": "prompt_operations",
            "label": "Prompt Operations",
            "role": "analytical",
            "nodes": [
                "prompt_utilities"
            ]
        },
        {
            "id": "external_deps",
            "label": "Dependencies",
            "role": "data",
            "nodes": [
                "models_and_embeddings",
                "output_parsing"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph prompt_construction["Prompt Construction"]
        prompt_definitions["Define Prompt Structures"]
    end

    subgraph example_management["Example Management"]
        few_shot_and_examples["Manage Few-Shot Examples"]
    end

    subgraph prompt_operations["Prompt Operations"]
        prompt_utilities["Load and Format Prompts"]
    end

    subgraph external_deps["Dependencies"]
        models_and_embeddings["Language Models and Embeddings"]
        output_parsing["Output Parsing"]
    end

    prompt_definitions -->|'uses base templates'| few_shot_and_examples
    few_shot_and_examples -->|'uses embeddings for selection'| models_and_embeddings
    prompt_definitions -->|'configures output parser'| output_parsing
    prompt_utilities -->|'loads and formats'| prompt_definitions

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class prompt_definitions,few_shot_and_examples,prompt_utilities analytical
    class models_and_embeddings,output_parsing data

    click prompt_definitions "prompt_definitions.md"
    click few_shot_and_examples "few_shot_and_examples.md"
    click prompt_utilities "prompt_utilities.md"
    click models_and_embeddings "models_and_embeddings.md"
    click output_parsing "output_parsing.md"
```