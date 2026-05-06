# A2A Utilities and Events Module
This module provides essential utilities for Agent-to-Agent (A2A) communication, including agent card management, gRPC delegation wrappers, and a comprehensive set of event definitions for tracking A2A interactions.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "agent_card_management", "label": "Manage Agent Cards", "type": "module", "link": "agent_card_management.md"},
        {"id": "a2a_delegation_wrappers", "label": "A2A Delegation Wrappers", "type": "module", "link": "a2a_delegation_wrappers.md"},
        {"id": "grpc_communication_utils", "label": "gRPC Communication Utilities", "type": "module", "link": "grpc_communication_utils.md"},
        {"id": "a2a_event_types", "label": "A2A Event Types", "type": "module", "link": "a2a_event_types.md"},
        {"id": "a2a_communication_parent", "label": "A2A Communication (Parent)", "type": "external"},
        {"id": "eventing_and_context", "label": "Eventing and Context", "type": "external"},
        {"id": "a2a_configuration", "label": "A2A Configuration", "type": "external"},
        {"id": "auth_schemes", "label": "Auth Schemes", "type": "external"}
    ],
    "edges": [
        {"source": "a2a_communication_parent", "target": "agent_card_management", "label": "uses agent card utils"},
        {"source": "a2a_communication_parent", "target": "a2a_delegation_wrappers", "label": "orchestrates A2A delegation"},
        {"source": "a2a_communication_parent", "target": "grpc_communication_utils", "label": "employs communication utils"},
        {"source": "agent_card_management", "target": "a2a_configuration", "label": "fetches card config"},
        {"source": "agent_card_management", "target": "auth_schemes", "label": "verifies card signature"},
        {"source": "a2a_delegation_wrappers", "target": "agent_card_management", "label": "retrieves agent info"},
        {"source": "a2a_delegation_wrappers", "target": "grpc_communication_utils", "label": "uses communication interceptors"},
        {"source": "grpc_communication_utils", "target": "auth_schemes", "label": "applies auth metadata"},
        {"source": "a2a_event_types", "target": "eventing_and_context", "label": "emits events to"}
    ],
    "groups": [
        {"id": "a2a_core_logic", "label": "Core A2A Logic", "role": "analytical", "nodes": ["agent_card_management", "a2a_delegation_wrappers", "grpc_communication_utils"]},
        {"id": "a2a_event_reporting", "label": "A2A Event Reporting", "role": "generative", "nodes": ["a2a_event_types"]},
        {"id": "parent_module_reference", "label": "Parent Module", "role": "surface", "nodes": ["a2a_communication_parent"]}
    ]
}
-->