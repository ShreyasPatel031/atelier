# Feedback Handling Module

The `feedback_handling` module is responsible for integrating human feedback into the CrewAI flow execution process. It provides mechanisms for both synchronous and asynchronous operations, allowing for pre-review of outputs, processing of human input, and distillation of lessons learned to improve future AI performance.

## Architecture Overview

This module primarily consists of wrappers that intercept the flow execution, allowing for human-in-the-loop (HITL) intervention. It interacts with the flow's memory to store and retrieve lessons from past feedback.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "feedback_wrappers", "label": "Feedback Wrappers", "type": "module", "link": "feedback_wrappers.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    feedback_wrappers[Feedback Wrappers]

    click feedback_wrappers "feedback_wrappers.md" "View Feedback Wrappers Module"
```

## Sub-modules

### [Feedback Wrappers](feedback_wrappers.md)

This sub-module contains the core logic for wrapping flow methods to incorporate human feedback. It includes both `async_wrapper` and `sync_wrapper` functions that handle pre-review, feedback requests, processing, and distillation of lessons. For more details, refer to the [Feedback Wrappers documentation](feedback_wrappers.md).