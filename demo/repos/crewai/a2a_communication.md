# A2A Communication
This module provides the foundational framework for Agent-to-Agent (A2A) communication, encompassing authentication, configuration, various update mechanisms, and extensible protocol features like A2UI for interactive delegation between agents.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "a2a_auth", "label": "A2A Authentication", "type": "module", "link": "a2a_auth.md"},
        {"id": "a2a_config", "label": "A2A Configuration", "type": "module", "link": "a2a_config.md"},
        {"id": "a2a_extensions", "label": "A2A Extensions", "type": "module", "link": "a2a_extensions.md"},
        {"id": "a2a_updates", "label": "A2A Update Handlers", "type": "module", "link": "a2a_updates.md"},
        {"id": "a2a_delegation_core", "label": "A2A Delegation Core", "type": "module", "link": "a2a_delegation_core.md"},
        {"id": "agent_orchestration_ext", "label": "Agent Orchestration", "type": "external"},
        {"id": "event_system_ext", "label": "Event System", "type": "external"}
    ],
    "edges": [
        {"source": "a2a_config", "target": "a2a_auth", "label": "configures auth"},
        {"source": "a2a_config", "target": "a2a_updates", "label": "defines update strategy"},
        {"source": "a2a_config", "target": "a2a_extensions", "label": "enables extensions"},
        {"source": "a2a_delegation_core", "target": "a2a_config", "label": "uses config"},
        {"source": "a2a_delegation_core", "target": "a2a_auth", "label": "applies auth"},
        {"source": "a2a_delegation_core", "target": "a2a_updates", "label": "manages updates"},
        {"source": "a2a_delegation_core", "target": "a2a_extensions", "label": "integrates extensions"},
        {"source": "a2a_updates", "target": "event_system_ext", "label": "emits events"},
        {"source": "a2a_delegation_core", "target": "agent_orchestration_ext", "label": "delegates tasks"}
    ],
    "groups": [
        {"id": "configuration_group", "label": "Configuration", "role": "generative", "nodes": ["a2a_config"]},
        {"id": "security_group", "label": "Security", "role": "surface", "nodes": ["a2a_auth"]},
        {"id": "extension_group", "label": "Extensions", "role": "analytical", "nodes": ["a2a_extensions"]},
        {"id": "update_group", "label": "Update Management", "role": "analytical", "nodes": ["a2a_updates"]},
        {"id": "core_delegation_group", "label": "Core Delegation", "role": "analytical", "nodes": ["a2a_delegation_core"]}
    ]
}
-->
```mermaid
flowchart TD
    subgraph configuration_group["Configuration"]
        a2a_config["A2A Configuration"]
    end
    subgraph security_group["Security"]
        a2a_auth["A2A Authentication"]
    end
    subgraph extension_group["Extensions"]
        a2a_extensions["A2A Extensions"]
    end
    subgraph update_group["Update Management"]
        a2a_updates["A2A Update Handlers"]
    end
    subgraph core_delegation_group["Core Delegation"]
        a2a_delegation_core["A2A Delegation Core"]
    end

    agent_orchestration_ext[("Agent Orchestration")]:::external
    event_system_ext[("Event System")]:::external

    a2a_config -->|'''configures auth'''| a2a_auth
    a2a_config -->|'''defines update strategy'''| a2a_updates
    a2a_config -->|'''enables extensions'''| a2a_extensions
    a2a_delegation_core -->|'''uses config'''| a2a_config
    a2a_delegation_core -->|'''applies auth'''| a2a_auth
    a2a_delegation_core -->|'''manages updates'''| a2a_updates
    a2a_delegation_core -->|'''integrates extensions'''| a2a_extensions
    a2a_updates -->|'''emits events'''| event_system_ext
    a2a_delegation_core -->|'''delegates tasks'''| agent_orchestration_ext

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef external fill:#eee,stroke:#333,stroke-width:2px,color:#000

    class a2a_auth surface
    class a2a_config generative
    class a2a_extensions,a2a_updates,a2a_delegation_core analytical
    class agent_orchestration_ext,event_system_ext external

    click a2a_auth "a2a_auth.md" "View A2A Authentication documentation"
    click a2a_config "a2a_config.md" "View A2A Configuration documentation"
    click a2a_extensions "a2a_extensions.md" "View A2A Extensions documentation"
    click a2a_updates "a2a_updates.md" "View A2A Update Handlers documentation"
    click a2a_delegation_core "a2a_delegation_core.md" "View A2A Delegation Core documentation"
```