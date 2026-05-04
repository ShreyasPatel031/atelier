# Groq Chat Model Integration

This module provides core utilities for integrating Groq chat models, focusing on efficient message format conversions and accurate usage metadata extraction for seamless interaction with the Groq API.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "libs_partners_groq",
            "label": "Groq Chat Model Integration",
            "type": "module"
        },
        {
            "id": "groq_message_conversion",
            "label": "Message Conversion",
            "type": "module",
            "link": "groq_message_conversion.md"
        },
        {
            "id": "groq_usage_reporting",
            "label": "Usage Reporting",
            "type": "module",
            "link": "groq_usage_reporting.md"
        }
    ],
    "edges": [
        {
            "source": "groq_message_conversion",
            "target": "groq_usage_reporting",
            "label": "generates metadata"
        }
    ],
    "groups": [
        {
            "id": "groq_integration_logic",
            "label": "Groq Integration Logic",
            "role": "generative",
            "nodes": [
                "groq_message_conversion",
                "groq_usage_reporting"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph groq_integration_logic["Groq Integration Logic"]
        groq_message_conversion["Message Conversion"]
        groq_usage_reporting["Usage Reporting"]
    end

    groq_message_conversion -->|
    generates metadata
    | groq_usage_reporting

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class groq_message_conversion,groq_usage_reporting generative

    click groq_message_conversion "groq_message_conversion.md"
    click groq_usage_reporting "groq_usage_reporting.md"
```