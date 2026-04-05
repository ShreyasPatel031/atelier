# XML Agents Module Documentation

## Introduction

The `xml_agents` module provides tools for creating agents that interact using XML-formatted messages. This approach allows for structured communication between the agent and the environment, facilitating clearer parsing of actions and observations.

## Architecture Overview

The `xml_agents` module is composed of a single core sub-module, `xml_agent_core`, which encapsulates the main classes and functions for defining and instantiating XML-based agents.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "xml_agent_core", "label": "XML Agent Core Components", "type": "module", "link": "xml_agent_core.md"}
    ],
    "edges": [],
    "groups": []
}
-->
```mermaid
graph TD
    xml_agent_core[XML Agent Core Components]

    click xml_agent_core "xml_agent_core.md" "View XML Agent Core Components Documentation"
```

## Sub-modules

### [XML Agent Core Components](xml_agent_core.md)

This sub-module contains the fundamental building blocks for creating XML-driven agents, including the `XMLAgent` class, which defines the agent's planning logic, and the `create_xml_agent` factory function for convenient agent instantiation.
