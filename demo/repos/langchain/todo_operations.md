# Todo Operations Module

The `todo_operations` module provides core functionality for managing structured task lists (todos) within an agent's work session. It includes functions for writing and updating these todo lists, enabling agents to maintain an organized overview of their current tasks.

## Architecture Overview

The `todo_operations` module is composed of a single sub-module, `todo_writer`, which handles the creation and asynchronous updates of todo lists.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "todo_writer", "label": "Todo List Writer", "type": "module", "link": "todo_writer.md"}
    ],
    "edges": []
}
-->

```mermaid
graph TD
    todo_writer[Todo List Writer]
    click todo_writer "todo_writer.md" "View Todo List Writer Module"
```

## Sub-modules

### [Todo List Writer](todo_writer.md)
This sub-module provides functions for creating and managing a structured task list within the agent's current work session.