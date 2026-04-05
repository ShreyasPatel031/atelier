# `async_executor_context` Module Documentation

## Introduction

The `async_executor_context` module defines an extended context for executors that support asynchronous invocation, specifically for managing the asynchronous execution of an agent's loop.

## Architecture and Component Relationships

This module primarily introduces the `AsyncExecutorContext` class, which extends the base `ExecutorContext` to provide asynchronous capabilities. It defines an asynchronous method `_ainvoke_loop` for the agent's execution.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "async_executor_context", "label": "AsyncExecutorContext", "type": "component", "link": null},
        {"id": "ainvoke_loop", "label": "_ainvoke_loop()", "type": "component", "link": null},
        {"id": "executor_context", "label": "ExecutorContext", "type": "external", "link": "execution_context.md"}
    ],
    "edges": [
        {"source": "async_executor_context", "target": "ainvoke_loop"},
        {"source": "async_executor_context", "target": "executor_context"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    async_executor_context[AsyncExecutorContext]
    ainvoke_loop[_ainvoke_loop()]
    executor_context[ExecutorContext]

    async_executor_context --> ainvoke_loop
    async_executor_context --> executor_context
```

## Core Components

### `AsyncExecutorContext`

`lib.crewai.src.crewai.core.providers.human_input.AsyncExecutorContext`

This class extends `ExecutorContext` and `Protocol`, providing the necessary interface for executors that can be invoked asynchronously. Its primary role is to define the `_ainvoke_loop` method.

```python
class AsyncExecutorContext(ExecutorContext, Protocol):
    """Extended context for executors that support async invocation."""

    async def _ainvoke_loop(self) -> AgentFinish:
        """Invoke the agent loop asynchronously and return the result."""
        ...
```

### `_ainvoke_loop`

The `_ainvoke_loop` method is an asynchronous abstract method within `AsyncExecutorContext`. It is intended to be implemented by concrete executor classes to run the agent's main execution loop asynchronously, returning an `AgentFinish` object upon completion.

## How the Module Fits into the Overall System

The `async_executor_context` module plays a crucial role in enabling asynchronous execution within the CrewAI framework. By extending the base `ExecutorContext`, it allows for the development of high-performance agents and tasks that can operate concurrently, improving overall system responsiveness and efficiency. It serves as an interface contract, ensuring that any executor supporting asynchronous operations adheres to a standardized method for invoking its agent loop. This module is a specialized component of the larger [execution_context.md](execution_context.md) system.

