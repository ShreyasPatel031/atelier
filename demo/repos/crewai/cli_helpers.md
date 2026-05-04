# cli_helpers
This module provides helper utilities and base classes for the CrewAI command-line interface, including command definitions, API interactions, file templating, and crew execution.

<!-- DIAGRAM_JSON
{
    "nodes": [
        {
            "id": "BaseCommand",
            "label": "BaseCommand",
            "type": "class"
        },
        {
            "id": "PlusAPIMixin",
            "label": "PlusAPIMixin",
            "type": "class"
        },
        {
            "id": "copy_template_files",
            "label": "copy_template_files",
            "type": "function"
        },
        {
            "id": "run_crew_tool_with_messages",
            "label": "run_crew_tool_with_messages",
            "type": "function"
        },
        {
            "id": "ContentCrew",
            "label": "ContentCrew",
            "type": "class"
        }
    ],
    "edges": [],
    "groups": []
}
-->
```mermaid
graph TD
    subgraph cli_helpers
        BaseCommand[BaseCommand]
        PlusAPIMixin[PlusAPIMixin]
        copy_template_files["copy_template_files()"]
        run_crew_tool_with_messages["run_crew_tool_with_messages()"]
        ContentCrew[ContentCrew]
    end

    classDef codeClass fill:#D2B4DE,stroke:#8E44AD,stroke-width:2px;
    classDef function fill:#A9CCE3,stroke:#3498DB,stroke-width:2px;

    class BaseCommand,PlusAPIMixin,ContentCrew codeClass
    class copy_template_files,run_crew_tool_with_messages function
```