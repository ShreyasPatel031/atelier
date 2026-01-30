# Data Types Module

## Introduction

The `data_types` module defines the fundamental data structures used across various components of the system. It provides consistent and strongly-typed definitions for statistics, workload analysis, and other critical information, ensuring data integrity and facilitating seamless communication between different parts of the application.

## Architecture Overview

The `data_types` module is a foundational layer that other modules depend on for data representation. It is logically separated into sub-modules based on the domain of the data they represent, primarily statistics and workload-related information. This separation ensures a clear organization and prevents data type definitions from becoming monolithic.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "stats_types", "label": "Statistics Data Types", "type": "module", "link": "stats_types.md"},
        {"id": "workload_types", "label": "Workload Data Types", "type": "module", "link": "workload_types.md"}
    ],
    "edges": [
        
    ],
    "groups": []
}
-->

```mermaid
graph TD
    stats_types[Statistics Data Types]
    workload_types[Workload Data Types]

    click stats_types "stats_types.md" "View Statistics Data Types Documentation"
    click workload_types "workload_types.md" "View Workload Data Types Documentation"
```

## Sub-modules

### [Statistics Data Types](stats_types.md)
This sub-module defines data structures for various statistics related to workloads, containers, CPU, and memory usage, including predictions and OOM events. It provides the blueprints for how statistical data is structured and exchanged within the system.

### [Workload Data Types](workload_types.md)
This sub-module specifies data types for workload analysis, recommendation responses, killswitch operations, and workload override information. It is crucial for understanding the structure of data related to workload management and optimization.
