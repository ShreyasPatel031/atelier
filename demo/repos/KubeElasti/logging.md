# Logging Module

The `logging` module provides custom logging functionalities for the system, primarily by extending the `zap` logging library's core capabilities. It ensures consistent and efficient logging across various components of the application.

## Core Functionality

### `CustomCore`

The `CustomCore` component is a wrapper around `zapcore.Core` from the `go.uber.org/zap` logging library. It allows for custom implementation of logging behavior while leveraging the high-performance and structured logging features of `zap`. This design enables the system to integrate specific logging requirements or modify existing `zap` logging mechanisms without rewriting the entire logging infrastructure.

```go
type CustomCore struct {
	zapcore.Core
}
```

By embedding `zapcore.Core`, `CustomCore` inherits all the methods required by the `zap` logging interface, ensuring full compatibility with `zap`'s logging ecosystem.

## Architecture

The `logging` module's architecture is straightforward, focusing on providing a customizable core logging component. It primarily interacts with the `zap` library for its foundational logging capabilities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "custom_core", "label": "CustomCore", "type": "component", "link": null},
        {"id": "zapcore", "label": "zapcore.Core (external library)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "custom_core", "target": "zapcore"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    custom_core[CustomCore]
    zapcore[zapcore.Core (external library)]
    custom_core --> zapcore
```

## Module Relationships

This `logging` module is a leaf module within the `pkg` module. Its `CustomCore` component is designed to be utilized by other modules that require structured and custom logging, such as the `operator` or `resolver` modules, or any other `pkg` sub-modules. While it doesn't explicitly depend on other internal modules for its functionality, it provides a fundamental service that various parts of the system will consume for logging purposes.