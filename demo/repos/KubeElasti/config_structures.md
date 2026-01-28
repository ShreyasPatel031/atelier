# config_structures Module Documentation

## Introduction

The `config_structures` module, located within `pkg.config.config`, defines the fundamental data structures used throughout the system for configuration management. It provides clear and consistent blueprints for how various components, particularly the resolver, retrieve and utilize their settings. This module is critical for ensuring that all parts of the application operate with the correct parameters and can be easily configured.

## Architecture Overview

The `config_structures` module primarily consists of two key configuration structures: `Config` and `ResolverConfig`. These structures encapsulate essential settings for the application's operation and the resolver service, respectively. The `ResolverConfig` extends the base `Config`, adding resolver-specific parameters.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "configuration_definitions", "label": "Configuration Definitions", "type": "module", "link": "configuration_definitions.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    configuration_definitions[Configuration Definitions]

    click configuration_definitions "configuration_definitions.md" "View Configuration Definitions Module"
```

## Sub-modules

### Configuration Definitions

The `configuration_definitions` sub-module (`configuration_definitions.md`) focuses on the concrete Go `struct` definitions that hold configuration parameters. It includes:

*   `pkg.config.config.Config`: A base structure for general application settings such as namespace, deployment name, service name, and port.
*   `pkg.config.config.ResolverConfig`: Extends the `Config` structure, adding specific settings pertinent to the resolver component, such as the reverse proxy port.

This sub-module is essential for understanding the data models used to store and pass configuration information throughout the system.

For detailed information, refer to the [Configuration Definitions](configuration_definitions.md) documentation.