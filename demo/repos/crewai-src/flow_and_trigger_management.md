# Flow and Trigger Management CLI
This module provides command-line interface functionalities for managing AI flows, including running, plotting, and adding crews, as well as listing and executing triggers from various integrations.
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "flow_run_cli", "label": "Run Flow (CLI)", "type": "component", "link": null},
        {"id": "flow_plot_cli", "label": "Plot Flow (CLI)", "type": "component", "link": null},
        {"id": "flow_add_crew_cli", "label": "Add Crew to Flow (CLI)", "type": "component", "link": null},
        {"id": "triggers_list_cli", "label": "List Triggers (CLI)", "type": "component", "link": null},
        {"id": "triggers_run_cli", "label": "Run Trigger (CLI)", "type": "component", "link": null},
        {"id": "flow_module", "label": "Tasks and Flow", "type": "external", "link": "tasks_and_flow.md"},
        {"id": "agents_crews_module", "label": "Agents and Crews", "type": "external", "link": "agents_and_crews.md"},
        {"id": "integrations", "label": "External Integrations", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "flow_run_cli", "target": "flow_module", "label": "initiates execution"},
        {"source": "flow_plot_cli", "target": "flow_module", "label": "visualizes structure"},
        {"source": "flow_add_crew_cli", "target": "flow_module", "label": "modifies flow"},
        {"source": "flow_add_crew_cli", "target": "agents_crews_module", "label": "uses crew definitions"},
        {"source": "triggers_list_cli", "target": "integrations", "label": "fetches trigger info from"},
        {"source": "triggers_run_cli", "target": "integrations", "label": "receives payload from"},
        {"source": "triggers_run_cli", "target": "flow_module", "label": "initiates flow execution"}
    ],
    "groups": [
        {"id": "flow_management_group", "label": "Flow Management", "role": "analytical", "nodes": ["flow_run_cli", "flow_plot_cli", "flow_add_crew_cli"]},
        {"id": "trigger_management_group", "label": "Trigger Management", "role": "analytical", "nodes": ["triggers_list_cli", "triggers_run_cli"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph flow_management_group["Flow Management"]
        flow_run_cli["Run Flow (CLI)"]
        flow_plot_cli["Plot Flow (CLI)"]
        flow_add_crew_cli["Add Crew to Flow (CLI)"]
    end

    subgraph trigger_management_group["Trigger Management"]
        triggers_list_cli["List Triggers (CLI)"]
        triggers_run_cli["Run Trigger (CLI)"]
    end

    flow_module["Tasks and Flow"]:::external
    agents_crews_module["Agents and Crews"]:::external
    integrations["External Integrations"]:::external

    flow_run_cli ==>|"initiates execution"| flow_module
    flow_plot_cli -->|"visualizes structure"| flow_module
    flow_add_crew_cli -->|"modifies flow"| flow_module
    flow_add_crew_cli -->|"uses crew definitions"| agents_crews_module
    triggers_list_cli -->|"fetches trigger info from"| integrations
    triggers_run_cli ==>|"receives payload from"| integrations
    triggers_run_cli ==>|"initiates flow execution"| flow_module

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef external fill:#fff2cc,stroke:#f59e0b,stroke-width:1px,color:#9a3412

    class flow_run_cli,flow_plot_cli,flow_add_crew_cli analytical
    class triggers_list_cli,triggers_run_cli analytical
    class flow_module,agents_crews_module,integrations external

    click flow_module "tasks_and_flow.md" "View Tasks and Flow Module"
    click agents_crews_module "agents_and_crews.md" "View Agents and Crews Module"
```