# CrewAI Tools Module
This module provides a comprehensive suite of tools for CrewAI agents, enabling diverse functionalities such as web interaction, information retrieval, data management, and integrations with various AI services and platforms.

<!-- DIAGRAM_JSON
{
    "direction": "TB",
    "nodes": [
        {"id": "web_interaction_tools", "label": "Web Interaction Tools", "type": "module", "link": "web_interaction_tools.md"},
        {"id": "information_retrieval_tools", "label": "Information Retrieval Tools", "type": "module", "link": "information_retrieval_tools.md"},
        {"id": "data_management_tools", "label": "Data Management Tools", "type": "module", "link": "data_management_tools.md"},
        {"id": "ai_integrations_and_evaluation_tools", "label": "AI Integrations and Evaluation Tools", "type": "module", "link": "ai_integrations_and_evaluation_tools.md"}
    ],
    "edges": [
        {"source": "web_interaction_tools", "target": "information_retrieval_tools", "label": "provides data for"},
        {"source": "web_interaction_tools", "target": "data_management_tools", "label": "stores web data"},
        {"source": "information_retrieval_tools", "target": "data_management_tools", "label": "stores retrieved data"},
        {"source": "ai_integrations_and_evaluation_tools", "target": "information_retrieval_tools", "label": "leverages"},
        {"source": "ai_integrations_and_evaluation_tools", "target": "web_interaction_tools", "label": "automates"},
        {"source": "ai_integrations_and_evaluation_tools", "target": "data_management_tools", "label": "manages data for"}
    ],
    "groups": [
        {"id": "core_functionality", "label": "Core Functionality", "role": "generative", "nodes": ["web_interaction_tools", "information_retrieval_tools", "data_management_tools"]},
        {"id": "ai_layer", "label": "AI Layer", "role": "analytical", "nodes": ["ai_integrations_and_evaluation_tools"]}
    ]
}
-->
```mermaid
flowchart TB
    subgraph core_functionality["Core Functionality"]
        web_interaction_tools["Web Interaction Tools"]
        information_retrieval_tools["Information Retrieval Tools"]
        data_management_tools["Data Management Tools"]
    end

    subgraph ai_layer["AI Layer"]
        ai_integrations_and_evaluation_tools["AI Integrations and Evaluation Tools"]
    end

    web_interaction_tools -->|
    provides data for
    | information_retrieval_tools
    web_interaction_tools -->|
    stores web data
    | data_management_tools
    information_retrieval_tools -->|
    stores retrieved data
    | data_management_tools
    ai_integrations_and_evaluation_tools -->|
    leverages
    | information_retrieval_tools
    ai_integrations_and_evaluation_tools -->|
    automates
    | web_interaction_tools
    ai_integrations_and_evaluation_tools -->|
    manages data for
    | data_management_tools

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class web_interaction_tools,information_retrieval_tools,data_management_tools generative
    class ai_integrations_and_evaluation_tools analytical

    click web_interaction_tools "web_interaction_tools.md"
    click information_retrieval_tools "information_retrieval_tools.md"
    click data_management_tools "data_management_tools.md"
    click ai_integrations_and_evaluation_tools "ai_integrations_and_evaluation_tools.md"
```