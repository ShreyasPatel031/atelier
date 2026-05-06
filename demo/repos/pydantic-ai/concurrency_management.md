# Concurrency Management Module

The `concurrency_management` module provides robust mechanisms for controlling the number of simultaneous operations within the system. Its core component, `ConcurrencyLimiter`, is essential for preventing resource exhaustion, ensuring system stability under heavy load, and offering valuable observability into waiting and running tasks.

This module is particularly crucial in AI agents and model interactions, where multiple requests or tool calls might run concurrently. By managing concurrency, the system can gracefully handle peak loads and provide insights into bottlenecks.

## Core Component: ConcurrencyLimiter

The `ConcurrencyLimiter` class is a high-level concurrency control mechanism built upon `anyio`'s `CapacityLimiter`. It enhances basic capacity limiting with features specifically designed for observability and queue management.

### Functionality

*   **Limit Concurrent Operations**: Defines a `max_running` limit, ensuring that no more than a specified number of operations execute simultaneously.
*   **Queue Management**: Optionally defines a `max_queued` limit, which prevents an unbounded queue of waiting operations. If the queue depth exceeds `max_queued`, a `ConcurrencyLimitExceeded` exception is raised, preventing the system from being overwhelmed.
*   **Observability**: Integrates with OpenTelemetry to create spans when an operation has to wait for an available slot. This provides critical visibility into where time is spent waiting for resources within asynchronous workflows.
*   **Dynamic Configuration**: Can be initialized directly with `max_running` and `max_queued`, or configured from a `ConcurrencyLimit` object (if a more complex configuration is needed, though `ConcurrencyLimit` itself is not defined in this module).
*   **Metrics**: Provides properties (`waiting_count`, `running_count`, `available_count`, `max_running`) to programmatically monitor the current state of the limiter.

### How It Works

1.  **Initialization**: A `ConcurrencyLimiter` is created with a `max_running` value and optional `max_queued`, `name`, and an OpenTelemetry `tracer`.
2.  **Acquiring a Slot**: When an operation needs to run, it calls `acquire(source)`.
    *   It first attempts to acquire a slot immediately.
    *   If no slot is available, it checks if the `max_queued` limit has been reached. If so, it raises `ConcurrencyLimitExceeded`.
    *   The operation then registers itself as 'waiting' and creates an OpenTelemetry span before blocking until a slot becomes available.
3.  **Releasing a Slot**: Once an operation completes (successfully or with an error), it calls `release()`, making its slot available for other waiting operations.

## Architecture Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "concurrency_management",
            "label": "Concurrency Management",
            "type": "module"
        },
        {
            "id": "c0",
            "label": "limit_model_concurrency",
            "type": "component"
        }
    ],
    "edges": [
        {
            "source": "concurrency_management",
            "target": "c0"
        }
    ],
    "groups": [],
    "_auto_generated": true
}
-->
```
```mermaid
flowchart TD
    subgraph concurrency_flow["Concurrency Control Flow"]
        acquire_method["Acquire Slot"]
        release_method["Release Slot"]
        monitor_status["Monitor Limiter Status"]
    end

    concurrency_limiter_class["ConcurrencyLimiter Class"]
    anyio_capacity_limiter["anyio.CapacityLimiter"]
    opentelemetry_tracer["OpenTelemetry Tracer"]
    concurrency_limit_exceeded["ConcurrencyLimitExceeded Exception"]
    asynchronous_utilities["Asynchronous Utilities Module"]
    model_concurrency_limiting["Model Concurrency Limiting"]

    concurrency_limiter_class --"wraps and manages"--> anyio_capacity_limiter
    acquire_method --"requests slot from"--> concurrency_limiter_class
    release_method --"returns slot to"--> concurrency_limiter_class
    monitor_status --"reads metrics from"--> concurrency_limiter_class
    acquire_method --"emits waiting spans to"--> opentelemetry_tracer
    acquire_method --"raises if queue full"--> concurrency_limit_exceeded
    asynchronous_utilities --"utilizes for async ops"--> concurrency_limiter_class
    concurrency_limiter_class --"provides limits for"--> model_concurrency_limiting
```