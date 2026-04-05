# todo_middleware

The `todo_middleware` module introduces the `TodoListMiddleware`, a crucial component for enabling agents to manage structured task lists. This middleware enhances agent capabilities by providing a `write_todos` tool, allowing agents to effectively plan, track, and update multi-step operations. It also ensures consistent task management by injecting guiding system prompts and enforcing proper tool usage.

## Architecture and Component Relationships

The `todo_middleware` module centers around the `TodoListMiddleware` class, which integrates with the agent's message processing flow to manage todo lists. It registers a `write_todos` tool, implemented by internal synchronous (`_write_todos`) and asynchronous (`_awrite_todos`) functions. The middleware interacts with core LangChain components for message handling, state management, and model requests/responses.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "todo_list_middleware", "label": "TodoListMiddleware", "type": "component", "link": null},
        {"id": "write_todos_tool", "label": "write_todos (Tool)", "type": "component", "link": null},
        {"id": "_write_todos_func", "label": "_write_todos (Sync Function)", "type": "component", "link": null},
        {"id": "_awrite_todos_func", "label": "_awrite_todos (Async Function)", "type": "component", "link": null},
        {"id": "agent_middleware_base", "label": "AgentMiddleware", "type": "external", "link": "langchain_v1_agents_middleware.md"},
        {"id": "structured_tool", "label": "StructuredTool", "type": "external", "link": "langchain_v1_agents_factory.md"},
        {"id": "planning_state", "label": "PlanningState", "type": "external", "link": "langchain_v1_agents_middleware.md"},
        {"id": "model_request", "label": "ModelRequest", "type": "external", "link": "core_runnables.md"},
        {"id": "model_response", "label": "ModelResponse", "type": "external", "link": "core_runnables.md"},
        {"id": "ai_message", "label": "AIMessage", "type": "external", "link": "core_messages.md"},
        {"id": "system_message", "label": "SystemMessage", "type": "external", "link": "core_messages.md"},
        {"id": "tool_message", "label": "ToolMessage", "type": "external", "link": "core_messages.md"},
        {"id": "create_agent_func", "label": "create_agent", "type": "external", "link": "langchain_v1_agents_factory.md"}
    ],
    "edges": [
        {"source": "todo_list_middleware", "target": "agent_middleware_base"},
        {"source": "todo_list_middleware", "target": "write_todos_tool"},
        {"source": "write_todos_tool", "target": "_write_todos_func"},
        {"source": "write_todos_tool", "target": "_awrite_todos_func"},
        {"source": "todo_list_middleware", "target": "planning_state"},
        {"source": "todo_list_middleware", "target": "model_request"},
        {"source": "todo_list_middleware", "target": "model_response"},
        {"source": "todo_list_middleware", "target": "ai_message"},
        {"source": "todo_list_middleware", "target": "system_message"},
        {"source": "todo_list_middleware", "target": "tool_message"},
        {"source": "create_agent_func", "target": "todo_list_middleware"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    todo_list_middleware[TodoListMiddleware]
    write_todos_tool[write_todos (Tool)]
    _write_todos_func[_write_todos (Sync Function)]
    _awrite_todos_func[_awrite_todos (Async Function)]
    agent_middleware_base[AgentMiddleware]:::external
    structured_tool[StructuredTool]:::external
    planning_state[PlanningState]:::external
    model_request[ModelRequest]:::external
    model_response[ModelResponse]:::external
    ai_message[AIMessage]:::external
    system_message[SystemMessage]:::external
    tool_message[ToolMessage]:::external
    create_agent_func[create_agent]:::external

    todo_list_middleware --> agent_middleware_base
    todo_list_middleware --> write_todos_tool
    write_todos_tool --> _write_todos_func
    write_todos_tool --> _awrite_todos_func
    todo_list_middleware --> planning_state
    todo_list_middleware --> model_request
    todo_list_middleware --> model_response
    todo_list_middleware --> ai_message
    todo_list_middleware --> system_message
    todo_list_middleware --> tool_message
    create_agent_func --> todo_list_middleware

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

## Core Functionality

The `todo_middleware` module provides the `TodoListMiddleware` class, which is a specialized agent middleware designed to introduce robust todo list management capabilities to agents.

### TodoListMiddleware

The `TodoListMiddleware` (`libs.langchain_v1.langchain.agents.middleware.todo.TodoListMiddleware`) is an `AgentMiddleware` that injects a `write_todos` tool into the agent's available tools. This tool allows agents to:

-   **Create and Manage Structured Task Lists**: Agents can define multi-step operations as a series of todo items, each with a status, enabling better organization and progress tracking.
-   **Improve Visibility**: Provides users with insight into the agent's ongoing tasks and their completion status.
-   **Guide Agent Behavior**: Injects system prompts that instruct the agent on the optimal use of the `write_todos` tool.

**Key Features:**

-   **Tool Injection**: Registers a `StructuredTool` named `write_todos` with a specific `WriteTodosInput` schema. This tool uses `_write_todos` for synchronous calls and `_awrite_todos` for asynchronous calls.
-   **System Prompt Modification**: During the `wrap_model_call` and `awrap_model_call` methods, the middleware modifies the incoming `SystemMessage` to include instructions on using the `write_todos` tool.
-   **Concurrency Control**: The `after_model` and `aafter_model` methods enforce that the `write_todos` tool is called at most once per model turn. This prevents conflicts that could arise from multiple parallel updates to the todo list, which would create ambiguity about precedence. If multiple calls are detected, error `ToolMessage` instances are returned.
-   **State Management**: It utilizes `PlanningState` (from [langchain_v1_agents_middleware.md](langchain_v1_agents_middleware.md)) for managing the agent's state, including the messages and todo list.

**Usage Example:**

```python
from langchain.agents.middleware.todo import TodoListMiddleware
from langchain.agents import create_agent
from langchain_core.messages import HumanMessage

# Initialize an agent with the TodoListMiddleware
agent = create_agent("openai:gpt-4o", middleware=[TodoListMiddleware()])

# The agent can now use the write_todos tool
result = await agent.invoke({"messages": [HumanMessage("Help me refactor my codebase")]})

print(result["todos"])  # Expected: An array of todo items with status tracking
```

## How the Module Fits into the Overall System

The `todo_middleware` module, specifically the `TodoListMiddleware`, is a critical extension within the broader agent middleware ecosystem. It provides a foundational capability for agents to manage complex, multi-step processes by externalizing and structuring their internal "to-do" items.

By integrating with the agent's model call lifecycle, it transparently enhances agent intelligence by:
-   **Improving Agent Planning**: Encourages agents to break down complex problems into manageable steps.
-   **Facilitating User Interaction**: Offers a mechanism for agents to communicate their progress and plans to users.
-   **Ensuring Robustness**: Prevents conflicting updates to the todo list through its concurrency control.

It depends on core LangChain components like [core_messages.md](core_messages.md) for message types (`AIMessage`, `SystemMessage`, `ToolMessage`) and [core_runnables.md](core_runnables.md) for handling model interactions (`ModelRequest`, `ModelResponse`). It also integrates with agent creation mechanisms found in [langchain_v1_agents_factory.md](langchain_v1_agents_factory.md) and utilizes concepts from the general [langchain_v1_agents_middleware.md](langchain_v1_agents_middleware.md) for its base functionality and state management (e.g., `PlanningState`). This module is essential for building sophisticated agents capable of tackling longer-running and more structured tasks.