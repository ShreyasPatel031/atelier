# File Handling Module

The `file_handling` module, part of the `dspy_adapters.custom_types.multimedia_data_types` package, provides a robust mechanism for integrating file data into DSPy programs. It defines the `File` class, which serves as a specialized input type for handling various forms of file content, including local files, raw byte streams, and references to uploaded files via IDs.

This module is crucial for applications that require processing or generating responses based on diverse file types, enabling seamless interaction with language models that can consume file-based inputs.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "file_class", "label": "File Class", "type": "component", "link": null},
        {"id": "from_path_method", "label": "from_path()", "type": "component", "link": null},
        {"id": "from_bytes_method", "label": "from_bytes()", "type": "component", "link": null},
        {"id": "from_file_id_method", "label": "from_file_id()", "type": "component", "link": null},
        {"id": "base_type_module", "label": "base_type", "type": "external", "link": "base_type.md"}
    ],
    "edges": [
        {"source": "file_class", "target": "from_path_method"},
        {"source": "file_class", "target": "from_bytes_method"},
        {"source": "file_class", "target": "from_file_id_method"},
        {"source": "file_class", "target": "base_type_module"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    file_class[File Class]
    from_path_method[from_path()]
    from_bytes_method[from_bytes()]
    from_file_id_method[from_file_id()]
    base_type_module[base_type]

    file_class --> from_path_method
    file_class --> from_bytes_method
    file_class --> from_file_id_method
    file_class --> base_type_module
```

## Module Architecture and Component Relationships

### `File` Class

The `File` class (`dspy.adapters.types.file.File`) is the primary component of this module. It inherits from the `Type` class (defined in the [base_type module](base_type.md)), providing a structured way to represent files for DSPy programs. It supports defining file content through `file_data` (a data URI), `file_id` (a reference to an already uploaded file), or `filename`.

**Core Attributes:**

*   `file_data` (`str | None`): A data URI string representing the file's content. Format: `data:<mime_type>;base64,<base64_encoded_data>`. This is used for embedding small files directly into prompts.
*   `file_id` (`str | None`): An identifier for a file that has been previously uploaded to a language model service. This is useful for large files or when avoiding re-uploading the same content.
*   `filename` (`str | None`): An optional name for the file, often derived from the original file path.

**Key Methods:**

*   `validate_input(cls, values: Any) -> Any`:
    A Pydantic model validator that ensures `File` instances are created with at least one of `file_data`, `file_id`, or `filename`. It also handles conversion of various input types into a valid `File` dictionary.

*   `format(self) -> list[dict[str, Any]]`:
    Formats the `File` instance into a list of dictionaries suitable for consumption by DSPy programs and underlying language models (e.g., OpenAI's file content part specification).

*   `__str__(self)` and `__repr__(self)`:
    Provide string representations of the `File` object, useful for debugging and logging. The `__repr__` method intelligently truncates `file_data` for readability.

**Class Methods for File Creation:**

*   `from_path(cls, file_path: str, filename: str | None = None, mime_type: str | None = None) -> "File"`:
    Creates a `File` instance from a local file path. It reads the file, base64 encodes its content, and automatically detects the MIME type and filename if not provided.

*   `from_bytes(cls, file_bytes: bytes, filename: str | None = None, mime_type: str = "application/octet-stream") -> "File"`:
    Constructs a `File` instance from raw bytes. This is useful when file content is available in memory rather than on disk.

*   `from_file_id(cls, file_id: str, filename: str | None = None) -> "File"`:
    Generates a `File` instance using only a `file_id` and an optional `filename`, referencing a file already managed by a service.

## Integration with the Overall System

The `file_handling` module, through its `File` class, plays a vital role in the `dspy_adapters` ecosystem by extending the range of data types that can be directly incorporated into DSPy signatures and programs. It sits within the `multimedia_data_types` module, alongside other specialized data types like [image_handling](image_handling.md) and [audio_handling](audio_handling.md), forming a comprehensive suite for handling various non-textual inputs.

By conforming to the `Type` interface (from [base_type](base_type.md)), `File` instances can be seamlessly used as `InputField`s within `dspy.Signature` definitions, allowing developers to design prompts that directly reference or include file content. This facilitates advanced multimodal reasoning capabilities within DSPy programs.

Example usage, as shown in the core component, demonstrates how a `File` can be used as an input to a DSPy `Signature`:

```python
import dspy

class QA(dspy.Signature):
    file: dspy.File = dspy.InputField()
    summary = dspy.OutputField()
program = dspy.Predict(QA)
result = program(file=dspy.File.from_path("./research.pdf"))
print(result.summary)
```