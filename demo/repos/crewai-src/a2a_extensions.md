# A2UI Communication Extensions
This module extends Agent-to-Agent communication with A2UI capabilities, enabling agents to interact with declarative user interfaces. It handles client-side prompt augmentation and state management, along with server-side message processing and validation for A2UI interactions.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "client_ext", "label": "A2UI Client Extension", "type": "component", "link": null},
        {"id": "server_ext", "label": "A2UI Server Extension", "type": "component", "link": null},
        {"id": "a2ui_validator", "label": "A2UI Event and Message Validation", "type": "component", "link": null},
        {"id": "a2a_config", "label": "A2A Communication Configuration", "type": "external", "link": "a2a_communication.md"},
        {"id": "agent_core", "label": "Agent Core", "type": "external", "link": "agent_core.md"},
        {"id": "conv_history", "label": "Conversation History", "type": "external", "link": "eventing_and_context.md"}
    ],
    "edges": [
        {"source": "client_ext", "target": "agent_core", "label": "modifies agent behavior"},
        {"source": "client_ext", "target": "conv_history", "label": "extracts state from"},
        {"source": "client_ext", "target": "a2a_config", "label": "reads client config from"},
        {"source": "server_ext", "target": "a2ui_validator", "label": "uses for validation"},
        {"source": "server_ext", "target": "a2a_config", "label": "negotiates parameters with"},
        {"source": "a2a_config", "target": "client_ext", "label": "provides client extensions to"},
        {"source": "a2a_config", "target": "server_ext", "label": "provides server parameters to"},
        {"source": "a2ui_validator", "target": "server_ext", "label": "returns validated data to"}
    ],
    "groups": [
        {"id": "client_handling", "label": "Client-Side A2UI Handling", "role": "surface", "nodes": ["client_ext"]},
        {"id": "server_handling", "label": "Server-Side A2UI Handling", "role": "surface", "nodes": ["server_ext"]},
        {"id": "data_validation", "label": "A2UI Data Validation", "role": "analytical", "nodes": ["a2ui_validator"]}
    ]
}
-->