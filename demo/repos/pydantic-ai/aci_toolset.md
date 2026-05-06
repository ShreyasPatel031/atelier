# aci_toolset Module Documentation

## Introduction

The `aci_toolset` module provides seamless integration with ACI.dev tools, allowing them to be utilized as callable functions within the `pydantic_ai_agent_core` framework. It acts as a bridge, wrapping external ACI.dev functionalities into a standardized `Toolset` format, making them accessible to agents and other components that interact with tools.

This module is part of the `external_toolset_integrations` and is crucial for extending the agent's capabilities with specialized tools hosted on the ACI.dev platform.

## Module Components and Their Interactions

The core of the `aci_toolset` module is the `ACIToolset` class. This class is responsible for taking a list of ACI function identifiers and converting them into a usable `FunctionToolset`.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "aci_toolset",
            "label": "Integrate ACI.dev Tools",
            "type": "component",
            "link": null
        },
        {
            "id": "function_toolset",
            "label": "Function Toolset Base",
            "type": "external",
            "link": "toolset_management.md"
        },
        {
            "id": "aci_dev_platform",
            "label": "ACI.dev Platform",
            "type": "external",
            "link": null
        }
    ],
    "edges": [
        {
            "source": "aci_toolset",
            "target": "function_toolset",
            "label": "inherits from"
        },
        {
            "source": "aci_toolset",
            "target": "aci_dev_platform",
            "label": "wraps tools from"
        }
    ],
    "groups": []
}
-->

```mermaid
flowchart TD
    %% Internal component of aci_toolset
    aci_toolset["Integrate ACI.dev Tools"]

    %% External dependencies
    function_toolset["Function Toolset Base"]:::external
    aci_dev_platform["ACI.dev Platform"]:::external

    %% Links
    click function_toolset "toolset_management.md"

    %% Relationships
    aci_toolset --"inherits from"--> function_toolset
    aci_toolset -.->"wraps tools from"| aci_dev_platform

    %% Styling for external nodes
    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

### ACIToolset

`pydantic_ai_slim.pydantic_ai.ext.aci.ACIToolset`

The `ACIToolset` class is a specialized `FunctionToolset` designed to integrate with ACI.dev. It takes a list of ACI function names and a `linked_account_owner_id` during initialization. For each ACI function, it internally calls a `tool_from_aci` utility (not directly exposed in this module's core components but implied by its usage) to transform the ACI function into a callable tool compatible with the `FunctionToolset` interface. This allows agents to seamlessly invoke ACI.dev functionalities as if they were native tools.

**Key functionality:**

*   **ACI.dev Integration**: Provides a structured way to incorporate tools from the ACI.dev platform.
*   **Tool Abstraction**: Handles the complexity of interfacing with ACI.dev, presenting a simplified `FunctionToolset` interface to the rest of the system.
*   **Dynamic Tool Creation**: Constructs tool instances based on provided ACI function names at runtime.

## Dependencies

*   **toolset_management**: The `ACIToolset` inherits from `FunctionToolset` (defined in the `toolset_management` module), leveraging its base functionalities for managing and executing a collection of tools. This module provides the foundational structure for toolsets within the `pydantic_ai_agent_core`.
    *   Refer to [toolset_management.md](toolset_management.md) for more details.

*   **ACI.dev Platform**: This module directly interfaces with the ACI.dev platform to fetch and wrap its tools. The `linked_account_owner_id` is essential for authenticating and identifying the context for these external tools.