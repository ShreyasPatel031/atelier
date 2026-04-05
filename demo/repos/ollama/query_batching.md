# query_batching Module Documentation

## Introduction
The `query_batching` module provides a React hook, `useQueryBatcher`, designed to optimize `react-query` updates by batching multiple state changes into a single update. This can improve performance and reduce unnecessary re-renders in applications that frequently update the same query data.

## Purpose and Core Functionality
The primary purpose of `useQueryBatcher` is to coalesce multiple calls to update a `react-query` cache entry within a short interval into a single, batched update. This is particularly useful for scenarios where many rapid updates to a single piece of state might otherwise trigger excessive re-renders or API calls.

The core functionality includes:
-   **Batching Updates**: Collects multiple `scheduleBatch` calls and applies them as a single `setQueryData` call to `react-query` after a configurable `batchInterval`.
-   **Immediate First Update**: Optionally applies the very first update in a batch immediately, without waiting for the interval, for quicker initial UI responsiveness.
-   **Flush Mechanism**: Provides a `flushBatch` function to force an immediate application of any pending batched updates.
-   **Cleanup**: Offers a `cleanup` function to clear any pending batches and reset the batcher's internal state.

## Architecture and Component Relationships

The `query_batching` module contains the `useQueryBatcher` hook, which internally manages a batch of updates using React's `useRef` and `useCallback` hooks. It interacts directly with `react-query`'s `QueryClient` to manage cached data.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "use_query_batcher", "label": "useQueryBatcher Hook", "type": "component", "link": null},
        {"id": "batch_ref", "label": "Batch State (useRef)", "type": "component", "link": null},
        {"id": "schedule_batch", "label": "scheduleBatch Function", "type": "component", "link": null},
        {"id": "flush_batch", "label": "flushBatch Function", "type": "component", "link": null},
        {"id": "cleanup_func", "label": "cleanup Function", "type": "component", "link": null},
        {"id": "react_query", "label": "react-query Library", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "use_query_batcher", "target": "batch_ref"},
        {"source": "use_query_batcher", "target": "schedule_batch"},
        {"source": "use_query_batcher", "target": "flush_batch"},
        {"source": "use_query_batcher", "target": "cleanup_func"},
        {"source": "use_query_batcher", "target": "react_query"},
        {"source": "schedule_batch", "target": "batch_ref"},
        {"source": "schedule_batch", "target": "flush_batch"},
        {"source": "schedule_batch", "target": "react_query"},
        {"source": "flush_batch", "target": "batch_ref"},
        {"source": "flush_batch", "target": "react_query"},
        {"source": "cleanup_func", "target": "batch_ref"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    use_query_batcher[useQueryBatcher Hook]
    batch_ref[Batch State (useRef)]
    schedule_batch[scheduleBatch Function]
    flush_batch[flushBatch Function]
    cleanup_func[cleanup Function]
    react_query[react-query Library]

    use_query_batcher --> batch_ref
    use_query_batcher --> schedule_batch
    use_query_batcher --> flush_batch
    use_query_batcher --> cleanup_func
    use_query_batcher --> react_query

    schedule_batch --> batch_ref
    schedule_batch --> flush_batch
    schedule_batch --> react_query

    flush_batch --> batch_ref
    flush_batch --> react_query

    cleanup_func --> batch_ref
```

### Component Breakdown

#### `useQueryBatcher` Hook
This is the main entry point of the module. It initializes the batching logic and exposes functions to interact with it.
-   **Dependencies**: `useQueryClient` from `react-query`, `useRef`, `useCallback` from React.
-   **Parameters**:
    -   `queryKey`: A `react-query` key for the data being batched.
    -   `config`: An object with `batchInterval` (time in ms to wait before flushing) and `immediateFirst` (boolean to immediately apply the first update).
-   **Returns**: An object containing `scheduleBatch`, `flushBatch`, and `cleanup` functions.

#### Internal State (`batchRef`)
A `useRef` object that holds the mutable state of the batcher without causing re-renders when updated.
-   `updateBatch`: Stores the latest batched update.
-   `batchTimeout`: Holds the `setTimeout` ID for the scheduled flush.
-   `isFirstUpdate`: A boolean flag to track if it's the very first update in a sequence, used with `immediateFirst` configuration.

#### `flushBatch` Function
A memoized callback that applies the currently batched update to the `react-query` cache.
-   **Behavior**:
    -   If `updateBatch` exists, it calls `queryClient.setQueryData(queryKey, updateBatch)`.
    -   Clears any active `batchTimeout`.
    -   Resets `updateBatch` and `batchTimeout`.

#### `scheduleBatch` Function
A memoized callback that adds a new update to the batch or flushes it immediately based on configuration.
-   **Behavior**:
    -   Retrieves the current data from `react-query` and the existing `updateBatch` to compute the `newBatch` using the provided `updater` function.
    -   Updates `batchRef.current.updateBatch` with the `newBatch`.
    -   If `immediateFirst` is true and it's the `isFirstUpdate`, it applies the update immediately, sets `isFirstUpdate` to `false`, and clears `updateBatch`.
    -   Otherwise, it clears any existing `batchTimeout` and schedules a new one to call `flushBatch` after `batchInterval`.

#### `cleanup` Function
A memoized callback to reset the batcher's state.
-   **Behavior**:
    -   Clears any active `batchTimeout`.
    -   Resets `updateBatch` to `undefined`.
    -   Resets `isFirstUpdate` to `true`.

## How the Module Fits into the Overall System
The `query_batching` module is part of the `app_ui_hooks` family, specifically nested under `ui_utility_hooks`. It provides a crucial utility for managing and optimizing state updates within the application's user interface. By batching `react-query` updates, it helps to ensure that UI components remain responsive and that the application efficiently interacts with its data layer, especially in scenarios involving high-frequency data changes.

This module contributes to the overall performance and responsiveness of the application by reducing the number of direct interactions with the `react-query` cache and, consequently, the number of component re-renders. It encapsulates a common optimization pattern, making it reusable across various parts of the UI that rely on `react-query` for state management.
