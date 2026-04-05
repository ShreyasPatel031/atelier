# contiguity_checks

The `contiguity_checks` module provides a set of utilities for verifying the memory contiguity of `ggml_tensor` objects. Ensuring proper memory contiguity is crucial for optimizing performance in numerical computations, especially when dealing with operations that expect data to be laid out sequentially in memory. This module helps developers confirm that tensors meet these contiguity requirements, preventing potential issues and facilitating efficient data access.

## Architecture

The `contiguity_checks` module is logically divided into two sub-modules: `overall_allocation_checks` and `dimension_specific_checks`. These sub-modules encapsulate different aspects of contiguity verification, allowing for focused checks on either the complete memory allocation or specific dimensions of a tensor.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "overall_allocation_checks", "label": "Overall Allocation Checks", "type": "module", "link": "overall_allocation_checks.md"},
        {"id": "dimension_specific_checks", "label": "Dimension Specific Checks", "type": "module", "link": "dimension_specific_checks.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    overall_allocation_checks[Overall Allocation Checks]
    dimension_specific_checks[Dimension Specific Checks]

    click overall_allocation_checks "overall_allocation_checks.md" "View Overall Allocation Checks Module"
    click dimension_specific_checks "dimension_specific_checks.md" "View Dimension Specific Checks Module"
```

## Sub-modules

### [Overall Allocation Checks](overall_allocation_checks.md)
This sub-module contains functions to determine if the entire memory block allocated for a `ggml_tensor` is contiguous. This check is fundamental for understanding the global memory layout of a tensor.

### [Dimension Specific Checks](dimension_specific_checks.md)
This sub-module provides utilities for checking contiguity along specific dimensions or for rows of a `ggml_tensor`. These functions are useful for operations that require certain parts of the tensor, like individual rows or specific dimensions, to be contiguous in memory.
