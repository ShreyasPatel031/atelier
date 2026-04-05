# evaluation_run_management Module Documentation

## Introduction

The `evaluation_run_management` module, found within `langchain_classic.smith.evaluation.runner_utils`, is a crucial component for orchestrating and managing evaluation runs against datasets in the LangChain Smith ecosystem. Its primary function is to encapsulate the state and logic required to execute a model or chain on a given dataset, collect results, apply various evaluators, and finalize the evaluation project.

## Architecture and Component Relationships

The core of this module is the `_DatasetRunContainer` class, which serves as a stateful manager for an evaluation run. It interacts with several internal methods and external LangChain modules to perform its duties, including preparing the run, collecting metrics, executing batch evaluators, and finalizing the results.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "_dataset_run_container", "label": "DatasetRunContainer", "type": "component", "link": null},
        {"id": "prepare", "label": "prepare()", "type": "component", "link": null},
        {"id": "finish", "label": "finish()", "type": "component", "link": null},
        {"id": "_collect_test_results", "label": "_collect_test_results()", "type": "component", "link": null},
        {"id": "_collect_metrics", "label": "_collect_metrics()", "type": "component", "link": null},
        {"id": "_run_batch_evaluators", "label": "_run_batch_evaluators()", "type": "component", "link": null},
        {"id": "_merge_test_outputs", "label": "_merge_test_outputs()", "type": "component", "link": null},
        {"id": "core_runnables", "label": "core_runnables", "type": "external", "link": "core_runnables.md"},
        {"id": "core_callbacks", "label": "core_callbacks", "type": "external", "link": "core_callbacks.md"},
        {"id": "classic_callbacks_tracers", "label": "classic_callbacks_tracers", "type": "external", "link": "classic_callbacks_tracers.md"},
        {"id": "classic_smith_evaluation", "label": "classic_smith_evaluation", "type": "external", "link": "classic_smith_evaluation.md"}
    ],
    "edges": [
        {"source": "prepare", "target": "_dataset_run_container"},
        {"source": "_dataset_run_container", "target": "finish"},
        {"source": "finish", "target": "_collect_test_results"},
        {"source": "_collect_test_results", "target": "_collect_metrics"},
        {"source": "_collect_test_results", "target": "_run_batch_evaluators"},
        {"source": "_collect_test_results", "target": "_merge_test_outputs"},
        {"source": "prepare", "target": "core_runnables"},
        {"source": "prepare", "target": "core_callbacks"},
        {"source": "prepare", "target": "classic_callbacks_tracers"},
        {"source": "prepare", "target": "classic_smith_evaluation"},
        {"source": "_collect_metrics", "target": "classic_callbacks_tracers"},
        {"source": "_collect_metrics", "target": "core_callbacks"},
        {"source": "_run_batch_evaluators", "target": "classic_smith_evaluation"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    prepare[prepare()]
    _dataset_run_container[_DatasetRunContainer]
    finish[finish()]
    _collect_test_results[_collect_test_results()]
    _collect_metrics[_collect_metrics()]
    _run_batch_evaluators[_run_batch_evaluators()]
    _merge_test_outputs[_merge_test_outputs()]
    core_runnables[core_runnables]
    core_callbacks[core_callbacks]
    classic_callbacks_tracers[classic_callbacks_tracers]
    classic_smith_evaluation[classic_smith_evaluation]

    prepare --> _dataset_run_container
    _dataset_run_container --> finish
    finish --> _collect_test_results
    _collect_test_results --> _collect_metrics
    _collect_test_results --> _run_batch_evaluators
    _collect_test_results --> _merge_test_outputs

    prepare --> core_runnables
    prepare --> core_callbacks
    prepare --> classic_callbacks_tracers
    prepare --> classic_smith_evaluation

    _collect_metrics --> classic_callbacks_tracers
    _collect_metrics --> core_callbacks
    _run_batch_evaluators --> classic_smith_evaluation
```

### Core Components

#### `_DatasetRunContainer` Class

This class acts as the central orchestrator for an evaluation run. It holds all necessary state, including the LangSmith client, project details, the wrapped model, examples, run configurations, and batch evaluators. Its methods manage the lifecycle of an evaluation.

*   **`prepare` (Class Method)**: This static method is the entry point for initializing a new evaluation run. It sets up the LangSmith project, fetches the dataset examples, wraps the user-provided model/chain, configures various evaluators (both single-example and batch), and generates `RunnableConfig` objects for each example. These configurations include essential callbacks like `LangChainTracer` (from [core_callbacks.md](core_callbacks.md)) for tracing and `EvaluatorCallbackHandler` (from [classic_callbacks_tracers.md](classic_callbacks_tracers.md)) for capturing evaluation feedback.

*   **`finish`**: This method concludes the evaluation run. It orchestrates the collection of all test results and aggregate metrics, displays a summary if verbose mode is enabled, and attempts to close the LangSmith project by setting its end time.

*   **`_collect_test_results`**: An internal method responsible for gathering all evaluation results after the model runs have completed. It calls `_collect_metrics` to retrieve individual run details and feedback, then potentially `_run_batch_evaluators` for session-level evaluations, and finally `_merge_test_outputs` to compile the final `TestResult`.

*   **`_collect_metrics`**: This method iterates through the `RunnableConfig` callbacks to extract evaluation feedback from `EvaluatorCallbackHandler` and run metadata (like execution time and run ID) from `LangChainTracer` instances. It consolidates these metrics by example ID.

*   **`_run_batch_evaluators`**: If batch evaluators are configured, this method executes them concurrently using a `ThreadPoolExecutor`. Batch evaluators analyze all runs in the session to produce aggregate feedback, which is then sent to the LangSmith client. This component relies heavily on the evaluation configurations defined in [classic_smith_evaluation.md](classic_smith_evaluation.md).

*   **`_merge_test_outputs`**: This method combines the raw outputs from the model/chain runs with the collected feedback, execution times, and reference outputs (if available) to produce a structured dictionary for each example in the dataset.

### External Dependencies

*   **`core_runnables`**: Utilized for `RunnableConfig`, which defines the execution context for each step in a LangChain runnable, including callbacks and tags.
*   **`core_callbacks`**: Provides the `LangChainTracer`, essential for logging and tracing individual model or chain runs to LangSmith.
*   **`classic_callbacks_tracers`**: Provides the `EvaluatorCallbackHandler`, which is responsible for collecting feedback from individual evaluators applied to each example run.
*   **`classic_smith_evaluation`**: This module represents the broader LangSmith evaluation framework, providing schemas (like `Example`, `EvaluationResult`, `Run`, `TracerSession`, `DataType`), evaluation configurations (`BATCH_EVALUATOR_LIKE`, `RunEvalConfig`), and helper utilities (e.g., `_prepare_eval_run`, `_setup_evaluation`, `name_generation`, `progress`).

## System Integration

The `evaluation_run_management` module is a fundamental part of the `classic_smith_evaluation.evaluation_runner.dataset_runner` submodule. It serves as the operational core for executing dataset-based evaluations within LangChain Smith. Developers interact with this module primarily through the `prepare` class method to set up an evaluation and then `finish` to finalize it, making it the central control point for running comprehensive evaluations of LLM applications and agents against specified datasets. It seamlessly integrates with LangSmith's tracing and feedback mechanisms to provide a complete picture of model performance.