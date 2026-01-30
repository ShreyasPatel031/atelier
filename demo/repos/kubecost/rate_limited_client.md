# Rate Limited Prometheus Client Module

## Introduction

The `rate_limited_client` module provides a robust and controlled mechanism for interacting with Prometheus, incorporating essential features like rate limiting, authentication, and request queuing. It is a critical component within the `prometheus_integration` ecosystem, ensuring stable and efficient data retrieval while respecting Prometheus API limits.

## Purpose and Core Functionality

This module's primary purpose is to manage and regulate outbound requests to a Prometheus server. By encapsulating a Prometheus client with rate-limiting capabilities, it prevents API abuse, handles back-off strategies, and improves the overall reliability of data collection from Prometheus instances. Its core functionality revolves around:

*   **Rate Limiting**: Controlling the frequency of requests to Prometheus to prevent overwhelming the server or exceeding API rate limits.
*   **Request Queuing**: Managing pending requests in a blocking queue to ensure orderly processing and prevent concurrent request storms.
*   **Authentication**: Handling client authentication for secure communication with Prometheus.
*   **Query Parameter Decoration**: Allowing dynamic modification of query parameters for requests, enabling features like tenant-specific filtering (`headerXScopeOrgId`).
*   **Retry Mechanisms**: Implementing retry logic for rate-limited or failed requests to enhance resilience.

## Architecture and Component Relationships

The `rate_limited_client` module is built around the `RateLimitedPrometheusClient` struct, which orchestrates the interaction with Prometheus by integrating several key components and functionalities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "rate_limited_client", "label": "RateLimitedPrometheusClient", "type": "component", "link": null},
        {"id": "identity_client_interface", "label": "identityClient (Interface)", "type": "component", "link": null},
        {"id": "prometheus_client", "label": "Prometheus Client", "type": "external", "link": "prometheus_integration.md"},
        {"id": "blocking_queue", "label": "collections.BlockingQueue", "type": "external", "link": "core_pkg_collections.md"},
        {"id": "logger", "label": "golog.Logger", "type": "external", "link": "core_pkg_log.md"}
    ],
    "edges": [
        {"source": "rate_limited_client", "target": "identity_client_interface"},
        {"source": "rate_limited_client", "target": "prometheus_client"},
        {"source": "rate_limited_client", "target": "blocking_queue"},
        {"source": "rate_limited_client", "target": "logger"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    rate_limited_client[RateLimitedPrometheusClient]
    identity_client_interface[identityClient (Interface)]
    prometheus_client[Prometheus Client]
    blocking_queue[collections.BlockingQueue]
    logger[golog.Logger]

    rate_limited_client --> identity_client_interface
    rate_limited_client --> prometheus_client
    rate_limited_client --> blocking_queue
    rate_limited_client --> logger
```

### Core Components

*   **`RateLimitedPrometheusClient`**: This is the central struct of the module. It encapsulates all the logic for rate limiting, queuing, authentication, and interacting with the underlying Prometheus client.
    *   `id`: A unique identifier for the client instance.
    *   `client`: An instance of the `prometheus.Client` for making actual requests to Prometheus. This is an external dependency, managed by the broader `prometheus_integration` module.
    *   `auth`: Handles authentication details for Prometheus requests.
    *   `queue`: A `collections.BlockingQueue` instance used to queue `workRequest` objects, ensuring requests are processed in a controlled manner.
    *   `decorator`: An interface (`QueryParamsDecorator`) allowing for dynamic modification of Prometheus query parameters.
    *   `rateLimitRetry`: Configuration options for rate limit retries, including back-off strategies.
    *   `outbound`: An atomic counter tracking the number of active outbound requests.
    *   `fileLogger`: A logger instance for logging client activities, rate limit events, and errors.
    *   `headerXScopeOrgId`: A string for setting the `X-Scope-OrgID` HTTP header, commonly used for multi-tenancy.

*   **`identityClient`**: An interface that defines a method `ID() string`. This interface is likely used by `RateLimitedPrometheusClient` to obtain a unique identifier, potentially for logging or tracing purposes. Any component implementing this interface can provide its ID to the `RateLimitedPrometheusClient`.

### Component Relationships

The `RateLimitedPrometheusClient` acts as the orchestrator, integrating with several key external and internal components:

*   It utilizes a `prometheus.Client` (likely provided by the `prometheus_integration` module) to execute actual Prometheus queries.
*   It relies on `core_pkg_collections.BlockingQueue` for managing and processing requests in a rate-limited fashion.
*   It uses `core_pkg_log.Logger` for detailed logging of its operations and any encountered issues.
*   It interacts with an `identityClient` to retrieve its identifier.
*   Internal components like `ClientAuth`, `QueryParamsDecorator`, and `RateLimitRetryOpts` are directly managed by `RateLimitedPrometheusClient` to fulfill its specialized functions.

## How the Module Fits into the Overall System

The `rate_limited_client` module is a crucial part of the `prometheus_integration` module, which is responsible for all interactions with Prometheus servers. It provides the necessary controls to ensure that Prometheus data retrieval is both efficient and robust, preventing potential performance issues or API rate limit violations.

It serves as a foundational layer for other modules that need to query Prometheus for metrics, such as `metric_collection` or `metric_aggregation`. By centralizing rate limiting and request management, it ensures that all Prometheus-related operations adhere to best practices and operational guidelines.

Specifically, it protects the system from being blacklisted or throttled by Prometheus instances, contributing to the overall stability and reliability of the metric collection pipeline.

