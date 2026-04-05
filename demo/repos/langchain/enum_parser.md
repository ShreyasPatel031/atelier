# enum_parser

The `enum_parser` module provides a specialized output parser, `EnumOutputParser`, designed to robustly parse string outputs into members of a specified Python `Enum`. This ensures that the generated output adheres to a predefined set of categorical values, enhancing the reliability and predictability of system responses.

## Core Functionality

The primary function of this module is to validate and convert string-based outputs into their corresponding `Enum` members. It is particularly useful in scenarios where a model or system is expected to produce one of a finite, predefined set of string values.

Key functionalities include:
*   **Enum Validation**: Ensures that the `Enum` provided during initialization has string-based values.
*   **Output Parsing**: Strips whitespace from the input string and attempts to match it against the values of the configured `Enum`.
*   **Error Handling**: Raises an `OutputParserException` if the input string does not match any valid `Enum` value, providing clear feedback about the expected options.
*   **Instruction Generation**: Provides formatted instructions for expected output, aiding in prompt engineering and user guidance.

## Architecture and Component Relationships

The `enum_parser` module contains the `EnumOutputParser` class, which extends `BaseOutputParser`. This integration within the `classic_output_parsers` ecosystem allows it to seamlessly fit into larger parsing pipelines, handling the specific task of enum-based validation.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "enum_output_parser", "label": "EnumOutputParser", "type": "component", "link": null},
        {"id": "base_output_parser", "label": "BaseOutputParser", "type": "external", "link": "base_output_parsers.md"},
        {"id": "enum_module", "label": "enum (Python built-in)", "type": "external", "link": null},
        {"id": "output_parser_exception", "label": "OutputParserException", "type": "external", "link": "base_output_parsers.md"}
    ],
    "edges": [
        {"source": "enum_output_parser", "target": "base_output_parser"},
        {"source": "enum_output_parser", "target": "enum_module"},
        {"source": "enum_output_parser", "target": "output_parser_exception"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    enum_output_parser[EnumOutputParser]
    base_output_parser[BaseOutputParser]
    enum_module[enum (Python built-in)]
    output_parser_exception[OutputParserException]

    enum_output_parser --> base_output_parser
    enum_output_parser --> enum_module
    enum_output_parser --> output_parser_exception
```

## How it Fits into the Overall System

The `enum_parser` module is a crucial component within the `classic_output_parsers` sub-system. It provides a foundational mechanism for enforcing strict adherence to a predefined set of string choices for language model outputs. This is vital for applications requiring structured and predictable responses, such as categorizing user intent, selecting actions from a fixed list, or validating configuration parameters.

It is typically used downstream of a language model, taking the model's raw string output and transforming it into a more structured and validated Python `Enum` object. This modular design allows other parts of the system to rely on strongly typed enum values rather than raw strings, reducing potential errors and improving code readability.

## `EnumOutputParser` Component Details

`libs.langchain.langchain_classic.output_parsers.enum.EnumOutputParser`

This class is an implementation of `BaseOutputParser` specifically tailored for `Enum` types.

**Methods:**

*   `_raise_deprecation(cls, values: dict) -> dict`: A `pre_init` hook that validates if all enum values are strings, raising a `ValueError` if not.
*   `_valid_values(self) -> list[str]`: A property that returns a list of all valid string values from the associated `Enum`.
*   `parse(self, response: str) -> Enum`: The core parsing method. It attempts to convert the input `response` string into an `Enum` member. If the response does not correspond to any enum value, it raises an `OutputParserException`.
*   `get_format_instructions(self) -> str`: Provides clear, human-readable instructions on the expected format of the output, listing all valid enum options.
*   `OutputType(self) -> type[Enum]`: A property returning the `Enum` type this parser is configured to handle.

**Attributes:**

*   `enum: type[Enum]`: The Python `Enum` class that defines the allowed values for parsing. Its values must be strings.

```python
class EnumOutputParser(BaseOutputParser[Enum]):
    """Parse an output that is one of a set of values."""

    enum: type[Enum]
    """The enum to parse. Its values must be strings."""

    @pre_init
    def _raise_deprecation(cls, values: dict) -> dict:
        enum = values["enum"]
        if not all(isinstance(e.value, str) for e in enum):
            msg = "Enum values must be strings"
            raise ValueError(msg)
        return values

    @property
    def _valid_values(self) -> list[str]:
        return [e.value for e in self.enum]

    @override
    def parse(self, response: str) -> Enum:
        try:
            return self.enum(response.strip())
        except ValueError as e:
            msg = (
                f"Response '{response}' is not one of the "
                f"expected values: {self._valid_values}"
            )
            raise OutputParserException(msg) from e

    @override
    def get_format_instructions(self) -> str:
        return f"Select one of the following options: {', '.join(self._valid_values)}"

    @property
    @override
    def OutputType(self) -> type[Enum]:
        return self.enum
```