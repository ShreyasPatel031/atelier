# Two-Step Adapter Module

The `two_step_adapter` module provides a specialized `TwoStepAdapter` class, designed to facilitate structured data extraction from Language Models (LMs), particularly those that excel at reasoning but might struggle with direct structured output. This adapter operates in two distinct stages to achieve its goal.

## Core Functionality

The `TwoStepAdapter` is a powerful tool for scenarios where a primary Language Model (LM) is adept at generating comprehensive textual responses, but there's a need to extract specific, structured data from these responses. It addresses this challenge by employing a two-stage process:

1.  **Main LM Interaction**: The adapter first interacts with a primary, often larger, LM using a more natural and less restrictive prompt format. This allows the main LM to generate its response without being constrained by rigid output structures.
2.  **Structured Data Extraction**: In the second stage, a dedicated, usually smaller and more specialized, LM (referred to as the `extraction_model`) is employed. This `extraction_model`, in conjunction with a `ChatAdapter`, processes the raw text output from the main LM to accurately extract the desired structured data.

This architecture is particularly beneficial when working with complex reasoning models, which are known to perform well in generating elaborate answers but might struggle to consistently adhere to strict JSON or other structured output formats.

## Architecture and Component Relationships

The `TwoStepAdapter` class is the central component of this module. It extends the `dspy.adapters.base.Adapter` and orchestrates the two-stage process.

### Components

*   **`TwoStepAdapter`**: The main class that implements the two-stage adaptation logic. It handles formatting prompts for the main LM and parsing its responses using an `extraction_model`.
*   **`extraction_model`**: An instance of `dspy.clients.base_lm.BaseLM` provided during the `TwoStepAdapter`'s initialization. This model is specifically used in the second stage for structured data extraction.
*   **`format` Method**: This method is responsible for preparing the prompt for the main LM. It constructs a task description and formats the input demonstrations (`demos`) and current inputs into a series of messages suitable for the main LM.
*   **`parse` Method**: This method executes the second stage. It takes the raw completion from the main LM and uses the `extraction_model` (via an internal `ChatAdapter`) to parse and extract structured data based on a dynamically generated "extractor signature."
*   **`acall` Method**: The asynchronous version of the `__call__` logic, allowing for non-blocking execution of the two-step adaptation process. It handles the asynchronous interaction with both the main LM and the `extraction_model`.
*   **`_create_extractor_signature` Method**: A private helper method that dynamically generates a `dspy.Signature` for the `extraction_model`. This signature defines a "text" input field (for the main LM's completion) and all the original output fields expected from the adapter.
*   **`format_task_description`, `format_user_message_content`, `format_assistant_message_content` Methods**: These utility methods assist in constructing the messages for the main LM, providing flexibility in how task instructions, user inputs, and assistant examples are presented.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "two_step_adapter", "label": "TwoStepAdapter", "type": "component", "link": null},
        {"id": "base_adapter_interface", "label": "Base Adapter Interface", "type": "external", "link": "base_adapter_interface.md"},
        {"id": "dspy_clients", "label": "DSPy Clients (BaseLM)", "type": "external", "link": "dspy_clients.md"},
        {"id": "dspy_signatures", "label": "DSPy Signatures (Signature)", "type": "external", "link": "dspy_signatures.md"},
        {"id": "dspy_primitives", "label": "DSPy Primitives (make_signature)", "type": "external", "link": "dspy_primitives.md"},
        {"id": "tool_definition", "label": "Tool Definition (ToolCalls)", "type": "external", "link": "tool_definition.md"},
        {"id": "dspy_utilities", "label": "DSPy Utilities (get_field_description_string)", "type": "external", "link": "dspy_utilities.md"},
        {"id": "chat_adapter", "label": "ChatAdapter (internal to dspy.adapters)", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "two_step_adapter", "target": "base_adapter_interface", "label": "inherits"},
        {"source": "two_step_adapter", "target": "dspy_clients", "label": "uses BaseLM"},
        {"source": "two_step_adapter", "target": "dspy_signatures", "label": "uses Signature"},
        {"source": "two_step_adapter", "target": "dspy_primitives", "label": "uses make_signature"},
        {"source": "two_step_adapter", "target": "tool_definition", "label": "uses ToolCalls"},
        {"source": "two_step_adapter", "target": "dspy_utilities", "label": "uses get_field_description_string"},
        {"source": "two_step_adapter", "target": "chat_adapter", "label": "uses for extraction"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    two_step_adapter[TwoStepAdapter]
    base_adapter_interface[Base Adapter Interface]
    dspy_clients[DSPy Clients (BaseLM)]
    dspy_signatures[DSPy Signatures (Signature)]
    dspy_primitives[DSPy Primitives (make_signature)]
    tool_definition[Tool Definition (ToolCalls)]
    dspy_utilities[DSPy Utilities (get_field_description_string)]
    chat_adapter[ChatAdapter (internal to dspy.adapters)]

    two_step_adapter --> base_adapter_interface
    two_step_adapter --> dspy_clients
    two_step_adapter --> dspy_signatures
    two_step_adapter --> dspy_primitives
    two_step_adapter --> tool_definition
    two_step_adapter --> dspy_utilities
    two_step_adapter --> chat_adapter
```

### Relationships

*   The `TwoStepAdapter` inherits from `[base_adapter_interface](base_adapter_interface.md)`, providing a common interface for adapters within DSPy.
*   It utilizes an `extraction_model` which is an instance of `[dspy_clients.base_lm.BaseLM](dspy_clients.md)`, demonstrating its dependency on the core LM client infrastructure.
*   For the structured extraction phase, `TwoStepAdapter` internally leverages a `ChatAdapter` (a component within the `dspy.adapters` namespace) to process the raw LM output into a structured format.
*   The module interacts extensively with `[dspy_signatures](dspy_signatures.md)` to define the input and output expectations for both stages of the adaptation process.
*   Dynamic signature creation is handled using utilities from `[dspy_primitives](dspy_primitives.md)`, specifically `make_signature`.
*   It uses `[tool_definition](tool_definition.md)` for handling `ToolCalls` in asynchronous operations.
*   Formatting utilities like `get_field_description_string` from `[dspy_utilities](dspy_utilities.md)` are used to construct descriptive prompts.

## How it Fits into the Overall System

The `two_step_adapter` module is a crucial part of the `dspy_adapters` ecosystem. It extends the flexibility of DSPy by offering a robust solution for integrating LMs that are strong in natural language generation and reasoning but may not inherently produce perfectly structured outputs. By abstracting the complex two-stage process, it allows developers to focus on defining the task signature, while the adapter handles the nuances of prompt formatting and structured data extraction. This makes DSPy programs more versatile, enabling them to leverage a wider range of LMs effectively, especially in applications requiring precise data extraction from free-form text.
