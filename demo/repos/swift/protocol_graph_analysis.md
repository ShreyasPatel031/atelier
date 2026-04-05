# protocol_graph_analysis Module Documentation

## Introduction

The `protocol_graph_analysis` module is a vital component within the broader `compiler_pass_analysis` system. Its primary function is to parse and analyze protocol definitions, constructing a graph that represents the inheritance and relationships between various protocols. This module is crucial for understanding the structure and dependencies of protocols within the compiled code.

## Purpose and Core Functionality

The core functionality of the `protocol_graph_analysis` module revolves around the `parse_protocol` function. This function is responsible for:

*   **Extracting Protocol Information**: Given a regular expression match object (`m`), it extracts the child protocol's name and its parent protocols.
*   **Filtering Irrelevant Protocols**: It intelligently skips built-in convertible protocols (e.g., `_Builtin.*Convertible`) to focus on user-defined or significant protocols.
*   **Building Protocol Graph**: It populates a global `graph` dictionary where keys are protocol names and values are sets of their child protocols, effectively mapping out the inheritance hierarchy.
*   **Storing Protocol Body**: It stores the body lines of each protocol in a global `body` dictionary, keyed by the protocol name.

This process allows other parts of the compiler analysis to query and traverse the protocol graph, facilitating various optimizations and checks related to protocol conformance and inheritance.

## Architecture and Component Relationships

The `protocol_graph_analysis` module is designed with a single core function, `parse_protocol`, which interacts with internal data structures and external utilities.

### Core Components:

*   **`parse_protocol` Function**: This is the central function that orchestrates the parsing and graph construction logic.

### Internal Data Structures:

*   **`graph` (Dictionary)**: A global dictionary that maintains the protocol inheritance graph. It maps a parent protocol to a set of its direct child protocols.
*   **`body` (Dictionary)**: A global dictionary that stores the textual body of each protocol, allowing for later inspection or analysis of the protocol's contents.

### External Dependencies:

*   **`re` (Python Regex Library)**: Used by `parse_protocol` for pattern matching to identify and extract protocol names and filter irrelevant ones.

## Overall System Integration

The `protocol_graph_analysis` module is a sub-module of the [compiler_pass_analysis](compiler_pass_analysis.md) module. It provides foundational data (the protocol graph and bodies) that can be utilized by various compiler passes and analysis tools to understand and manipulate protocol-oriented code. Its output is essential for tasks such as identifying protocol conformances, detecting cycles in protocol inheritance, or performing transformations based on protocol relationships.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "parse_protocol_func", "label": "parse_protocol Function", "type": "component", "link": null},
        {"id": "protocol_data_structures", "label": "Internal Protocol Data Structures (graph, body)", "type": "component", "link": null},
        {"id": "re_library", "label": "Python Regex Library (re)", "type": "external", "link": null},
        {"id": "compiler_pass_analysis", "label": "Compiler Pass Analysis Module", "type": "external", "link": "compiler_pass_analysis.md"}
    ],
    "edges": [
        {"source": "parse_protocol_func", "target": "protocol_data_structures"},
        {"source": "parse_protocol_func", "target": "re_library"},
        {"source": "compiler_pass_analysis", "target": "parse_protocol_func"}
    ],
    "groups": [
        {"id": "protocol_graph_analysis_group", "label": "protocol_graph_analysis Module", "members": ["parse_protocol_func", "protocol_data_structures"]}
    ]
}
-->

```mermaid
graph TD
    subgraph protocol_graph_analysis_group[protocol_graph_analysis Module]
        parse_protocol_func[parse_protocol Function]
        protocol_data_structures{Internal Protocol Data Structures (graph, body)}
        parse_protocol_func --> protocol_data_structures
    end

    re_library[Python Regex Library (re)]
    compiler_pass_analysis[Compiler Pass Analysis Module]
    click compiler_pass_analysis "compiler_pass_analysis.md"

    parse_protocol_func --> re_library
    compiler_pass_analysis --> protocol_graph_analysis_group
```