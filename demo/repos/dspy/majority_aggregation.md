# majority_aggregation Module Documentation

## Introduction
The `majority_aggregation` module, part of the `dspy.predict.aggregation` package, provides a core utility for aggregating multiple predictions or completions into a single, most representative outcome. This module is essential for scenarios where multiple attempts or alternative generation paths are explored, and a consensus needs to be reached from the resulting candidates.

## Purpose and Core Functionality
The primary purpose of `majority_aggregation` is to implement a majority voting mechanism for selecting the most common completion from a set of generated outputs. It focuses on a specified field within these completions, allowing for normalization of values before counting to ensure consistent aggregation. In cases of ties, the module prioritizes earlier completions, ensuring deterministic behavior.

The module exposes the following core component:

### `majority` function
The `majority` function is the central piece of this module. It takes a collection of predictions or completions and identifies the most frequent value for a given field after optional normalization.

**Key features:**
-   **Flexible Input:** Accepts `Prediction` objects, `Completions` objects, or a simple list of completion dictionaries.
-   **Field Specification:** Allows specifying the target field for aggregation. If not provided, it defaults to the last output field defined in the signature or the last key in the first completion.
-   **Custom Normalization:** Supports a `normalize` function (defaulting to `default_normalize` from the [default_normalization.md](default_normalization.md) module) to standardize completion values before counting. This is crucial for handling variations in output that should be considered equivalent (e.g., "True" vs. "true").
-   **Tie-breaking:** In the event of a tie in vote counts, the function prioritizes the completion that appeared earlier in the input list.
-   **Output:** Returns a `Prediction` object containing the first completion that matches the determined majority value.

## Architecture and Component Relationships

The `majority_aggregation` module is a leaf module within the `dspy_prediction_strategies` family, specifically nested under `prediction_aggregation`. It relies on external utilities for normalization and fundamental DSPy data structures for input/output.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "majority_function", "label": "majority(prediction_or_completions, ...)", "type": "component", "link": null},
        {"id": "default_normalize", "label": "default_normalize (from default_normalization)", "type": "external", "link": "default_normalization.md"},
        {"id": "Prediction", "label": "Prediction Type (from dspy_prediction_strategies)", "type": "external", "link": "dspy_prediction_strategies.md"},
        {"id": "Completions", "label": "Completions Type (from dspy_prediction_strategies)", "type": "external", "link": "dspy_prediction_strategies.md"}
    ],
    "edges": [
        {"source": "majority_function", "target": "default_normalize"},
        {"source": "majority_function", "target": "Prediction"},
        {"source": "majority_function", "target": "Completions"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    majority_function[majority(prediction_or_completions, ...)]
    default_normalize[default_normalize (from default_normalization)]
    Prediction[Prediction Type (from dspy_prediction_strategies)]
    Completions[Completions Type (from dspy_prediction_strategies)]
    majority_function --> default_normalize
    majority_function --> Prediction
    majority_function --> Completions
```

**Explanation of Relationships:**
-   **`majority_function`**: The central function of this module, responsible for performing the aggregation logic.
-   **`default_normalize`**: An external function from the `default_normalization` module that `majority` uses to standardize values before counting, ensuring accurate aggregation.
-   **`Prediction` and `Completions`**: These are fundamental DSPy data types that the `majority` function accepts as input and returns as output. They are part of the broader `dspy_prediction_strategies` system.

## How it Fits into the Overall System
The `majority_aggregation` module plays a crucial role in DSPy's prediction strategies, particularly within multi-turn or multi-candidate generation pipelines. It enables robust decision-making by consolidating diverse outputs into a single, confident prediction. This is particularly valuable in:
-   **Self-refinement loops:** When a language model generates multiple answers or attempts, `majority_aggregation` can pick the most consistent one.
-   **Ensemble methods:** Combining outputs from multiple models or different prompting strategies.
-   **Robustness against noise:** Mitigating individual errors or inconsistencies by favoring the most common response.

By providing a reliable method for aggregating results, `majority_aggregation` enhances the overall stability and accuracy of DSPy programs that involve generating and selecting from multiple candidate outputs. It directly supports the `prediction_aggregation` module's goal of synthesizing information from various prediction sources.
