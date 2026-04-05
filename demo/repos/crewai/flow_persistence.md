# Flow Persistence Module

## Introduction
The `flow_persistence` module is responsible for enabling and managing the persistence of flow states within the CrewAI framework. It provides decorators to automatically save the state of a flow at various points during its execution, ensuring that progress can be recovered even if the application is interrupted. This module leverages a configurable persistence backend to store flow data.

## Architecture
The module's architecture revolves around a decorator system that integrates with flow methods and a dedicated class for handling the actual state persistence.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "persistence_handlers", "label": "Persistence Handlers", "type": "module", "link": "persistence_handlers.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    persistence_handlers[Persistence Handlers]

    click persistence_handlers "persistence_handlers.md" "View Persistence Handlers Documentation"
```

## Sub-modules

### [Persistence Handlers](persistence_handlers.md)
This sub-module contains the core logic for applying persistence decorators to flow classes and methods, and the `PersistenceDecorator` class which manages the saving of flow state data to the configured persistence backend. It ensures that the flow's state is captured at critical junctures, facilitating recovery and continuation of long-running processes.
