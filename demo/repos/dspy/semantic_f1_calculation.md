# `semantic_f1_calculation` Module Documentation

## Introduction

The `semantic_f1_calculation` module provides the `SemanticF1` class, a key component within the auto-evaluation framework of DSPy. This module enables the computation of a semantic F1 score between a predicted response and a ground truth, leveraging LLM-based precision and recall metrics. It is particularly useful for evaluating the quality of generated text in a nuanced way that goes beyond simple exact matches.

## Architecture and Component Relationships

The `SemanticF1` class is built upon other core DSPy components to perform its evaluation task. It inherits from `dspy.primitives.module.Module`, establishing it as a fundamental building block in DSPy programs. Its core logic relies on either `SemanticRecallPrecision` or `DecompositionalSemanticRecallPrecision`, both of which are wrapped by a `ChainOfThought` prediction strategy. This allows `SemanticF1` to intelligently evaluate semantic alignment by prompting an LLM to assess precision and recall.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "semantic_f1_calculator", "label": "SemanticF1 Calculator", "type": "component", "link": null},
        {"id": "semantic_recall_precision", "label": "SemanticRecallPrecision", "type": "external", "link": "recall_precision_signatures.md"},
        {"id": "decompositional_semantic_recall_precision", "label": "DecompositionalSemanticRecallPrecision", "type": "external", "link": "recall_precision_signatures.md"},
        {"id": "chain_of_thought", "label": "ChainOfThought Strategy", "type": "external", "link": "dspy_prediction_strategies.md"},
        {"id": "base_module", "label": "BaseModule", "type": "external", "link": "dspy_primitives.md"},
        {"id": "prediction", "label": "Prediction Output", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "base_module", "target": "semantic_f1_calculator", "label": "inherits"},
        {"source": "semantic_f1_calculator", "target": "chain_of_thought", "label": "uses"},
        {"source": "chain_of_thought", "target": "semantic_recall_precision", "label": "wraps (default)"},
        {"source": "chain_of_thought", "target": "decompositional_semantic_recall_precision", "label": "wraps (if decompositional)"},
        {"source": "semantic_f1_calculator", "target": "prediction", "label": "produces"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    base_module[BaseModule]
    semantic_f1_calculator[SemanticF1 Calculator]
    chain_of_thought[ChainOfThought Strategy]
    semantic_recall_precision[SemanticRecallPrecision]
    decompositional_semantic_recall_precision[DecompositionalSemanticRecallPrecision]
    prediction[Prediction Output]

    base_module -->|inherits| semantic_f1_calculator
    semantic_f1_calculator -->|uses| chain_of_thought
    chain_of_thought -->|wraps (default)| semantic_recall_precision
    chain_of_thought -->|wraps (if decompositional)| decompositional_semantic_recall_precision
    semantic_f1_calculator -->|produces| prediction
```

## Core Functionality

### `SemanticF1` Class

- **Description**: This class is designed to compute the semantic F1 score. It leverages LLMs to determine the precision and recall of a predicted response against a ground truth, offering a more robust evaluation than traditional lexical metrics.

- **Initialization (`__init__`)**:
    - `threshold` (float, optional): Sets the minimum F1 score considered acceptable during optimization processes. Defaults to `0.66`.
    - `decompositional` (bool, optional): If `True`, the class utilizes `DecompositionalSemanticRecallPrecision` for a more granular, decomposed evaluation of recall and precision. Otherwise, it defaults to `SemanticRecallPrecision`. Both underlying modules are wrapped by `ChainOfThought` to enable multi-step reasoning by the LLM.

- **`forward` Method**:
    - **Parameters**:
        - `example`: An object containing the `question` and `response` (ground truth).
        - `pred`: An object containing the `response` (system prediction).
        - `trace` (optional): If provided, the method returns a boolean indicating if the computed F1 score meets or exceeds the `threshold`; otherwise, it returns the raw F1 score.
    - **Process**:
        1. It invokes the internal `self.module` (either `ChainOfThought(SemanticRecallPrecision)` or `ChainOfThought(DecompositionalSemanticRecallPrecision)`) with the `question`, `ground_truth` from the `example`, and `system_response` from `pred`.
        2. It calculates the F1 score using the `precision` and `recall` values returned by the `self.module`.
        3. Returns a `Prediction` object. The `score` attribute of this `Prediction` will be the raw F1 score if `trace` is `None`, or a boolean (`score >= self.threshold`) if `trace` is provided.

## How the Module Fits into the Overall System

The `semantic_f1_calculation` module, through its `SemanticF1` class, plays a crucial role in the `auto_metrics` sub-system of `dspy_evaluation`. It provides an advanced, LLM-driven metric for automatically assessing the quality of generative models. By offering a semantic understanding of correctness, it helps in fine-tuning and optimizing DSPy programs where traditional metrics might fall short in capturing the nuances of natural language generation. Its integration with `ChainOfThought` and the underlying semantic precision/recall modules allows for sophisticated and explainable evaluation processes, ultimately contributing to more robust and accurate DSPy applications.

For more details on the underlying semantic recall and precision mechanisms, refer to the [recall_precision_signatures module documentation](recall_precision_signatures.md).
For general information on prediction strategies, see the [dspy_prediction_strategies module documentation](dspy_prediction_strategies.md).
For details on the base module structure, refer to the [dspy_primitives module documentation](dspy_primitives.md).