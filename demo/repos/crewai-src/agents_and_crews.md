# Agents and Crews
This module defines the core components for creating and managing AI agents and crews. It includes structures for agent definition, lifecycle management, execution logic, and adapters for integrating with various LLM frameworks and structured output formats.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "agent_definition", "label": "Define Agents and Crews", "type": "module", "link": "agent_definition.md"},
        {"id": "agent_execution_and_adapters", "label": "Execute Agent Actions and Adapt", "type": "module", "link": "agent_execution_and_adapters.md"},
        {"id": "llm_integration", "label": "LLM Integration", "type": "module", "link": "llm_integration.md"},
        {"id": "tools_and_integrations", "label": "Tools and Integrations", "type": "module", "link": "tools_and_integrations.md"},
        {"id": "eventing_and_context", "label": "Eventing and Context", "type": "module", "link": "eventing_and_context.md"},
        {"id": "tasks_and_flow", "label": "Tasks and Flow", "type": "module", "link": "tasks_and_flow.md"}
    ],
    "edges": [
        {"source": "agent_definition", "target": "agent_execution_and_adapters", "label": "configures"},
        {"source": "llm_integration", "target": "agent_execution_and_adapters", "label": "provides LLMs"},
        {"source": "tools_and_integrations", "target": "agent_execution_and_adapters", "label": "provides tools"},
        {"source": "eventing_and_context", "target": "agent_execution_and_adapters", "label": "emits/receives events"},
        {"source": "tasks_and_flow", "target": "agent_execution_and_adapters", "label": "defines tasks"}
    ],
    "groups": [
        {"id": "agent_core_logic", "label": "Agent Core Logic", "role": "generative", "nodes": ["agent_definition"]},
        {"id": "agent_processing", "label": "Agent Processing", "role": "analytical", "nodes": ["agent_execution_and_adapters"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph agent_core_logic["Agent Core Logic"]
        agent_definition["Define Agents and Crews"]
    end

    subgraph agent_processing["Agent Processing"]
        agent_execution_and_adapters["Execute Agent Actions and Adapt"]
    end

    llm_integration["LLM Integration"]
    tools_and_integrations["Tools and Integrations"]
    eventing_and_context["Eventing and Context"]
    tasks_and_flow["Tasks and Flow"]

    agent_definition -->|
configures
| agent_execution_and_adapters
    llm_integration -->|
provides LLMs
| agent_execution_and_adapters
    tools_and_integrations -->|
provides tools
| agent_execution_and_adapters
    eventing_and_context -->|
emits/receives events
| agent_execution_and_adapters
    tasks_and_flow -->|
defines tasks
| agent_execution_and_adapters

    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef module fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f

    class agent_definition generative
    class agent_execution_and_adapters analytical
    class llm_integration,tools_and_integrations,eventing_and_context,tasks_and_flow module

    click agent_definition "agent_definition.md"
    click agent_execution_and_adapters "agent_execution_and_adapters.md"
    click llm_integration "llm_integration.md"
    click tools_and_integrations "tools_and_integrations.md"
    click eventing_and_context "eventing_and_context.md"
    click tasks_and_flow "tasks_and_flow.md"
```