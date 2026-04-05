# `dataset_generation`

This module is responsible for programmatically generating synthetic datasets using Large Language Models (LLMs) based on predefined schemas. It automates the creation of test cases for evaluation purposes, ensuring that generated data conforms to specified input, output, and metadata types.

## Core Functionality

The `dataset_generation` module provides the primary function `generate_dataset`, which orchestrates the process of creating structured datasets. This function leverages an AI agent to interact with an LLM, guiding it to produce examples that adhere to a given Pydantic `Dataset` schema.

### `generate_dataset`

The `generate_dataset` function is the main entry point for generating datasets. It takes a `Dataset` type, an optional file path for saving, custom evaluators, a model specification, the number of examples to generate, and additional instructions for the LLM. It returns a populated `Dataset` object.

**Key operations performed by `generate_dataset`:**
- **Schema Generation:** It constructs a comprehensive JSON schema from the provided `dataset_type` and any `custom_evaluator_types`.
- **Agent Initialization:** An `Agent` from the [pydantic_ai_agent_core](pydantic_ai_agent_core.md) module is initialized with the specified LLM and a system prompt that includes the generated JSON schema and instructions for generating examples.
- **LLM Interaction:** The agent runs with the provided extra instructions, obtaining a raw output from the LLM.
- **Output Parsing and Validation:** The LLM's response, expected to be a JSON string, is stripped of markdown fences and parsed into the specified `Dataset` type. This step includes rigorous validation against the generated schema.
- **Dataset Persistence:** If a `path` is provided, the generated and validated dataset is saved to a file.

## Architecture and Component Relationships

The `dataset_generation` module is a leaf module within the `dataset_management` sub-module of `pydantic_evals_core`. It primarily depends on external modules for its core operations, including AI agent capabilities, model interactions, and dataset definitions.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "generate_dataset_func", "label": "generate_dataset", "type": "component", "link": null},
        {"id": "dataset_definition", "label": "Dataset Definition (dataset_definition.md)", "type": "external", "link": "dataset_definition.md"},
        {"id": "pydantic_ai_models", "label": "Pydantic AI Models (pydantic_ai_models.md)", "type": "external", "link": "pydantic_ai_models.md"},
        {"id": "pydantic_evals_evaluators", "label": "Pydantic Evals Evaluators (pydantic_evals_evaluators.md)", "type": "external", "link": "pydantic_evals_evaluators.md"},
        {"id": "agent_definition", "label": "Agent Definition (agent_definition.md)", "type": "external", "link": "agent_definition.md"}
    ],
    "edges": [
        {"source": "generate_dataset_func", "target": "dataset_definition"},
        {"source": "generate_dataset_func", "target": "pydantic_ai_models"},
        {"source": "generate_dataset_func", "target": "pydantic_evals_evaluators"},
        {"source": "generate_dataset_func", "target": "agent_definition"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    generate_dataset_func[generate_dataset]
    dataset_definition[Dataset Definition (dataset_definition.md)]
    pydantic_ai_models[Pydantic AI Models (pydantic_ai_models.md)]
    pydantic_evals_evaluators[Pydantic Evals Evaluators (pydantic_evals_evaluators.md)]
    agent_definition[Agent Definition (agent_definition.md)]
    generate_dataset_func --> dataset_definition
    generate_dataset_func --> pydantic_ai_models
    generate_dataset_func --> pydantic_evals_evaluators
    generate_dataset_func --> agent_definition
```

## How the Module Fits into the Overall System

The `dataset_generation` module plays a crucial role in the `pydantic_evals_core` system by providing the means to create synthetic datasets for testing and evaluation. It acts as a bridge between the evaluation framework and powerful LLMs, enabling the rapid generation of diverse test cases without manual effort.

- **Dependency on `dataset_definition`:** It relies on the `Dataset` class defined in the [dataset_definition](dataset_definition.md) module to understand the structure and validation rules for the datasets it generates.
- **Interaction with `pydantic_ai_models`:** It uses models configured within the [pydantic_ai_models](pydantic_ai_models.md) module to perform the actual text generation via an LLM.
- **Integration with `pydantic_evals_evaluators`:** It can incorporate custom evaluators from the [pydantic_evals_evaluators](pydantic_evals_evaluators.md) module during schema generation, ensuring the generated data is suitable for specific evaluation criteria.
- **Leveraging `agent_definition`:** The core logic for interacting with the LLM is encapsulated within an `Agent` instance, provided by the [agent_definition](agent_definition.md) module, which handles prompts, retries, and output processing.

This module is essential for automated testing pipelines and for scenarios where a large variety of structured test data is needed quickly, making the evaluation process more robust and efficient.
