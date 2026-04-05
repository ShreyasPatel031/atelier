# Flow Resumption Module

## Introduction

The `flow_resumption` module is a crucial part of the CrewAI's flow management system, specifically designed to handle the continuation of paused workflows. It enables the system to restore the state of a flow that has been halted, typically for human feedback, and resume its execution from that point.

## Core Functionality

This module provides the mechanisms to rehydrate a `Flow` instance from its persisted state and continue its operation. Its primary components facilitate the loading of pending feedback contexts and the seamless resumption of flow execution.

### `resume()`

The `resume()` method is responsible for continuing the execution of a flow that was previously paused, often to await asynchronous human feedback. It processes any provided feedback, collapses outcomes if specified, stores the result, and triggers subsequent listeners in the flow's lifecycle.

It includes safeguards to prevent synchronous calls within an asynchronous context, guiding developers to use `resume_async()` instead when an event loop is already running.

```python
    def resume(self, feedback: str = "") -> Any:
        """Resume flow execution, optionally with human feedback.

        This method continues flow execution after a flow was paused for
        async human feedback. It processes the feedback (including LLM-based
        outcome collapsing if emit was specified), stores the result, and
        triggers downstream listeners.

        Note:
            If called from within an async context (running event loop),
            use `await flow.resume_async(feedback)` instead.

        Args:
            feedback: The human's feedback as a string. If empty, uses
                default_outcome or the first emit option.

        Returns:
            The final output from the flow execution, or HumanFeedbackPending
            if another feedback point is reached.

        Raises:
            ValueError: If no pending feedback context exists (flow wasn't paused)
            RuntimeError: If called from within a running event loop (use resume_async instead)

        Example:
            ```python
            # In a sync webhook handler:
            def handle_feedback(flow_id: str, feedback: str):
                flow = MyFlow.from_pending(flow_id)
                result = flow.resume(feedback)
                return result


            # In an async handler, use resume_async instead:
            async def handle_feedback_async(flow_id: str, feedback: str):
                flow = MyFlow.from_pending(flow_id)
                result = await flow.resume_async(feedback)
                return result
            ```
        """
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if loop is not None:
            raise RuntimeError(
                "resume() cannot be called from within an async context. "
                "Use 'await flow.resume_async(feedback)' instead."
            )

        return asyncio.run(self.resume_async(feedback))
```

### `from_pending()`

The `from_pending()` classmethod is the entry point for recreating a `Flow` instance from a state where it was awaiting human feedback. It loads the flow's persisted state and the specific context of the pending feedback, making the flow ready for subsequent resumption.

It utilizes the [flow_persistence](flow_persistence.md) module to retrieve the necessary state information, ensuring that the flow can accurately pick up where it left off.

```python
    def from_pending(
        cls,
        flow_id: str,
        persistence: FlowPersistence | None = None,
        **kwargs: Any,
    ) -> Flow[Any]:
        """Create a Flow instance from a pending feedback state.

        This classmethod is used to restore a flow that was paused waiting
        for async human feedback. It loads the persisted state and pending
        feedback context, then returns a flow instance ready to resume.

        Args:
            flow_id: The unique identifier of the paused flow (from state.id)
            persistence: The persistence backend where the state was saved.
                If not provided, defaults to SQLiteFlowPersistence().
            **kwargs: Additional keyword arguments passed to the Flow constructor

        Returns:
            A new Flow instance with restored state, ready to call resume()

        Raises:
            ValueError: If no pending feedback exists for the given flow_id

        Example:
            ```python
            # Simple usage with default persistence:
            flow = MyFlow.from_pending("abc-123")
            result = flow.resume("looks good!")

            # Or with custom persistence:
            persistence = SQLiteFlowPersistence("custom.db")
            flow = MyFlow.from_pending("abc-123", persistence)
            result = flow.resume("looks good!")
            ```
        """
        if persistence is None:
            from crewai.flow.persistence import SQLiteFlowPersistence

            persistence = SQLiteFlowPersistence()

        # Load pending feedback context and state
        loaded = persistence.load_pending_feedback(flow_id)
        if loaded is None:
            raise ValueError(f"No pending feedback found for flow_id: {flow_id}")

        state_data, pending_context = loaded

        # Create flow instance with persistence
        instance = cls(persistence=persistence, **kwargs)

        # Restore state
        instance._initialize_state(state_data)

        # Store pending context for resume
        instance._pending_feedback_context = pending_context

        # Mark that we're resuming execution
        instance._is_execution_resuming = True

        return instance
```

## Architecture and Component Relationships

The `flow_resumption` module consists of key methods that work in conjunction with flow persistence to enable the continuation of workflows. The `from_pending()` method serves as the initial step to load a paused flow's state, typically relying on the [flow_persistence](flow_persistence.md) module. Once the flow is rehydrated, the `resume()` method takes over to process feedback and advance the flow's execution.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "resume_method", "label": "resume()", "type": "component", "link": null},
        {"id": "from_pending_method", "label": "from_pending()", "type": "component", "link": null},
        {"id": "flow_persistence_module", "label": "flow_persistence", "type": "external", "link": "flow_persistence.md"}
    ],
    "edges": [
        {"source": "from_pending_method", "target": "flow_persistence_module"},
        {"source": "resume_method", "target": "from_pending_method", "label": "Restores and resumes"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    resume_method[resume()]
    from_pending_method[from_pending()]
    flow_persistence_module[flow_persistence]
    from_pending_method --> flow_persistence_module
    resume_method -->|Restores and resumes| from_pending_method
```

## How the Module Fits into the Overall System

The `flow_resumption` module is an integral part of the `crewai_flow_management` system, specifically within the `flow_lifecycle` subgroup. It provides critical functionality for managing interactive and long-running CrewAI workflows that require external input or human intervention. By enabling flows to be paused and then resumed with feedback, it facilitates complex decision-making processes and integrates human expertise into automated agentic flows.

This module complements other aspects of flow state management, such as [flow_state_reloading](flow_state_reloading.md), by offering a mechanism for dynamic continuation based on external events. Its ability to work with various persistence backends (through [flow_persistence](flow_persistence.md)) ensures flexibility in how flow states are stored and retrieved across different deployment environments.