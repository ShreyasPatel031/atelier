# Metric Fetching Core Module

## Introduction

The `metric_fetching_core` module is responsible for defining and executing tasks related to fetching metrics from various sources, primarily Prometheus. It encapsulates the configuration required for metric fetching tasks and the core logic to interact with Kubernetes, Prometheus, and the storage layer.

## Architecture Overview

This module integrates with Kubernetes for cluster information, Prometheus for metric data, and a local storage solution for persisting fetched metrics. It relies on configuration settings defined in the `configuration` module and leverages clients from `metrics_provider_prometheus` and `database_adapters`.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "metric_fetching_internals", "label": "Metric Fetching Internals", "type": "module", "link": "metric_fetching_internals.md"},
        {"id": "metrics_provider_prometheus", "label": "Metrics Provider Prometheus", "type": "external", "link": "metrics_provider_prometheus.md"},
        {"id": "database_adapters", "label": "Database Adapters", "type": "external", "link": "database_adapters.md"},
        {"id": "configuration", "label": "Configuration", "type": "external", "link": "configuration.md"},
        {"id": "cluster_management", "label": "Cluster Management", "type": "external", "link": "cluster_management.md"}
    ],
    "edges": [
        {"source": "metric_fetching_internals", "target": "metrics_provider_prometheus"},
        {"source": "metric_fetching_internals", "target": "database_adapters"},
        {"source": "metric_fetching_internals", "target": "configuration"},
        {"source": "metric_fetching_internals", "target": "cluster_management"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    metric_fetching_internals[Metric Fetching Internals]
    metrics_provider_prometheus[Metrics Provider Prometheus]
    database_adapters[Database Adapters]
    configuration[Configuration]
    cluster_management[Cluster Management]

    metric_fetching_internals --> metrics_provider_prometheus
    metric_fetching_internals --> database_adapters
    metric_fetching_internals --> configuration
    metric_fetching_internals --> cluster_management

    click metric_fetching_internals "metric_fetching_internals.md" "View Metric Fetching Internals Documentation"
    click metrics_provider_prometheus "metrics_provider_prometheus.md" "View Prometheus Metrics Provider Documentation"
    click database_adapters "database_adapters.md" "View Database Adapters Documentation"
    click configuration "configuration.md" "View Configuration Module Documentation"
    click cluster_management "cluster_management.md" "View Cluster Management Documentation"
```

## Sub-modules

### [Metric Fetching Internals](metric_fetching_internals.md)

This sub-module defines the fundamental components for metric fetching tasks, including the configuration (`FetchMetricsTaskConfig`) and the core task structure (`FetchMetricsTask`). It details the dependencies on Kubernetes, Prometheus, and the internal storage mechanism required for operation. More details can be found in its dedicated documentation.