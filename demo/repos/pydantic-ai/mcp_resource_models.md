# MCP Resource Models

The `mcp_resource_models` module defines the core data structures for representing resources and resource templates within the Model Context Protocol (MCP) framework. It provides Pydantic models that align with the MCP specification, enabling standardized communication and management of contextual information in AI applications.

## Architecture

This module is composed of two primary sub-modules that handle the definition of individual resources and their parameterized templates. These models are crucial for describing and interacting with information served by MCP servers.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "resource_definition", "label": "Resource Definition", "type": "module", "link": "resource_definition.md"},
        {"id": "resource_template_definition", "label": "Resource Template Definition", "type": "module", "link": "resource_template_definition.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    resource_definition[Resource Definition]
    resource_template_definition[Resource Template Definition]

    click resource_definition "resource_definition.md" "View Resource Definition Documentation"
    click resource_template_definition "resource_template_definition.md" "View Resource Template Definition Documentation"
```

## Sub-modules

### [Resource Definition](resource_definition.md)
This sub-module focuses on the `Resource` class, which represents a single, addressable resource available on an MCP server. It includes attributes such as URI, name, title, description, MIME type, and size, along with annotations and metadata for richer context.

### [Resource Template Definition](resource_template_definition.md)
This sub-module defines the `ResourceTemplate` class, which allows for the creation of parameterized resource URIs. It enables dynamic generation of resource paths based on templates, supporting flexible resource discovery and access patterns within the MCP ecosystem.
