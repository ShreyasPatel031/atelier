# Container Metrics Data Module

The `container_metrics_data` module defines the core data structures used for storing and representing container-level resource utilization metrics. This module is critical for tasks involving performance analysis, resource optimization, and anomaly detection within containers, providing detailed CPU, memory, and PSI-adjusted usage statistics.

## Architecture

The `container_metrics_data` module is composed of data structures that meticulously organize various performance metrics. It primarily provides definitions for comprehensive container metrics and specialized PSI-adjusted usage, which are consumed by higher-level modules for analysis and decision-making.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "container_metrics_types", "label": "Container Metric Types", "type": "module", "link": "container_metrics_types.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    container_metrics_types[Container Metric Types]
    click container_metrics_types "container_metrics_types.md" "View Container Metric Types Documentation"
```

## Sub-modules

### [Container Metric Types](container_metrics_types.md)
This sub-module defines the fundamental data structures, such as `ContainerMetrics` and `PSIAdjustedUsage`, that encapsulate various CPU and memory performance metrics collected from individual containers. These types are essential for storing raw and processed metric data, facilitating subsequent analysis and processing by other modules.