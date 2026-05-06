# `content_evaluators` Module Documentation

## Introduction

The `content_evaluators` module, part of the `pydantic_evals_framework`, provides fundamental evaluators for assessing the content and type of outputs. These evaluators are crucial for verifying that generated content meets specific criteria, such as containing certain substrings or being of a particular type. This module is a leaf module within the evaluation framework, offering concrete implementations for common content-based checks.

## Core Functionality

This module implements two key content evaluators: `Contains` and `IsInstance`. Both extend the base `Evaluator` class from the [evaluator_core module](evaluator_core.md).

### `Contains` Evaluator

The `Contains` evaluator checks if an output object contains a specified value. Its behavior is context-dependent:

*   **Strings**: Determines if the `expected_output` is a substring of the actual `output`. It supports case-sensitive and case-insensitive checks.
*   **Lists/Tuples**: Checks if the `expected_output` is an element within the list or tuple.
*   **Dictionaries**: Verifies if all key-value pairs specified in `expected_output` are present and match in the `output` dictionary. It can also check if a specific value exists as a key in the output dictionary.
*   **Model-like Types (Pydantic, Dataclasses)**: Converts the model-like output to a dictionary and performs key-value pair checks similar to dictionaries. This leverages utilities from the [type_introspection module](type_introspection.md) to identify model-like structures and Pydantic's `TypeAdapter` for conversion.

#### Configuration Parameters:
- `value`: The expected content or value to check for.
- `case_sensitive`: A boolean indicating if string comparisons should be case-sensitive (default: `True`).
- `as_strings`: A boolean forcing both output and expected value to be converted to strings before comparison (default: `False`).
- `evaluation_name`: An optional string to name the evaluation.

### `IsInstance` Evaluator

The `IsInstance` evaluator checks if the output object is an instance of a type with a given name. It traverses the Method Resolution Order (MRO) of the output object's type to find a matching class name or qualified name.

#### Configuration Parameters:
- `type_name`: The string name of the type (e.g., "str", "MyClass") to check against.
- `evaluation_name`: An optional string to name the evaluation.

## Module Architecture

The `content_evaluators` module is designed to be straightforward, providing concrete evaluator implementations that plug into the broader evaluation framework. It depends on the `evaluator_core` for its base class definitions and on `type_introspection` for advanced type checks in the `Contains` evaluator.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "contains_evaluator",
            "label": "Contains Evaluator",
            "type": "component",
            "link": null
        },
        {
            "id": "is_instance_evaluator",
            "label": "IsInstance Evaluator",
            "type": "component",
            "link": null
        },
        {
            "id": "evaluator_core",
            "label": "Evaluator Core",
            "type": "external",
            "link": "evaluator_core.md"
        },
        {
            "id": "type_introspection",
            "label": "Type Introspection Utilities",
            "type": "external",
            "link": "type_introspection.md"
        }
    ],
    "edges": [
        {
            "source": "contains_evaluator",
            "target": "evaluator_core",
            "label": "extends"
        },
        {
            "source": "is_instance_evaluator",
            "target": "evaluator_core",
            "label": "extends"
        },
        {
            "source": "contains_evaluator",
            "target": "type_introspection",
            "label": "uses 'is_model_like' from"
        }
    ],
    "groups": []
}
-->
```mermaid
flowchart TD
    %% Evaluator Components
    contains_evaluator["Contains Evaluator"]
    is_instance_evaluator["IsInstance Evaluator"]

    %% External Dependencies
    evaluator_core["Evaluator Core"]:::external
    type_introspection["Type Introspection Utilities"]:::external

    %% Component Relationships
    contains_evaluator --|"extends"| evaluator_core
    is_instance_evaluator --|"extends"| evaluator_core
    contains_evaluator -.->|"uses 'is_model_like' from"| type_introspection

    %% Link external nodes
    click evaluator_core "evaluator_core.md"
    click type_introspection "type_introspection.md"

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```