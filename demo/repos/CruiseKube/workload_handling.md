# Workload Handling Module

## Introduction
The `workload_handling` module provides essential utilities for interacting with and managing various Kubernetes workload types within the system. It offers a standardized interface to abstract away the specifics of different Kubernetes API objects like Deployments, StatefulSets, and DaemonSets, facilitating consistent operations across diverse workloads.

## Architecture Overview
The module's architecture centers around the `WorkloadObject` interface, which defines common methods for retrieving workload metadata. Concrete wrapper types implement this interface, allowing the system to treat different Kubernetes workload kinds uniformly. This design promotes reusability and simplifies interactions with the Kubernetes API for workload-related tasks.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "kubernetes_workload_wrappers", "label": "Kubernetes Workload Wrappers", "type": "module", "link": "kubernetes_workload_wrappers.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    kubernetes_workload_wrappers[Kubernetes Workload Wrappers]
    click kubernetes_workload_wrappers "kubernetes_workload_wrappers.md" "View Kubernetes Workload Wrappers Module"
```

## Sub-modules

### [Kubernetes Workload Wrappers](kubernetes_workload_wrappers.md)
This sub-module encapsulates the logic for handling Kubernetes Deployments, StatefulSets, and DaemonSets. It provides `DaemonSetWrapper`, `StatefulSetWrapper`, and `DeploymentWrapper` types that implement the `WorkloadObject` interface. This interface enables consistent access to properties such as namespace, name, container specifications, selectors, and creation time, crucial for tasks requiring introspection or modification of Kubernetes workloads.
