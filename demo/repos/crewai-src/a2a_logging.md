# A2A Logging Module

This module configures a dedicated logger for the Agent-to-Agent (A2A) communication framework, ensuring all emitted logs are in a structured JSON format and directed to a stream handler.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "configure_json_logging_func", "label": "configure_json_logging()", "type": "component", "link": null},
        {"id": "get_logger", "label": "Get Logger Instance", "type": "component", "link": null},
        {"id": "remove_old_handlers", "label": "Remove Existing Handlers", "type": "component", "link": null},
        {"id": "create_stream_handler", "label": "Create StreamHandler", "type": "component", "link": null},
        {"id": "create_json_formatter", "label": "Create JSONFormatter", "type": "component", "link": null},
        {"id": "set_formatter", "label": "Set Formatter on Handler", "type": "component", "link": null},
        {"id": "add_new_handler", "label": "Add Handler to Logger", "type": "component", "link": null},
        {"id": "logging_module", "label": "Python Logging Module", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "configure_json_logging_func", "target": "get_logger", "label": "initiates"},
        {"source": "get_logger", "target": "remove_old_handlers", "label": "prepares logger"},
        {"source": "remove_old_handlers", "target": "create_stream_handler", "label": "proceeds to"},
        {"source": "create_stream_handler", "target": "create_json_formatter", "label": "needs formatter"},
        {"source": "create_json_formatter", "target": "set_formatter", "label": "provides"},
        {"source": "set_formatter", "target": "add_new_handler", "label": "handler ready"},
        {"source": "add_new_handler", "target": "configure_json_logging_func", "label": "completes"},
        {"source": "configure_json_logging_func", "target": "logging_module", "label": "interacts with"}
    ],
    "groups": [
        {"id": "json_logging_process", "label": "JSON Logging Configuration Process", "role": "analytical", "nodes": ["get_logger", "remove_old_handlers", "create_stream_handler", "create_json_formatter", "set_formatter", "add_new_handler"]}
    ]
}
-->
```mermaid
flowchart TD
    configure_json_logging_func["configure_json_logging()"]

    subgraph json_logging_process["JSON Logging Configuration Process"]
        get_logger["Get Logger Instance"]
        remove_old_handlers["Remove Existing Handlers"]
        create_stream_handler["Create StreamHandler"]
        create_json_formatter["Create JSONFormatter"]
        set_formatter["Set Formatter on Handler"]
        add_new_handler["Add Handler to Logger"]
    end

    logging_module["Python Logging Module"]

    configure_json_logging_func -->|"initiates"| get_logger
    get_logger -->|"prepares logger"| remove_old_handlers
    remove_old_handlers -->|"proceeds to"| create_stream_handler
    create_stream_handler -->|"needs formatter"| create_json_formatter
    create_json_formatter -->|"provides"| set_formatter
    set_formatter -->|"handler ready"| add_new_handler
    add_new_handler -->|"completes"| configure_json_logging_func
    configure_json_logging_func -.->|"interacts with"| logging_module

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef component fill:#fff,stroke:#333,stroke-width:2px,color:#333
    classDef external fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f

    class configure_json_logging_func component
    class logging_module external

    %% The nodes inside the subgraph inherit the subgraph's role, no need to apply separate classes for them.
```