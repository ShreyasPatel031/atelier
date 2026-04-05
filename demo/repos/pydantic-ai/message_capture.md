# message_capture Module Documentation

The `message_capture` module provides a crucial context manager for observing the message flow within `pydantic_ai` agent runs. This functionality is particularly valuable for debugging, logging, and robust error handling by allowing developers to inspect the conversation history with the model, even when exceptions occur.

## Purpose and Core Functionality

The primary purpose of this module is to expose the messages exchanged between the agent and the model during an execution cycle. The `capture_run_messages` context manager wraps an agent's `run`, `run_sync`, or `run_stream` method, making the list of `ModelMessage` objects accessible throughout the context. This allows for post-mortem analysis of conversations, which is essential for understanding unexpected agent behavior or diagnosing issues.

### `capture_run_messages`

```python
def capture_run_messages() -> Iterator[list[_messages.ModelMessage]]:
    # ... (code snippet)
```

This context manager provides access to a list of `ModelMessage` instances representing the entire conversation history during an agent's run. If multiple agent runs are performed within a single `capture_run_messages` block, only the messages from the *first* run will be captured.

**Key Use Cases:**
*   **Error Handling:** Retrieve messages to understand the state of the conversation when an exception is raised by the model or an agent's tool.
*   **Debugging:** Inspect the exact prompts sent to the model and the responses received for detailed debugging.
*   **Logging:** Integrate message capture into logging frameworks to maintain comprehensive interaction records.

## Architecture and Component Relationships

The `message_capture` module is a vital part of the [agent_execution_graph.md](agent_execution_graph.md) module, which is responsible for orchestrating the execution flow of `pydantic_ai` agents. It interacts with internal message context variables and `ModelMessage` types to provide its core functionality.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "capture_run_messages", "label": "capture_run_messages()", "type": "component", "link": null},
        {"id": "messages_context", "label": "Messages Context Variable", "type": "component", "link": null},
        {"id": "model_message_type", "label": "ModelMessage Type", "type": "component", "link": null},
        {"id": "agent_execution_graph", "label": "Agent Execution Graph Module", "type": "external", "link": "agent_execution_graph.md"}
    ],
    "edges": [
        {"source": "capture_run_messages", "target": "messages_context"},
        {"source": "capture_run_messages", "target": "model_message_type"},
        {"source": "agent_execution_graph", "target": "capture_run_messages"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    capture_run_messages[capture_run_messages()]
    messages_context[Messages Context Variable]
    model_message_type[ModelMessage Type]
    agent_execution_graph[Agent Execution Graph Module]
    capture_run_messages --> messages_context
    capture_run_messages --> model_message_type
    agent_execution_graph --> capture_run_messages
```

## Integration with the Overall System

The `message_capture` module enhances the observability and debuggability of the `pydantic_ai_agent_core` by providing a direct mechanism to access the internal message state during agent execution. It acts as a bridge for developers to peer into the conversational dynamics of their agents, which is crucial for development, testing, and production monitoring. It integrates seamlessly with the agent's core `run` methods, making it an indispensable tool for robust agent development.