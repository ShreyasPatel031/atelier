# `document_data_type`

The `document_data_type` module defines the `Document` class, a specialized data type for representing textual content that can be leveraged by language models, particularly for generating responses with citations. This module is a core part of the `dspy.adapters.types.structured_text_data` package, providing a structured way to handle and format document content and its associated metadata for advanced LLM interactions.

## Core Functionality

The primary component of this module is the `Document` class. It encapsulates the text `data`, an optional `title`, `media_type` (defaulting to `text/plain` but also supporting `application/pdf`), and `context` for a piece of content. The design allows language models to properly reference and cite the provided source material, enhancing the reliability and verifiability of generated outputs.

### `Document` Class

- **Purpose**: Represents a document designed to be consumed by language models for citation-enabled responses.
- **Attributes**:
    - `data` (str): The main textual content of the document.
    - `title` (str, optional): An optional title for the document, useful for clearer citations.
    - `media_type` (Literal["text/plain", "application/pdf"]): Specifies the MIME type of the content. Defaults to "text/plain".
    - `context` (str, optional): Additional contextual information about the document.

- **Methods**:
    - `format()`: Transforms the `Document` instance into a list of dictionaries, adhering to the specific format expected by citation-enabled language models (e.g., Anthropic's Citations API). This method structures the document content, media type, and citation enablement flags.
    - `description()`: Provides a concise string description of the `Document` type, intended for use within prompts to guide language models.
    - `validate_input(data: Any)`: A class method utilizing `pydantic.model_validator` to robustly handle various input formats for `Document` creation. It supports direct `Document` instances, raw strings (treated as `data`), or dictionaries, ensuring flexibility in how documents are instantiated.
    - `__str__()`: Returns a user-friendly string representation of the document, typically showing its title (if present) and the length of its content.

## Architecture and Component Relationships

The `document_data_type` module primarily revolves around the `Document` class. It inherits from `dspy.adapters.types.base_type.Type`, establishing its place within the broader type system defined in the `dspy_adapters` module. The `Document` class components (`format`, `validate_input`, `description`) are internal functions that define its behavior.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "document_class", "label": "Document Class", "type": "component", "link": null},
        {"id": "format_method", "label": "format()", "type": "component", "link": null},
        {"id": "validate_method", "label": "validate_input()", "type": "component", "link": null},
        {"id": "description_method", "label": "description()", "type": "component", "link": null},
        {"id": "base_type", "label": "Base Type", "type": "external", "link": "base_type.md"},
        {"id": "structured_text_data", "label": "Structured Text Data Module", "type": "external", "link": "structured_text_data.md"}
    ],
    "edges": [
        {"source": "document_class", "target": "format_method"},
        {"source": "document_class", "target": "validate_method"},
        {"source": "document_class", "target": "description_method"},
        {"source": "document_class", "target": "base_type"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    document_class[Document Class]
    format_method[format()]
    validate_method[validate_input()]
    description_method[description()]
    base_type[Base Type]
    structured_text_data[Structured Text Data Module]

    document_class --> format_method
    document_class --> validate_method
    document_class --> description_method
    document_class --> base_type

    click base_type "base_type.md"
    click structured_text_data "structured_text_data.md"
```

## Integration with the Overall System

The `document_data_type` module plays a crucial role in enabling advanced LLM capabilities by providing a robust and flexible `Document` abstraction. It is a fundamental component within the `structured_text_data` sub-module of `dspy_adapters`, which is responsible for defining various structured text types for LLM interactions. Specifically, `Document` instances are designed to be used as `dspy.InputField()` within `dspy.Signature` definitions (as shown in the example), allowing users to easily pass document content to language models that support citation features.

This module integrates with:

*   [`base_type`](base_type.md): It inherits from `Type`, ensuring adherence to the base type system for adapter types.
*   [`structured_text_data`](structured_text_data.md): It is a member of this module, contributing to the overall handling of structured text data within the DSPy framework.
*   [`citation_handling`](citation_handling.md): While `Document` itself doesn't directly manage citations, it is designed to be used in conjunction with citation mechanisms (like the `Citations` output field) to provide the necessary source material for citation generation by LLMs.
