# Metric Fetching Tasks Module

The `metric_fetching_tasks` module is responsible for defining and implementing the task for fetching metrics from various sources within the system. It encapsulates the configuration and logic required to retrieve performance and operational metrics, which are crucial for system monitoring, analysis, and recommendation generation.

## Architecture Overview

This module's core functionality is centered around the `metric_fetching_core` sub-module, which interacts with external services to gather metric data.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "metric_fetching_core", "label": "Metric Fetching Core", "type": "module", "link": "metric_fetching_core.md"},
        {"id": "metrics_provider_prometheus", "label": "Prometheus Metrics Provider", "type": "module", "link": "metrics_provider_prometheus.md"},
        {"id": "data_storage_repository", "label": "Data Storage Repository", "type": "module", "link": "data_storage_repository.md"}
    ],
    "edges": [
        {"source": "metric_fetching_core", "target": "metrics_provider_prometheus"},
        {"source": "metric_fetching_core", "target": "data_storage_repository"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    metric_fetching_core[Metric Fetching Core]
    metrics_provider_prometheus[Prometheus Metrics Provider]
    data_storage_repository[Data Storage Repository]

    metric_fetching_core --> metrics_provider_prometheus
    metric_fetching_core --> data_storage_repository

    click metric_fetching_core "metric_fetching_core.md" "View Metric Fetching Core Documentation"
    click metrics_provider_prometheus "metrics_provider_prometheus.md" "View Prometheus Metrics Provider Documentation"
    click data_storage_repository "data_storage_repository.md" "View Data Storage Repository Documentation"
```

## Sub-modules

### [Metric Fetching Core](metric_fetching_core.md)
The `metric_fetching_core` sub-module contains the primary components for configuring and executing metric fetching operations. It defines the `FetchMetricsTaskConfig`, which specifies the task's name, enablement status, schedule, and associated cluster ID, and the `FetchMetricsTask` itself, which orchestrates the retrieval of metrics by interacting with Kubernetes clients, a Prometheus provider, and a storage mechanism.
