# type_utilities
This module provides utilities for converting string paths to callables and a base class for managing streaming output with result access.

<!-- DIAGRAM_JSON
{
    "nodes": [
        {
            "id": "string_to_callable",
            "label": "string_to_callable",
            "type": "function"
        },
        {
            "id": "StreamingOutputBase",
            "label": "StreamingOutputBase",
            "type": "class"
        }
    ],
    "edges": [],
    "groups": [
        {
            "id": "type_utilities",
            "label": "type_utilities",
            "nodes": [
                "string_to_callable",
                "StreamingOutputBase"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph type_utilities
        string_to_callable["string_to_callable"]
        StreamingOutputBase["StreamingOutputBase"]
    end

    classDef function fill:#DDF,stroke:#000,stroke-width:1px;
    classDef classNode fill:#FDD,stroke:#000,stroke-width:1px;

    class string_to_callable function
    class StreamingOutputBase classNode
```