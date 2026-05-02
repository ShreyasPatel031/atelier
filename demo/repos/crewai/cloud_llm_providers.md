# Cloud LLM Provider Integrations
This module integrates with various cloud-based Large Language Model (LLM) providers like Anthropic, Azure, AWS Bedrock, and Google Gemini, enabling native completion, streaming, and tool-calling capabilities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "anthropic_completion_node", "label": "Anthropic LLM Completion", "type": "module", "link": "cloud_llm_providers.md"},
        {"id": "azure_completion_node", "label": "Azure LLM Completion", "type": "module", "link": "cloud_llm_providers.md"},
        {"id": "bedrock_completion_node", "label": "AWS Bedrock LLM Completion", "type": "module", "link": "cloud_llm_providers.md"},
        {"id": "gemini_completion_node", "label": "Google Gemini LLM Completion", "type": "module", "link": "cloud_llm_providers.md"},
        {"id": "llm_provider_api", "label": "LLM Provider APIs", "type": "external"}
    ],
    "edges": [
        {"source": "anthropic_completion_node", "target": "llm_provider_api", "label": "requests"},
        {"source": "azure_completion_node", "target": "llm_provider_api", "label": "requests"},
        {"source": "bedrock_completion_node", "target": "llm_provider_api", "label": "requests"},
        {"source": "gemini_completion_node", "target": "llm_provider_api", "label": "requests"}
    ],
    "groups": [
        {"id": "integrations", "label": "LLM Provider Integrations", "role": "generative", "nodes": ["anthropic_completion_node", "azure_completion_node", "bedrock_completion_node", "gemini_completion_node"]},
        {"id": "external", "label": "External LLM Services", "role": "external", "nodes": ["llm_provider_api"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph integrations["LLM Provider Integrations"]
        anthropic_completion_node["Anthropic LLM Completion"]
        azure_completion_node["Azure LLM Completion"]
        bedrock_completion_node["AWS Bedrock LLM Completion"]
        gemini_completion_node["Google Gemini LLM Completion"]
    end

    subgraph external["External LLM Services"]
        llm_provider_api["LLM Provider APIs"]
    end

    anthropic_completion_node -->|"requests"| llm_provider_api
    azure_completion_node -->|"requests"| llm_provider_api
    bedrock_completion_node -->|"requests"| llm_provider_api
    gemini_completion_node -->|"requests"| llm_provider_api

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef external fill:#ccfbf1,stroke:#2dd4bf,stroke-width:2px,color:#0f766e

    class anthropic_completion_node,azure_completion_node,bedrock_completion_node,gemini_completion_node generative
    class llm_provider_api external

    click anthropic_completion_node "cloud_llm_providers.md"
    click azure_completion_node "cloud_llm_providers.md"
    click bedrock_completion_node "cloud_llm_providers.md"
    click gemini_completion_node "cloud_llm_providers.md"
```