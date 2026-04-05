# Base Type Module

The `base_type` module defines the foundational `Type` class, serving as the abstract base class for all custom data types within DSPy. It enables developers to create structured data formats that can be seamlessly integrated into DSPy signatures, facilitating more sophisticated and structured interactions with Language Models (LMs).

## Core Functionality

The primary component of this module is `dspy.adapters.types.base_type.Type`, a Pydantic BaseModel that provides a common interface and essential methods for custom data types. Subclasses of `Type` are expected to implement the `format` method, which dictates how the custom data type should be represented for an LM (e.g., as a list of content parts for OpenAI's API).

Key functionalities include:
- **`format(self) -> list[dict[str, Any]] | str`**: An abstract method that subclasses must implement to define the LM-consumable representation of the custom type.
- **`description(cls) -> str`**: Returns a description of the custom type.
- **`extract_custom_type_from_annotation(cls, annotation)`**: Recursively extracts all custom types from a given type annotation, handling nested types.
- **`serialize_model(self)`**: Serializes the custom type instance into a JSON string format, embedding it with special identifiers for DSPy's internal processing.
- **`adapt_to_native_lm_feature(...)`**: Allows custom types to adapt DSPy signatures and LM arguments (`lm_kwargs`) to leverage native LM features (e.g., native tool calling) if supported by the LM.
- **`is_streamable(cls) -> bool`**: Indicates whether the custom type supports streaming.
- **`parse_stream_chunk(cls, chunk: "ModelResponseStream") -> Optional["Type"]`**: Parses a stream chunk into an instance of the custom type.
- **`parse_lm_response(cls, response: str | dict[str, Any]) -> Optional["Type"]`**: Parses a complete LM response into an instance of the custom type.

## Architecture and Component Relationships

The `base_type` module, with its central `Type` class, establishes the blueprint for defining structured data within DSPy. It serves as a base for various specific custom types such as `Audio`, `Image`, `Code`, `Document`, `Tool`, and `Citation`, which inherit from it.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "base_type_type", "label": "Type (Base Custom Type)", "type": "component", "link": null},
        {"id": "pydantic", "label": "Pydantic (External Library)", "type": "external", "link": null},
        {"id": "dspy_clients", "label": "dspy_clients.base_lm.BaseLM", "type": "external", "link": "dspy_clients.md"},
        {"id": "dspy_signatures", "label": "dspy_signatures.signature.Signature", "type": "external", "link": "dspy_signatures.md"},
        {"id": "custom_types", "label": "custom_types Module", "type": "external", "link": "custom_types.md"}
    ],
    "edges": [
        {"source": "base_type_type", "target": "pydantic"},
        {"source": "base_type_type", "target": "dspy_clients"},
        {"source": "base_type_type", "target": "dspy_signatures"},
        {"source": "custom_types", "target": "base_type_type"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    base_type_type[Type (Base Custom Type)]
    pydantic(Pydantic (External Library))
    dspy_clients[dspy_clients.base_lm.BaseLM]
    dspy_signatures[dspy_signatures.signature.Signature]
    custom_types[custom_types Module]

    base_type_type --> pydantic
    base_type_type --> dspy_clients
    base_type_type --> dspy_signatures
    custom_types --> base_type_type
```

## How it Fits into the Overall System

The `base_type` module is a fundamental part of the `dspy_adapters` module, specifically within the `dspy.adapters.types` hierarchy. It provides the essential abstraction for creating and managing custom data types that extend beyond simple strings or integers in DSPy signatures. By defining a standard `Type` interface, it allows for a consistent way to handle complex data structures when interacting with LMs.

This module is crucial for:
- **Extensibility**: Developers can easily define new custom types to support novel data formats or specific application needs.
- **Structured LM Interactions**: Enables LMs to process and generate structured outputs, such as images, code, documents, or tool calls, by providing a clear format for these data types.
- **Adaptability**: Facilitates the adaptation of custom types to native LM features, optimizing performance and leveraging advanced capabilities of different LMs.

The `Type` class is inherited by all specific custom type implementations, such as those found in the [custom_types.md](custom_types.md) module, forming the backbone for DSPy's rich data handling capabilities in advanced LM applications.
