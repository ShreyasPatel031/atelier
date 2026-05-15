# Skills and Type Definitions
This module defines core skills functionality and essential data types for managing callbacks and streaming output, ensuring proper resource handling and data flow within the system.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "skills_and_types",
            "label": "Skills and Type Definitions",
            "type": "module"
        },
        {
            "id": "skill_loading",
            "label": "Skill Resource Loading",
            "type": "module",
            "link": "skill_loading.md"
        },
        {
            "id": "type_utilities",
            "label": "Type Definitions and Utilities",
            "type": "module",
            "link": "type_utilities.md"
        }
    ],
    "edges": [
        {
            "source": "skill_loading",
            "target": "type_utilities",
            "label": "uses type definitions"
        }
    ],
    "groups": [
        {
            "id": "skill_management",
            "label": "Skill Management",
            "role": "analytical",
            "nodes": [
                "skill_loading"
            ]
        },
        {
            "id": "type_system",
            "label": "Type System",
            "role": "data",
            "nodes": [
                "type_utilities"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph skill_management["Skill Management"]
        skill_loading["Skill Resource Loading"]
    end

    subgraph type_system["Type System"]
        type_utilities["Type Definitions and Utilities"]
    end

    skill_loading -->|"uses type definitions"| type_utilities

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class skill_loading analytical
    class type_utilities data

    click skill_loading "skill_loading.md"
    click type_utilities "type_utilities.md"
```