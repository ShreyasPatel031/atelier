# lifecycle_hooks Module Documentation

The `lifecycle_hooks` module is an integral part of the CrewAI framework, specifically designed to allow developers to inject custom logic at critical points within a Crew's execution lifecycle. This module provides decorators that mark methods to be executed either before the crew's main kickoff or after its completion.

### Purpose and Core Functionality

The primary purpose of the `lifecycle_hooks` module is to offer a declarative way to extend and customize the behavior of a Crew. By using the provided decorators, developers can define methods within their Crew classes that automatically run at predefined stages, facilitating setup, teardown, logging, or any other cross-cutting concerns related to the Crew's operation.

The module exposes two main decorators:

1.  **`before_kickoff`**:
    *   **Component**: `lib.crewai.src.crewai.project.annotations.before_kickoff`
    *   **Description**: This decorator marks a method to be executed *before* the Crew officially starts its main task execution or "kickoff". It's ideal for initialization tasks, setting up resources, validating prerequisites, or performing any actions that need to occur before the agents begin their collaborative work.
    *   **Usage**: When applied to a method within a Crew definition, the decorated method will be called automatically by the Crew's lifecycle management system prior to execution.

    ```python
def before_kickoff(meth: Callable[P, R]) -> BeforeKickoffMethod[P, R]:
    """Marks a method to execute before crew kickoff.

    Args:
        meth: The method to mark.

    Returns:
        A wrapped method marked for before kickoff execution.
    """
    return BeforeKickoffMethod(meth)
    ```

2.  **`after_kickoff`**:
    *   **Component**: `lib.crewai.src.crewai.project.annotations.after_kickoff`
    *   **Description**: This decorator marks a method to be executed *after* the Crew has completed its main task execution. It's suitable for cleanup operations, finalizing results, persistent storage, generating summary reports, or any post-execution logic.
    *   **Usage**: Similar to `before_kickoff`, methods adorned with `after_kickoff` will be invoked by the Crew's lifecycle management system once the main execution flow concludes.

    ```python
def after_kickoff(meth: Callable[P, R]) -> AfterKickoffMethod[P, R]:
    """Marks a method to execute after crew kickoff.

    Args:
        meth: The method to mark.

    Returns:
        A wrapped method marked for after kickoff execution.
    """
    return AfterKickoffMethod(meth)
    ```

### Architecture and Component Relationships

The `lifecycle_hooks` module itself is lightweight, primarily providing the decorator functions. Its functionality is deeply integrated with the broader `crewai_project_structure` and depends on other modules for its full operation.

The `before_kickoff` and `after_kickoff` decorators return instances of `BeforeKickoffMethod` and `AfterKickoffMethod` respectively. These classes are likely defined within the [declarative_methods](declarative_methods.md) module, which handles the wrapping and management of declaratively defined methods.

The core [crew_class_definition](crew_class_definition.md) module, responsible for defining the `Crew` class, interacts with these hooks. The `Crew` class's internal mechanisms are designed to identify methods decorated with `before_kickoff` and `after_kickoff` and execute them at the appropriate stages of its lifecycle.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "before_kickoff", "label": "before_kickoff Decorator", "type": "component", "link": null},
        {"id": "after_kickoff", "label": "after_kickoff Decorator", "type": "component", "link": null},
        {"id": "crew_class_definition", "label": "Crew Class Definition", "type": "external", "link": "crew_class_definition.md"},
        {"id": "declarative_methods", "label": "Declarative Methods", "type": "external", "link": "declarative_methods.md"}
    ],
    "edges": [
        {"source": "before_kickoff", "target": "declarative_methods", "label": "returns BeforeKickoffMethod"},
        {"source": "after_kickoff", "target": "declarative_methods", "label": "returns AfterKickoffMethod"},
        {"source": "crew_class_definition", "target": "before_kickoff", "label": "uses hook"},
        {"source": "crew_class_definition", "target": "after_kickoff", "label": "uses hook"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    before_kickoff[before_kickoff Decorator]
    after_kickoff[after_kickoff Decorator]
    crew_class_definition[Crew Class Definition]
    declarative_methods[Declarative Methods]
    before_kickoff --> declarative_methods: returns BeforeKickoffMethod
    after_kickoff --> declarative_methods: returns AfterKickoffMethod
    crew_class_definition --> before_kickoff: uses hook
    crew_class_definition --> after_kickoff: uses hook
```

### How the Module Fits into the Overall System

The `lifecycle_hooks` module is a crucial part of the `crewai_project_structure` under `project_annotations.declarative_annotations`. It empowers developers to build more robust and maintainable CrewAI applications by clearly separating core business logic from lifecycle management concerns.

By providing well-defined extension points, this module contributes to:

*   **Modularity**: Logic for setup and teardown is encapsulated within specific methods, improving code organization.
*   **Extensibility**: Developers can easily add new behaviors without modifying the core CrewAI framework.
*   **Maintainability**: Changes to lifecycle-related logic are isolated, reducing the risk of unintended side effects.

This allows the [crew_class_definition](crew_class_definition.md) to remain focused on its primary responsibility while delegating pre- and post-processing tasks to methods managed by these hooks. This declarative approach simplifies the development of complex, multi-agent systems, enabling developers to define powerful automations with clear control over their execution flow.