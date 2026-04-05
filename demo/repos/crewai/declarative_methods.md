# `declarative_methods` Module Documentation

## Introduction

The `declarative_methods` module, part of the `crewai.project.annotations` package, provides a set of decorators that allow developers to declaratively mark methods within a CrewAI project as specific components like tasks, agents, LLMs, tools, or cache handlers. These decorators simplify the definition and integration of various operational components into the CrewAI framework by automatically applying memoization and wrapping the methods in appropriate handler classes.

## Architecture and Component Relationships

The module's core functionality revolves around five key decorators: `@task`, `@agent`, `@llm`, `@tool`, and `@cache_handler`. Each decorator takes a method as input, applies memoization using an internal `memoize` utility, and then wraps the method in a specialized handler class (e.g., `TaskMethod`, `AgentMethod`). This design promotes code reusability and ensures that methods are consistently prepared for use within the CrewAI system.

The decorated methods are further processed by the [decorated_method_wrapper](decorated_method_wrapper.md) and ultimately managed by the [crew_class_metaclass](crew_class_metaclass.md) to integrate seamlessly into the overall Crew definition.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "task_decorator", "label": "Task Decorator (@task)", "type": "component", "link": null},
        {"id": "agent_decorator", "label": "Agent Decorator (@agent)", "type": "component", "link": null},
        {"id": "llm_decorator", "label": "LLM Decorator (@llm)", "type": "component", "link": null},
        {"id": "tool_decorator", "label": "Tool Decorator (@tool)", "type": "component", "link": null},
        {"id": "cache_handler_decorator", "label": "Cache Handler Decorator (@cache_handler)", "type": "component", "link": null},
        {"id": "memoize", "label": "Memoization Utility", "type": "component", "link": null},
        {"id": "task_method", "label": "TaskMethod Wrapper", "type": "component", "link": null},
        {"id": "agent_method", "label": "AgentMethod Wrapper", "type": "component", "link": null},
        {"id": "llm_method", "label": "LLMMethod Wrapper", "type": "component", "link": null},
        {"id": "tool_method", "label": "ToolMethod Wrapper", "type": "component", "link": null},
        {"id": "cache_handler_method", "label": "CacheHandlerMethod Wrapper", "type": "component", "link": null},
        {"id": "decorated_method_wrapper", "label": "DecoratedMethodWrapper", "type": "external", "link": "decorated_method_wrapper.md"},
        {"id": "crew_class_metaclass", "label": "CrewClassMetaclass", "type": "external", "link": "crew_class_metaclass.md"}
    ],
    "edges": [
        {"source": "task_decorator", "target": "memoize"},
        {"source": "agent_decorator", "target": "memoize"},
        {"source": "llm_decorator", "target": "memoize"},
        {"source": "tool_decorator", "target": "memoize"},
        {"source": "cache_handler_decorator", "target": "memoize"},
        {"source": "task_decorator", "target": "task_method"},
        {"source": "agent_decorator", "target": "agent_method"},
        {"source": "llm_decorator", "target": "llm_method"},
        {"source": "tool_decorator", "target": "tool_method"},
        {"source": "cache_handler_decorator", "target": "cache_handler_method"},
        {"source": "task_method", "target": "decorated_method_wrapper"},
        {"source": "agent_method", "target": "decorated_method_wrapper"},
        {"source": "llm_method", "target": "decorated_method_wrapper"},
        {"source": "tool_method", "target": "decorated_method_wrapper"},
        {"source": "cache_handler_method", "target": "decorated_method_wrapper"},
        {"source": "decorated_method_wrapper", "target": "crew_class_metaclass"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    task_decorator[Task Decorator (@task)]
    agent_decorator[Agent Decorator (@agent)]
    llm_decorator[LLM Decorator (@llm)]
    tool_decorator[Tool Decorator (@tool)]
    cache_handler_decorator[Cache Handler Decorator (@cache_handler)]
    memoize[Memoization Utility]
    task_method[TaskMethod Wrapper]
    agent_method[AgentMethod Wrapper]
    llm_method[LLMMethod Wrapper]
    tool_method[ToolMethod Wrapper]
    cache_handler_method[CacheHandlerMethod Wrapper]
    decorated_method_wrapper[DecoratedMethodWrapper]:::external
    crew_class_metaclass[CrewClassMetaclass]:::external

    task_decorator --> memoize
    agent_decorator --> memoize
    llm_decorator --> memoize
    tool_decorator --> memoize
    cache_handler_decorator --> memoize

    task_decorator --> task_method
    agent_decorator --> agent_method
    llm_decorator --> llm_method
    tool_decorator --> tool_method
    cache_handler_decorator --> cache_handler_method

    task_method --> decorated_method_wrapper
    agent_method --> decorated_method_wrapper
    llm_method --> decorated_method_wrapper
    tool_method --> decorated_method_wrapper
    cache_handler_method --> decorated_method_wrapper

    decorated_method_wrapper --> crew_class_metaclass

    class decorated_method_wrapper,crew_class_metaclass hyperlink;
    click decorated_method_wrapper "decorated_method_wrapper.md"
    click crew_class_metaclass "crew_class_metaclass.md"
```

## Core Functionality

The `declarative_methods` module exports the following decorators:

### `@task`
Marks a method as a CrewAI task. When a method is decorated with `@task`, it is wrapped by `TaskMethod` and memoized, ensuring that the task's execution results can be cached and reused when appropriate.

```python
def task(meth: Callable[P, TaskResultT]) -> TaskMethod[P, TaskResultT]:
    """Marks a method as a crew task."""
    return TaskMethod(memoize(meth))
```

### `@agent`
Designates a method as a CrewAI agent. Similar to `@task`, methods decorated with `@agent` are wrapped by `AgentMethod` and memoized, optimizing their performance and state management within the CrewAI system.

```python
def agent(meth: Callable[P, R]) -> AgentMethod[P, R]:
    """Marks a method as a crew agent."""
    return AgentMethod(memoize(meth))
```

### `@llm`
Identifies a method as an LLM provider within CrewAI. This decorator wraps the method with `LLMMethod` and applies memoization, allowing the system to efficiently manage and access LLM interactions.

```python
def llm(meth: Callable[P, R]) -> LLMMethod[P, R]:
    """Marks a method as an LLM provider."""
    return LLMMethod(memoize(meth))
```

### `@tool`
Marks a method as a tool that can be used by agents within CrewAI. Methods decorated with `@tool` are wrapped by `ToolMethod` and memoized, providing a consistent interface for tool integration and performance benefits.

```python
def tool(meth: Callable[P, R]) -> ToolMethod[P, R]:
    """Marks a method as a crew tool."""
    return ToolMethod(memoize(meth))
```

### `@cache_handler`
Specifies a method as a cache handler for the CrewAI system. This decorator wraps the method with `CacheHandlerMethod` and memoizes it, enabling efficient caching strategies for various operations.

```python
def cache_handler(meth: Callable[P, R]) -> CacheHandlerMethod[P, R]:
    """Marks a method as a cache handler."""
    return CacheHandlerMethod(memoize(meth))
```

## How the Module Fits into the Overall System

The `declarative_methods` module is a fundamental part of defining and structuring CrewAI projects. By providing these decorators, it enables developers to:

1.  **Clearly define roles**: Explicitly mark methods as tasks, agents, LLMs, tools, or cache handlers, improving code readability and maintainability.
2.  **Automate setup**: Automatically apply memoization and wrap methods in appropriate handler classes, reducing boilerplate code.
3.  **Integrate with the Crew Class**: The decorated methods are seamlessly integrated into the `Crew` class definition through the [decorated_method_wrapper](decorated_method_wrapper.md) and [crew_class_metaclass](crew_class_metaclass.md), which process these annotations to build the final CrewAI execution graph.
4.  **Enhance performance**: Leverage memoization for improved performance by caching method execution results.

This module plays a crucial role in the declarative programming paradigm adopted by CrewAI, allowing for a more intuitive and less error-prone way of constructing complex AI workflows.
