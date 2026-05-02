# Prompt Definitions Module

This module defines various prompt templates and structures, including base classes for different prompt types, chat-specific message templates (AI, system, chat), and structured prompts with schema definitions for precise model interaction.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "base_prompt", "label": "Base Prompt Template", "type": "module"},
        {"id": "base_msg_prompt", "label": "Base Message Prompt Template", "type": "module"},
        {"id": "string_prompt", "label": "String Prompt Template", "type": "module"},
        {"id": "chat_prompt_value", "label": "Chat Prompt Value Concrete", "type": "module"},
        {"id": "ai_msg_template", "label": "AI Message Prompt Template", "type": "module"},
        {"id": "sys_msg_template", "label": "System Message Prompt Template", "type": "module"},
        {"id": "chat_msg_template", "label": "Chat Message Prompt Template", "type": "module"},
        {"id": "structured_prompt", "label": "Structured Prompt", "type": "module"},
        {"id": "external_schema", "label": "External Schema", "type": "external"}
    ],
    "edges": [
        {"source": "base_prompt", "target": "string_prompt", "label": "specializes"},
        {"source": "base_msg_prompt", "target": "ai_msg_template", "label": "specializes"},
        {"source": "base_msg_prompt", "target": "sys_msg_template", "label": "specializes"},
        {"source": "base_msg_prompt", "target": "chat_msg_template", "label": "specializes"},
        {"source": "chat_msg_template", "target": "chat_prompt_value", "label": "formats into"},
        {"source": "base_prompt", "target": "structured_prompt", "label": "builds upon"},
        {"source": "structured_prompt", "target": "external_schema", "label": "uses schema"}
    ],
    "groups": [
        {"id": "prompt_abstractions", "label": "Prompt Core Abstractions", "role": "analytical", "nodes": ["base_prompt", "base_msg_prompt", "string_prompt"]},
        {"id": "chat_prompts", "label": "Chat Message Templates", "role": "generative", "nodes": ["ai_msg_template", "sys_msg_template", "chat_msg_template"]},
        {"id": "structured_processing", "label": "Structured Prompt Logic", "role": "analytical", "nodes": ["structured_prompt"]},
        {"id": "prompt_values", "label": "Prompt Values and Schemas", "role": "data", "nodes": ["chat_prompt_value", "external_schema"]}
    ]
}
-->
```
```mermaid
flowchart TD
    subgraph prompt_abstractions["Prompt Core Abstractions"]
        base_prompt["Base Prompt Template"]
        base_msg_prompt["Base Message Prompt Template"]
        string_prompt["String Prompt Template"]
    end

    subgraph chat_prompts["Chat Message Templates"]
        ai_msg_template["AI Message Prompt Template"]
        sys_msg_template["System Message Prompt Template"]
        chat_msg_template["Chat Message Prompt Template"]
    end

    subgraph structured_processing["Structured Prompt Logic"]
        structured_prompt["Structured Prompt"]
    end

    subgraph prompt_values["Prompt Values and Schemas"]
        chat_prompt_value[("Chat Prompt Value Concrete")]
        external_schema[("External Schema")]
    end

    base_prompt -->|'''specializes'''| string_prompt
    base_msg_prompt -->|'''specializes'''| ai_msg_template
    base_msg_prompt -->|'''specializes'''| sys_msg_template
    base_msg_prompt -->|'''specializes'''| chat_msg_template
    chat_msg_template -->|'''formats into'''| chat_prompt_value
    base_prompt ==>|'''builds upon'''| structured_prompt
    structured_prompt -.->|'''uses schema'''| external_schema

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef data fill:#d1fae5,stroke:#10b991,stroke-width:2px,color:#065f46

    class base_prompt,base_msg_prompt,string_prompt,structured_prompt analytical
    class ai_msg_template,sys_msg_template,chat_msg_template generative
    class chat_prompt_value,external_schema data
```