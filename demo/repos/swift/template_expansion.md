# Module: `template_expansion`

## Introduction
The `template_expansion` module is a crucial component within the `gyb_tools` ecosystem, specifically focusing on the core functionality of expanding GYB (Generate Your Boilerplate) templates. It provides the mechanism to process a template file, substituting variables and executing embedded Python code to produce the final output. This module is a specialized part of the broader [gyb_core](gyb_core.md) functionality, which handles the overall GYB template processing.

## Core Functionality
The primary function of this module is `utils.gyb.expand`, which takes a template file and a set of local bindings (variables) and returns the processed content.

### `utils.gyb.expand`
This function is responsible for:
*   Reading the specified template `filename`.
*   Parsing the template's structure.
*   Executing any embedded Python code within the template using the provided `local_bindings`.
*   Generating optional `line_directive` comments in the output, which can be used by tools for source location mapping (e.g., for debugging or error reporting).
*   Temporarily changing the current working directory to the directory of the template file during execution to ensure relative paths within the template resolve correctly.

**Example Usage (from docstring):**
```python
# (Detailed example omitted for brevity, see source for full code)
# result = expand(
#     f.name,
#     line_directive='//#sourceLocation(file: "%(file)s", ' + \
#                    'line: %(line)d)',
#     x=2
# )
# print(result)
```
This example illustrates how a template file containing Python control flow (`% for i in range(int(x)):`) and variable substitution (`${i}`, `${120 + 3}`, `${\"w\
x\
X\
y\"}`) is processed. The `line_directive` ensures that the output includes comments linking back to the original template file and line numbers.

## Architecture and Component Relationships
The `template_expansion` module is a leaf module within the `gyb_tools` suite. It encapsulates the `expand` function, which is a key part of the GYB template processing pipeline.

It relies on:
*   **[gyb_core](gyb_core.md)**: Specifically, the `parse_template` and `execute_template` functions, which are internal mechanisms used by `expand` to perform the actual parsing and execution of the template. While `expand` is also listed as a core component of `gyb_core`, this module (`template_expansion`) highlights its specific role in the CLI interface for direct template expansion.
*   **Python's `io` module**: For handling file input/output operations.
*   **Python's `os` module**: For path manipulation and changing the current working directory during template expansion.

## System Integration
The `template_expansion` module is a fundamental building block for any system requiring dynamic code generation or text processing based on templates. It is typically invoked by the [gyb_cli_interface](gyb_cli_interface.md) module when a user runs the GYB tool to process a `.gyb` file. Its output can then be further processed or directly used as source code or configuration files.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "expand_func", "label": "expand function", "type": "component", "link": null},
        {"id": "gyb_core", "label": "GYB Core Module", "type": "external", "link": "gyb_core.md"},
        {"id": "io_lib", "label": "io (Python Stdlib)", "type": "external", "link": null},
        {"id": "os_lib", "label": "os (Python Stdlib)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "expand_func", "target": "gyb_core"},
        {"source": "expand_func", "target": "io_lib"},
        {"source": "expand_func", "target": "os_lib"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    %% Internal component of template_expansion
    expand_func[expand function]

    %% External dependencies
    gyb_core[GYB Core Module]
    io_lib[io (Python Stdlib)]
    os_lib[os (Python Stdlib)]

    %% Relationships
    expand_func --> gyb_core
    expand_func --> io_lib
    expand_func --> os_lib
```
