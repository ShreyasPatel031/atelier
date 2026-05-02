# task_and_guardrail_tools
This module provides components for dynamic task execution, including conditional task logic, a placeholder for hallucination detection, and a utility for creating static tool filters.

<!-- DIAGRAM_JSON
{
  "nodes": [
    {
      "id": "ConditionalTask",
      "label": "ConditionalTask",
      "type": "class"
    },
    {
      "id": "HallucinationGuardrail",
      "label": "HallucinationGuardrail",
      "type": "class"
    },
    {
      "id": "create_static_tool_filter",
      "label": "create_static_tool_filter",
      "type": "function"
    }
  ],
  "edges": [],
  "groups": [
    {
      "id": "Tasks",
      "label": "Tasks",
      "nodes": ["ConditionalTask"]
    },
    {
      "id": "Guardrails",
      "label": "Guardrails",
      "nodes": ["HallucinationGuardrail"]
    },
    {
      "id": "ToolFilters",
      "label": "Tool Filters",
      "nodes": ["create_static_tool_filter"]
    }
  ]
}
-->
```mermaid
flowchart TD
    subgraph Tasks
        ConditionalTask[ConditionalTask]
    end

    subgraph Guardrails
        HallucinationGuardrail[HallucinationGuardrail]
    end

    subgraph Tool Filters
        create_static_tool_filter["create_static_tool_filter()"]
    end

    classDef taskNode fill:#f9f,stroke:#333,stroke-width:2px
    classDef functionNode fill:#bbf,stroke:#333,stroke-width:2px

    class ConditionalTask,HallucinationGuardrail taskNode
    class create_static_tool_filter functionNode
```