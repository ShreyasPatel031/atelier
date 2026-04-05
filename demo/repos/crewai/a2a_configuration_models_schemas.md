# a2a_configuration_models_schemas

## Introduction
The `a2a_configuration_models_schemas` module defines the data structures (Pydantic models) used for configuring Agent-to-Agent (A2A) communication within the CrewAI framework. This module is crucial for establishing how an agent client connects to and interacts with a remote A2A agent, encompassing aspects like authentication, communication protocols, timeouts, and extension handling. It provides a standardized way to define the parameters for these interactions.

## Core Functionality
This module provides two primary configuration schemas:
1.  **`A2AConfig`**: A legacy configuration model for A2A protocol integration. It is deprecated and its use is discouraged in favor of `A2AClientConfig`.
2.  **`A2AClientConfig`**: The recommended configuration model for connecting to remote A2A agents. It offers a comprehensive set of attributes to control various aspects of the A2A client's behavior.

Both models define critical parameters such as:
*   `endpoint`: The URL of the A2A agent.
*   `auth`: The authentication scheme to be used for secure communication, referencing schemes defined in [a2a_auth_schemes](a2a_auth_schemes.md).
*   `timeout`: The maximum time to wait for a response from the A2A agent.
*   `max_turns`: The maximum number of conversational turns allowed with the A2A agent.
*   `response_model`: An optional Pydantic model to enforce structured responses from the A2A agent.
*   `fail_fast`: A flag to determine whether to raise an error immediately if the agent is unreachable or to skip and continue.
*   `trust_remote_completion_status`: A flag to indicate whether to directly trust the A2A agent's completion status.
*   `updates`: Configuration for the update mechanism, which defaults using a factory from [a2a_update_config_factory](a2a_update_config_factory.md).
*   `client_extensions`: Client-side processing hooks for tool injection and prompt augmentation, which are handled by extensions defined in [a2a_a2ui_extensions](a2a_a2ui_extensions.md).
*   `transport`: Detailed transport configuration, including preferred and supported transport protocols, and gRPC settings, managed within [a2a_config](a2a_config.md).

`A2AClientConfig` extends `A2AConfig` by adding fields like `accepted_output_modes` (media types the client can accept) and `extensions` (extension URIs the client supports), providing more granular control for client-side operations.

## Architecture and Component Relationships

The `a2a_configuration_models_schemas` module sits within the `a2a_config` hierarchy, providing the concrete Pydantic models. It depends on several other modules for defining authentication schemes, update mechanisms, and extension handling.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "a2a_config_schema", "label": "A2AConfig (Deprecated)", "type": "component", "link": null},
        {"id": "a2a_client_config_schema", "label": "A2AClientConfig", "type": "component", "link": null},
        {"id": "a2a_auth_schemes", "label": "A2A Auth Schemes", "type": "external", "link": "a2a_auth_schemes.md"},
        {"id": "a2a_update_config_factory", "label": "A2A Update Config Factory", "type": "external", "link": "a2a_update_config_factory.md"},
        {"id": "a2a_a2ui_extensions", "label": "A2A A2UI Extensions", "type": "external", "link": "a2a_a2ui_extensions.md"},
        {"id": "a2a_config_parent", "label": "A2A Config Module", "type": "external", "link": "a2a_config.md"}
    ],
    "edges": [
        {"source": "a2a_config_schema", "target": "a2a_auth_schemes"},
        {"source": "a2a_config_schema", "target": "a2a_update_config_factory"},
        {"source": "a2a_config_schema", "target": "a2a_a2ui_extensions"},
        {"source": "a2a_config_schema", "target": "a2a_config_parent"},
        {"source": "a2a_client_config_schema", "target": "a2a_auth_schemes"},
        {"source": "a2a_client_config_schema", "target": "a2a_update_config_factory"},
        {"source": "a2a_client_config_schema", "target": "a2a_a2ui_extensions"},
        {"source": "a2a_client_config_schema", "target": "a2a_config_parent"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    a2a_config_schema[A2AConfig (Deprecated)]
    a2a_client_config_schema[A2AClientConfig]
    a2a_auth_schemes[A2A Auth Schemes]
    a2a_update_config_factory[A2A Update Config Factory]
    a2a_a2ui_extensions[A2A A2UI Extensions]
    a2a_config_parent[A2A Config Module]
    a2a_config_schema --> a2a_auth_schemes
    a2a_config_schema --> a2a_update_config_factory
    a2a_config_schema --> a2a_a2ui_extensions
    a2a_config_schema --> a2a_config_parent
    a2a_client_config_schema --> a2a_auth_schemes
    a2a_client_config_schema --> a2a_update_config_factory
    a2a_client_config_schema --> a2a_a2ui_extensions
    a2a_client_config_schema --> a2a_config_parent
```

## How the Module Fits into the Overall System
This module is a critical part of the CrewAI's Agent-to-Agent (A2A) communication infrastructure. It defines the blueprints for configuring how agents discover, connect to, and interact with other agents in a distributed environment. By providing structured configuration models, it ensures that A2A interactions are consistent, secure, and extensible.

It serves as the concrete implementation for the configuration abstractions defined within the broader [a2a_config](a2a_config.md) module, which itself is a core component of [crewai_agent_to_agent_communication](crewai_agent_to_agent_communication.md). Any part of the system that needs to configure an A2A client will rely on the schemas defined here.
