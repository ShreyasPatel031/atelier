# Memory Analysis
This module uses large language models to analyze incoming memory content, inferring its scope, categories, importance, and associated metadata. It also forms consolidation plans for new memories against existing ones, determining whether to insert, update, or delete records.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "new_memory_content", "label": "New Memory Content", "type": "data", "link": null},
        {"id": "existing_memory_records", "label": "Existing Memory Records", "type": "data", "link": null},
        {"id": "analyze_for_save", "label": "Analyze for Save (LLM)", "type": "component", "link": null},
        {"id": "analyze_for_consolidation", "label": "Analyze for Consolidation (LLM)", "type": "component", "link": null},
        {"id": "llm_integration", "label": "LLM Integration", "type": "external", "link": "llm_integration.md"},
        {"id": "memory_management", "label": "Memory Management", "type": "external", "link": "memory_management.md"},
        {"id": "save_analysis_output", "label": "Save Analysis (Schema)", "type": "data", "link": null},
        {"id": "consolidation_plan_output", "label": "Consolidation Plan (Schema)", "type": "data", "link": null}
    ],
    "edges": [
        {"source": "new_memory_content", "target": "analyze_for_save", "label": "content to analyze"},
        {"source": "new_memory_content", "target": "analyze_for_consolidation", "label": "new content"},
        {"source": "existing_memory_records", "target": "analyze_for_consolidation", "label": "similar records"},
        {"source": "llm_integration", "target": "analyze_for_save", "label": "uses"},
        {"source": "llm_integration", "target": "analyze_for_consolidation", "label": "uses"},
        {"source": "analyze_for_save", "target": "save_analysis_output", "label": "produces"},
        {"source": "analyze_for_consolidation", "target": "consolidation_plan_output", "label": "produces"},
        {"source": "save_analysis_output", "target": "memory_management", "label": "persists"},
        {"source": "consolidation_plan_output", "target": "memory_management", "label": "guides persistence"},
        {"source": "memory_management", "target": "existing_memory_records", "label": "provides"}
    ],
    "groups": [
        {"id": "memory_analysis_functions", "label": "Memory Analysis Functions", "role": "analytical", "nodes": ["analyze_for_save", "analyze_for_consolidation"]}
    ]
}
-->
```mermaid
flowchart TD
    new_memory_content[("New Memory Content")]