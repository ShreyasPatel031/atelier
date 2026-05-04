# base_modules
This module defines the foundational `BaseModule` and `Module` classes, which form the core structure for building composable and optimizable DSPy programs. It also includes `REPLVariable` for managing REPL environment data.

<!-- DIAGRAM_JSON
{
    "nodes": [
        {
            "id": "base_modules",
            "label": "base_modules",
            "type": "module"
        },
        {
            "id": "BM",
            "label": "BaseModule",
            "file": "dspy.primitives.base_module"
        },
        {
            "id": "M",
            "label": "Module",
            "file": "dspy.primitives.module"
        },
        {
            "id": "RV",
            "label": "REPLVariable",
            "file": "dspy.primitives.repl_types"
        },
        {
            "id": "repl_utilities",
            "label": "REPL Variable Management",
            "type": "module",
            "link": "repl_utilities.md"
        },
        {
            "id": "module_core",
            "label": "Core Program Modules",
            "type": "module",
            "link": "module_core.md"
        }
    ],
    "edges": [
        {
            "source": "M",
            "target": "BM",
            "type": "inherits"
        },
        {
            "source": "base_modules",
            "target": "repl_utilities"
        },
        {
            "source": "base_modules",
            "target": "module_core"
        }
    ],
    "groups": [
        {
            "id": "Core",
            "label": "Core Modules",
            "nodes": [
                "BM",
                "M"
            ]
        },
        {
            "id": "REPL",
            "label": "REPL Utilities",
            "nodes": [
                "RV"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph Core [Core Modules]
        BM["dspy.primitives.base_module.BaseModule"]
        M["dspy.primitives.module.Module"]
    end

    subgraph REPL [REPL Utilities]
        RV["dspy.primitives.repl_types.REPLVariable"]
    end

    M -->|"inherits"| BM
```