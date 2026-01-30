# Module: `metric_store_interface_and_implementation`

## Introduction
The `metric_store_interface_and_implementation` module provides the foundational interface and a concrete in-memory implementation for storing, managing, and querying metrics within the system. It defines how metric collectors register themselves, how metrics are updated, and how they can be retrieved.

## Purpose and Core Functionality
This module is crucial for the centralized management of metrics. Its primary responsibilities include:
*   **Metric Registration**: Allowing `MetricCollector` instances to register themselves, enabling the system to route updates and queries to them.
*   **Metric Deregistration**: Providing a mechanism to remove `MetricCollector` instances when they are no longer needed.
*   **Metric Querying**: Facilitating the retrieval of aggregated metric results for specific collectors.
*   **Metric Updates**: Handling the update of individual metric values based on their name, labels, and timestamp, accommodating updates across multiple collectors utilizing the same metric.

## Architecture and Component Relationships

The module consists of a key interface and its in-memory implementation:

*   **`MetricStore` (Interface)**: Defines the contract for any metric storage implementation. It specifies methods for `Register`, `Unregister`, `Query`, and `Update` operations.
*   **`InMemoryMetricStore` (Implementation)**: A concrete implementation of the `MetricStore` interface that stores metrics and collector references in memory using Go maps, protected by a mutex for concurrent access. It manages `MetricCollector` instances, allowing efficient lookups by both metric name and collector ID.

### External Dependencies
This module interacts with:
*   **`MetricCollector`**: An external component representing an entity responsible for collecting specific metrics. Details of this component can be found in the [metric_collection.md](metric_collection.md) documentation.
*   **`MetricCollectorID`**: A unique identifier for a `MetricCollector`.
*   **`aggregator.MetricResult`**: Represents the structured result of a metric query, likely defined within the `metric_aggregation` module. Refer to [metric_aggregation.md](metric_aggregation.md) for more details.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "metric_store_interface", "label": "MetricStore Interface", "type": "component", "link": null},
        {"id": "in_memory_metric_store", "label": "InMemoryMetricStore", "type": "component", "link": null},
        {"id": "metric_collector", "label": "MetricCollector", "type": "external", "link": "metric_collection.md"},
        {"id": "metric_aggregator", "label": "Aggregator (MetricResult)", "type": "external", "link": "metric_aggregation.md"}
    ],
    "edges": [
        {"source": "in_memory_metric_store", "target": "metric_store_interface", "label": "Implements"},
        {"source": "metric_store_interface", "target": "metric_collector", "label": "Uses"},
        {"source": "metric_store_interface", "target": "metric_aggregator", "label": "Returns in Query"},
        {"source": "in_memory_metric_store", "target": "metric_collector", "label": "Manages"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    metric_store_interface[MetricStore Interface]
    in_memory_metric_store[InMemoryMetricStore]
    metric_collector[MetricCollector]
    metric_aggregator[Aggregator (MetricResult)]

    in_memory_metric_store -- "Implements" --> metric_store_interface
    metric_store_interface -- "Uses" --> metric_collector
    metric_store_interface -- "Returns in Query" --> metric_aggregator
    in_memory_metric_store -- "Manages" --> metric_collector
```

## How the Module Fits into the Overall System
The `metric_store_interface_and_implementation` module is a fundamental part of the `metric_storage` sub-system, which itself is part of the broader `metric_management` module. It acts as the central repository for all collected metric data before it is further processed or exposed.

*   **`metric_collection`**: Provides the `MetricCollector` instances that interact with this module to register and update metrics.
*   **`metric_aggregation`**: Consumes the `MetricResult` types provided by this module's `Query` operations, likely for further processing or consolidation of metric data.
*   **Other modules**: Any component requiring access to current or historical metric data would interact with the `MetricStore` interface provided by this module.
