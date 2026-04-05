# `cell_operations` Module Documentation

The `cell_operations` module provides fundamental functionalities for managing individual key-value (KV) cache cells within the `llama_cpp_kv_cache` system. It defines core operations for retaining specific sequences in a cell or explicitly removing a cell's contents, ensuring efficient memory and sequence management for the KV cache.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "seq_keep", "label": "seq_keep()", "type": "component", "link": null},
        {"id": "rm", "label": "rm()", "type": "component", "link": null},
        {"id": "kv_cache_cell_lifecycle", "label": "KV Cache Cell Lifecycle", "type": "external", "link": "kv_cache_cell_lifecycle.md"}
    ],
    "edges": [
        {"source": "seq_keep", "target": "kv_cache_cell_lifecycle"},
        {"source": "rm", "target": "kv_cache_cell_lifecycle"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    seq_keep[seq_keep()]
    rm[rm()]
    kv_cache_cell_lifecycle[KV Cache Cell Lifecycle]
    seq_keep --> kv_cache_cell_lifecycle
    rm --> kv_cache_cell_lifecycle
```

### Module Overview

The `cell_operations` module is a crucial leaf module nested under `llama_cpp_kv_cache` -> `kv_cache_cell_lifecycle` -> `cell_management`. Its primary role is to encapsulate low-level operations that directly manipulate the state and content of individual KV cache cells. These operations are vital for maintaining the integrity and correctness of the KV cache as sequences are added, removed, or updated during model inference.

### Core Functionality

This module exposes two core functions: `seq_keep` and `rm`, which are designed to manage the lifecycle and content of KV cache cells.

#### `seq_keep(uint32_t i, llama_seq_id seq_id)`

This function attempts to keep a specific sequence (`seq_id`) in the KV cache cell at index `i`. Its behavior is conditional:

*   **If `seq_id` is already present in cell `i`**: The function first removes the existing sequence position mapping for cell `i`, resets the sequence information associated with the cell, then re-establishes the mapping for `seq_id` at the cell's current position, and increments the sequence position. This implies an update or re-assertion of the sequence's presence. It returns `false`.
*   **If any other sequence is present in cell `i` (but not `seq_id`)**: The function completely clears the cell. It removes all sequence position mappings for cell `i`, resets the sequence, sets the cell's position to `-1` (marking it as unused), resets any external metadata (`ext`), clears any shift value, and removes the cell from the `used` set. This effectively "frees" the cell for new use. It returns `true`.
*   **If cell `i` is already unused (`pos[i] == -1`)**: The function does nothing and returns `false`, indicating no change was made.

The `seq_keep` function relies on external helper functions like `seq_pos_rm` and `seq_pos_inc`, which are managed by the higher-level [kv_cache_cell_lifecycle](kv_cache_cell_lifecycle.md) module to maintain global sequence position mappings.

#### `rm(uint32_t i)`

This function provides a direct and unconditional mechanism to remove the contents of a KV cache cell at index `i`. It performs the following actions:

*   It asserts that the cell `i` is currently in use (`pos[i] != -1`) before proceeding.
*   It removes any existing sequence position mappings associated with cell `i` using `seq_pos_rm` (an external dependency from [kv_cache_cell_lifecycle](kv_cache_cell_lifecycle.md)).
*   It resets the sequence information, sets the cell's position to `-1`, clears external metadata (`ext`), resets the shift value, and removes the cell from the `used` set.

This function ensures that a cell is thoroughly cleared and marked as available for future allocations.

### Architecture and Component Relationships

The `cell_operations` module is a low-level utility responsible for the granular control of individual KV cache cells. It interacts directly with the internal data structures that define the state of these cells (e.g., `pos`, `seq`, `ext`, `shift`, `used`).

It depends on functions provided by its parent module, [kv_cache_cell_lifecycle](kv_cache_cell_lifecycle.md), specifically `seq_pos_rm` and `seq_pos_inc`. These functions handle the broader management of sequence positions across the entire KV cache, making `cell_operations` focused solely on the per-cell manipulation.

### Integration with Overall System

The `cell_operations` module is an integral part of the `llama_cpp_kv_cache` component. It provides the essential atomic operations that `kv_cache_cell_lifecycle` and `cell_management` use to implement more complex strategies for KV cache optimization, such as context shifting, sequence re-ordering, and efficient memory reuse. Without these fundamental cell operations, the dynamic and efficient management of the KV cache would not be possible. Its position deep within the `llama_cpp_kv_cache` hierarchy underscores its foundational role in the KV cache's operational integrity.