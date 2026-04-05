# context_editing

## Introduction
The `context_editing` module provides middleware for automatically managing the context size of agent interactions. Its primary function is to prune tool results when the total input token count exceeds predefined thresholds, ensuring that agent conversations remain within operational limits. This is particularly useful for managing API costs and preventing models from being overwhelmed with excessive input.

## Architecture and Core Functionality
The core of this module is the `ContextEditingMiddleware` class, which extends `AgentMiddleware`. It intercepts model calls, inspects the current message context, and applies a series of configured editing strategies to reduce the token count if necessary.

### Component: ContextEditingMiddleware
The `ContextEditingMiddleware` is responsible for applying context edits before a model is invoked. It supports different token counting methods (approximate or model-specific) and applies a sequence of `ContextEdit` strategies.

**Key Features:**
- **Context Size Management**: Automatically prunes context to keep token counts within limits.
- **Configurable Editing Strategies**: Supports various `ContextEdit` implementations, with `ClearToolUsesEdit` as a default.
- **Flexible Token Counting**: Allows selection between faster, approximate token counting and more accurate, model-specific counting.
- **Asynchronous Support**: Provides both synchronous (`wrap_model_call`) and asynchronous (`awrap_model_call`) methods for handling model requests.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "context_editing_middleware", "label": "ContextEditingMiddleware", "type": "component", "link": null},
        {"id": "context_edit", "label": "ContextEdit (Interface)", "type": "component", "link": null},
        {"id": "clear_tool_uses_edit", "label": "ClearToolUsesEdit", "type": "component", "link": null},
        {"id": "approximate_token_counter", "label": "Approximate Token Counter", "type": "component", "link": null},
        {"id": "base_message", "label": "BaseMessage", "type": "external", "link": "core_messages.md"},
        {"id": "agent_middleware_types", "label": "Agent Middleware Types", "type": "external", "link": "middleware_types.md"}
    ],
    "edges": [
        {"source": "context_editing_middleware", "target": "context_edit"},
        {"source": "context_editing_middleware", "target": "clear_tool_uses_edit"},
        {"source": "context_editing_middleware", "target": "approximate_token_counter"},
        {"source": "context_editing_middleware", "target": "base_message"},
        {"source": "context_editing_middleware", "target": "agent_middleware_types"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    context_editing_middleware[ContextEditingMiddleware]
    context_edit[ContextEdit (Interface)]
    clear_tool_uses_edit[ClearToolUsesEdit]
    approximate_token_counter[Approximate Token Counter]
    base_message[BaseMessage]
    agent_middleware_types[Agent Middleware Types]

    context_editing_middleware --> context_edit
    context_editing_middleware --> clear_tool_uses_edit
    context_editing_middleware --> approximate_token_counter
    context_editing_middleware --> base_message
    context_editing_middleware --> agent_middleware_types
```

### Core Components Detail

#### `libs.langchain_v1.langchain.agents.middleware.context_editing.ContextEditingMiddleware`

```python
class ContextEditingMiddleware(AgentMiddleware[AgentState[ResponseT], ContextT, ResponseT]):
    """Automatically prune tool results to manage context size.

    The middleware applies a sequence of edits when the total input token count exceeds
    configured thresholds.

    Currently the `ClearToolUsesEdit` strategy is supported, aligning with Anthropic's
    `clear_tool_uses_20250919` behavior [(read more)](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool).
    """

    edits: list[ContextEdit]
    token_count_method: Literal["approximate", "model"]

    def __init__(
        self,
        *,
        edits: Iterable[ContextEdit] | None = None,
        token_count_method: Literal["approximate", "model"] = "approximate",  # noqa: S107
    ) -> None:
        """Initialize an instance of context editing middleware.

        Args:
            edits: Sequence of edit strategies to apply.

                Defaults to a single `ClearToolUsesEdit` mirroring Anthropic defaults.
            token_count_method: Whether to use approximate token counting
                (faster, less accurate) or exact counting implemented by the
                chat model (potentially slower, more accurate).
        """
        super().__init__()
        self.edits = list(edits or (ClearToolUsesEdit(),))
        self.token_count_method = token_count_method

    def wrap_model_call(
        self,
        request: ModelRequest[ContextT],
        handler: Callable[[ModelRequest[ContextT]], ModelResponse[ResponseT]],
    ) -> ModelResponse[ResponseT] | AIMessage:
        """Apply context edits before invoking the model via handler.

        Args:
            request: Model request to execute (includes state and runtime).
            handler: Async callback that executes the model request and returns
                `ModelResponse`.

        Returns:
            The result of invoking the handler with potentially edited messages.
        """
        if not request.messages:
            return handler(request)

        if self.token_count_method == "approximate":  # noqa: S105

            def count_tokens(messages: Sequence[BaseMessage]) -> int:
                return count_tokens_approximately(messages)

        else:
            system_msg = [request.system_message] if request.system_message else []

            def count_tokens(messages: Sequence[BaseMessage]) -> int:
                return request.model.get_num_tokens_from_messages(
                    system_msg + list(messages), request.tools
                )

        edited_messages = deepcopy(list(request.messages))
        for edit in self.edits:
            edit.apply(edited_messages, count_tokens=count_tokens)

        return handler(request.override(messages=edited_messages))

    async def awrap_model_call(
        self,
        request: ModelRequest[ContextT],
        handler: Callable[[ModelRequest[ContextT]], Awaitable[ModelResponse[ResponseT]]],
    ) -> ModelResponse[ResponseT] | AIMessage:
        """Apply context edits before invoking the model via handler.

        Args:
            request: Model request to execute (includes state and runtime).
            handler: Async callback that executes the model request and returns
                `ModelResponse`.

        Returns:
            The result of invoking the handler with potentially edited messages.
        """
        if not request.messages:
            return await handler(request)

        if self.token_count_method == "approximate":  # noqa: S105

            def count_tokens(messages: Sequence[BaseMessage]) -> int:
                return count_tokens_approximately(messages)

        else:
            system_msg = [request.system_message] if request.system_message else []

            def count_tokens(messages: Sequence[BaseMessage]) -> int:
                return request.model.get_num_tokens_from_messages(
                    system_msg + list(messages), request.tools
                )

        edited_messages = deepcopy(list(request.messages))
        for edit in self.edits:
            edit.apply(edited_messages, count_tokens=count_tokens)

        return await handler(request.override(messages=edited_messages))
```
This class acts as a middleware in an agent's processing pipeline. It takes a `ModelRequest`, applies context editing based on the configured strategies (`edits`), and then passes the modified request to the next handler. It supports both synchronous (`wrap_model_call`) and asynchronous (`awrap_model_call`) operations.

**Parameters:**
- `edits`: A list of `ContextEdit` objects defining the strategies to apply for context pruning. By default, it uses `ClearToolUsesEdit`, which aligns with Anthropic's tool-use memory management.
- `token_count_method`: Specifies how tokens are counted. Can be "approximate" (faster, less accurate) or "model" (potentially slower, more accurate, using the underlying model's token counter).

### Relationships to Other Modules

- **`middleware_types`**: The `ContextEditingMiddleware` inherits from `AgentMiddleware` and uses `ModelRequest` and `ModelResponse` types, all defined within the `middleware_types` module. This module provides the foundational interfaces for building agent middleware.
- **`core_messages`**: The `BaseMessage` type, representing individual messages in the conversation, is imported from the `core_messages` module. This is crucial for iterating and modifying the agent's message history.
