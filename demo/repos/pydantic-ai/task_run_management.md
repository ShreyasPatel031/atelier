# Task Run Management Module

The `task_run_management` module is a crucial component within the `pydantic_evals_core` system, specifically responsible for the isolated and monitored execution of individual evaluation tasks. It provides the core mechanism for running tasks in a controlled environment, capturing performance metrics, and managing execution context.

## Purpose and Core Functionality

The primary purpose of `task_run_management` is to orchestrate the execution of a single task within an evaluation dataset. It ensures:

1.  **Context Isolation:** Prevents nested task runs, ensuring that each task operates within its own defined context.
2.  **Performance Monitoring:** Captures the duration of task execution using integrated logging and telemetry.
3.  **Asynchronous Compatibility:** Seamlessly handles both synchronous and asynchronous task functions using thread pool execution for synchronous tasks.
4.  **Telemetry Integration:** Leverages `logfire` for detailed span tracking and `context_subtree` for capturing a hierarchical view of the execution.

The core functionality is encapsulated in the `_run_once` function, which serves as the entry point for executing an evaluation task.

## Architecture and Component Relationships

The `task_run_management` module, primarily through its `_run_once` function, interacts with several internal and external components to achieve its functionality.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "_run_once", "label": "_run_once", "type": "component", "link": null},
        {"id": "task_context", "label": "Task Context Management", "type": "component", "link": null},
        {"id": "telemetry", "label": "Telemetry (pydantic_evals_reporting)", "type": "external", "link": "pydantic_evals_reporting.md"},
        {"id": "async_exec_utils", "label": "Async Execution Utilities", "type": "external", "link": "async_helpers.md"}
    ],
    "edges": [
        {"source": "_run_once", "target": "task_context"},
        {"source": "_run_once", "target": "telemetry"},
        {"source": "_run_once", "target": "async_exec_utils"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    _run_once[_run_once]
    task_context[Task Context Management]
    telemetry[Telemetry (pydantic_evals_reporting)]
    async_exec_utils[Async Execution Utilities]

    _run_once --> task_context
    _run_once --> telemetry
    _run_once --> async_exec_utils
```

### Core Components:

*   **`_run_once`**: (pydantic_evals.pydantic_evals.dataset._run_once) This asynchronous function is the heart of the module. It takes a task function and input `case.inputs`, sets up the task run context, executes the task, measures its duration, and captures telemetry before cleaning up the context. It handles both `async` and `sync` task functions by using `to_thread.run_sync` for synchronous tasks.

### Internal Components:

*   **Task Context Management (`task_context`)**: This refers to the internal mechanisms (`_TaskRun`, `_CURRENT_TASK_RUN`) used to manage the current task's execution context. It ensures that task runs are not nested and provides a unique context for each run.

### External Dependencies:

*   **Telemetry (`telemetry`)**: The module integrates with the `pydantic_evals_reporting` module to provide detailed observability. Specifically, it uses `logfire_span` for tracing the execution of tasks and `context_subtree` for structuring the telemetry spans, allowing for clear performance insights. Refer to [pydantic_evals_reporting.md](pydantic_evals_reporting.md) for more details.
*   **Async Execution Utilities (`async_exec_utils`)**: To support both synchronous and asynchronous task functions, `_run_once` relies on utility functions like `iscoroutinefunction` and `to_thread.run_sync`. These utilities are part of the broader asynchronous helpers found in `pydantic_ai_agent_core`'s `async_helpers` module. Refer to [async_helpers.md](async_helpers.md) for more details.

## How the Module Fits into the Overall System

The `task_run_management` module is an integral part of the `pydantic_evals_core` framework, specifically within the `online_evaluation_core` module. It provides the fundamental execution engine for individual evaluation steps. When a dataset evaluation is initiated, the `online_evaluation_core` dispatches individual evaluation cases to be processed. The `task_run_management` module then takes over, executing the specific evaluation logic (the "task") for each case, ensuring consistency, performance measurement, and proper context handling.

It acts as a reliable and observable executor for the smallest atomic units of work in the evaluation pipeline, contributing critical data points (duration, output, telemetry) back to the broader evaluation reporting and analysis systems. This isolation and consistent execution environment are vital for accurate and reproducible evaluation results.
