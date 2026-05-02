# External Adapters

This module provides interfaces that bridge DSPy programs with various Language Models. It defines a base adapter for formatting inputs, parsing outputs, and handling native LM features, along with specialized adapters for enhanced functionality.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "base_adapter", "label": "Base Adapter Interface", "type": "module", "link": "base_adapter.md"},
        {"id": "specialized_adapters", "label": "Specialized Adapters", "type": "module", "link": "specialized_adapters.md"},
        {"id": "lang_model", "label": "Language Model (BaseLM)", "type": "external"},
        {"id": "dspy_signature", "label": "DSPy Signature", "type": "external"}
    ],
    "edges": [
        {"source": "dspy_signature", "target": "base_adapter", "label": "defines schema for"},
        {"source": "base_adapter", "target": "lang_model", "label": "formats/parses"},
        {"source": "specialized_adapters", "target": "base_adapter", "label": "extends functionality"},
        {"source": "specialized_adapters", "target": "lang_model", "label": "orchestrates calls to"}
    ],
    "groups": [
        {"id": "core_interface", "label": "Core Interface", "role": "analytical", "nodes": ["base_adapter"]},
        {"id": "extensions", "label": "Extensions", "role": "generative", "nodes": ["specialized_adapters"]},
        {"id": "dependencies", "label": "External Dependencies", "role": "data", "nodes": ["lang_model", "dspy_signature"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph core_interface["Core Interface"]
        base_adapter["Base Adapter Interface"]
    end

    subgraph extensions["Extensions"]
        specialized_adapters["Specialized Adapters"]
    end

    subgraph dependencies["External Dependencies"]
        lang_model["Language Model (BaseLM)"]
        dspy_signature["DSPy Signature"]
    end

    dspy_signature -->|"defines schema for"| base_adapter
    base_adapter -->|"formats/parses"| lang_model
    specialized_adapters -->|"extends functionality"| base_adapter
    specialized_adapters -->|"orchestrates calls to"| lang_model

    click base_adapter "base_adapter.md"
    click specialized_adapters "specialized_adapters.md"

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class base_adapter analytical
    class specialized_adapters generative
    class lang_model,dspy_signature data
```