# `experiment_validator` Module Documentation

## Introduction

The `experiment_validator` module is a critical component within the `crewai_experimental_evaluation` framework, designed to ensure the integrity and quality of experimental runs. Its primary purpose is to validate the outcomes of experiments against predefined criteria and prevent regressions when compared to established baselines.

## Core Functionality

The `experiment_validator` module exposes the following core functionality:

### `assert_experiment_successfully`

```python
def assert_experiment_successfully(
    experiment_results: ExperimentResults, baseline_filepath: str | None = None
) -> None:
    # ... (implementation details)
```

This function serves as the main entry point for validating experiment results. It performs a two-phase validation process:
1.  **Individual Test Case Validation**: It first iterates through the `experiment_results` to identify any failed test cases. If any test case has not passed (`result.passed` is `False`), it compiles a detailed list of failures and raises an `AssertionError`, halting the validation process.
2.  **Baseline Regression Check**: If all individual test cases pass, the function proceeds to compare the current experiment's results against a specified baseline. This comparison is facilitated by the `compare_with_baseline` method of the `ExperimentResults` object and a subsequent call to `assert_experiment_no_regression`. This step is crucial for detecting any unintended performance degradation or behavioral changes introduced by new experimental configurations.

## Architecture and Component Relationships

The `experiment_validator` module's architecture is centered around its core validation logic, interacting with external data structures to perform its function.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "assert_experiment_successfully", "label": "assert_experiment_successfully()", "type": "component", "link": null},
        {"id": "baseline_comparison", "label": "Baseline Comparison Logic", "type": "component", "link": null},
        {"id": "crewai_experimental_evaluation", "label": "crewai_experimental_evaluation", "type": "external", "link": "crewai_experimental_evaluation.md"}
    ],
    "edges": [
        {"source": "assert_experiment_successfully", "target": "baseline_comparison"},
        {"source": "assert_experiment_successfully", "target": "crewai_experimental_evaluation"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    assert_experiment_successfully[assert_experiment_successfully()]
    baseline_comparison[Baseline Comparison Logic]
    crewai_experimental_evaluation[crewai_experimental_evaluation]

    assert_experiment_successfully --> baseline_comparison
    assert_experiment_successfully --> crewai_experimental_evaluation
```

-   **`assert_experiment_successfully()`**: As the module's primary function, it orchestrates the entire validation workflow.
-   **Baseline Comparison Logic**: This conceptual component encompasses the internal mechanisms for managing baseline file paths (e.g., `_get_baseline_filepath_fallback`) and the logic for comparing current experiment results against a baseline to identify regressions (e.g., `assert_experiment_no_regression`). This ensures that changes do not negatively impact existing, validated behavior.
-   **`crewai_experimental_evaluation`**: This external module (see [crewai_experimental_evaluation.md](crewai_experimental_evaluation.md)) provides the `ExperimentResults` data structure, which is consumed by `assert_experiment_successfully` as input for the validation process. The `ExperimentResults` object holds the detailed outcomes of an experimental run.

## How the module fits into the overall system

The `experiment_validator` module plays a vital role in the broader `crewai_experimental_evaluation` system. It acts as the final gatekeeper in the experiment lifecycle, ensuring that only valid and non-regressive experiment results are accepted. It works in close collaboration with the [experiment_runner](experiment_runner.md) module, which is responsible for executing experiments and generating the `ExperimentResults` that this module then validates. This structured approach to experimentation and validation is fundamental to maintaining the quality and reliability of the CrewAI system, enabling confident iteration and development without introducing unintended side effects.