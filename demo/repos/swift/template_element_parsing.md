# template_element_parsing Module Documentation

## Introduction
The `template_element_parsing` module is a fundamental component within the `gyb_tools` (Generate Your Boilerplate) system. It is responsible for parsing and interpreting the individual elements found within GYB template files. This module distinguishes between literal text and embedded Python code, handling their respective processing to facilitate the dynamic generation of output.

## Purpose and Core Functionality
The primary purpose of the `template_element_parsing` module is to represent and process different types of content encountered during the parsing of a GYB template. It provides the core Abstract Syntax Tree (AST) nodes for handling both static text and executable Python code, enabling the transformation of a `.gyb` file into its final generated output.

Its core functionalities include:
- **Parsing Literal Text:** Identifying and storing segments of the template that are meant to be output directly without modification.
- **Parsing Python Code:** Identifying and compiling Python code blocks or substitution expressions within the template.
- **Execution of Code:** Dynamically executing embedded Python code, managing its scope, and capturing its output for inclusion in the generated text.
- **AST Representation:** Providing `ASTNode` implementations for code and literal segments, allowing for structured traversal and processing of the template.

## Architecture and Component Relationships
The `template_element_parsing` module is composed of two primary AST node classes: `Code` and `Literal`. Both inherit from a common `ASTNode` base class (defined in the parent module, [gyb_template_elements](gyb_template_elements.md)), making them integral parts of the GYB template's Abstract Syntax Tree.

### Core Components

#### `Code` Class (`utils.gyb.Code`)
The `Code` class represents Python code snippets within a GYB template. It handles various forms of embedded Python, including:
- **Substitution expressions** (`${...}` or `%<expr>%`):
  The content is treated as a Python expression, evaluated, and its result is appended to the output.
- **Multi-line code blocks** (`%{...}%`):
  The content is treated as executable Python statements. These blocks can contain nested `Block` (from [gyb_template_elements](gyb_template_elements.md)) instances, allowing for complex control flow within the template.
- **Single-line code statements** (`%...`):
  Similar to multi-line blocks but for single-line statements.

The `Code` class compiles the Python source into an executable `code` object and uses `eval` to execute it within a specific `context`. It manages the `__children__` bindings to handle nested template blocks during execution. It ensures that the `__children__` context is not mutated by the executed code.

#### `Literal` Class (`utils.gyb.Literal`)
The `Literal` class represents static text segments within a GYB template that should be included directly in the generated output. It captures the raw text from the template and, during execution, simply appends this text to the output stream provided by the `context`.

### Relationships
Both `Code` and `Literal` interact heavily with a `context` object during their `__init__` (parsing) and `execute` (generation) phases. This `context` provides essential information like the current token, filename, line numbers, and methods to append text to the final output.

## How the Module Fits into the Overall System
The `template_element_parsing` module is a crucial leaf module within the `gyb_tools` ecosystem. It acts as the interpreter for the fundamental building blocks of a GYB template. When a `.gyb` file is processed, the `gyb_core` module (and specifically `gyb_template_elements`) uses these `Code` and `Literal` classes to construct an AST. Subsequently, the `execute` methods of these classes are invoked in sequence to render the template, producing the final output. This module abstracts away the complexities of Python code execution and text handling, allowing higher-level GYB components to focus on template structure and flow control.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "Code_Node", "label": "Code (ASTNode)", "type": "component", "link": null},
        {"id": "Literal_Node", "label": "Literal (ASTNode)", "type": "component", "link": null},
        {"id": "gyb_template_elements", "label": "gyb_template_elements Module", "type": "external", "link": "gyb_template_elements.md"}
    ],
    "edges": [
        {"source": "Code_Node", "target": "gyb_template_elements", "label": "inherits ASTNode, uses Block"},
        {"source": "Literal_Node", "target": "gyb_template_elements", "label": "inherits ASTNode"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    %% Internal components of template_element_parsing
    Code_Node[Code (ASTNode)]
    Literal_Node[Literal (ASTNode)]

    %% External dependencies
    gyb_template_elements[gyb_template_elements Module]

    %% Relationships
    Code_Node -- "inherits ASTNode, uses Block" --> gyb_template_elements
    Literal_Node -- "inherits ASTNode" --> gyb_template_elements
```