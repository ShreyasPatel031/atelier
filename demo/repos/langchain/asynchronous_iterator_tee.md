# asynchronous_iterator_tee

## Introduction
The `asynchronous_iterator_tee` module provides the `Tee` class, a utility designed to split a single asynchronous iterable into multiple independent asynchronous iterators. This functionality is crucial for scenarios where an asynchronous data stream needs to be consumed by multiple downstream components concurrently or at different paces without duplicating the source data or re-fetching it.

Similar to `itertools.tee` for synchronous iterators, the `Tee` class ensures that all child iterators receive the same items in the same order. It handles buffering of items until all child iterators have processed them, making it suitable for both finite and infinite asynchronous streams, provided all consumers advance.

## Architecture and Core Functionality

The `Tee` class is the central component of this module. It manages the underlying asynchronous iterable, buffers the items, and creates `n` child iterators, each operating independently.

### `Tee` Class

The `Tee` class works by:
1.  **Initializing the Source Iterator**: It takes an `AsyncIterator` as input and prepares it for consumption.
2.  **Managing Buffers**: It maintains a list of `deque` (double-ended queue) buffers, one for each child iterator. When an item is fetched from the source iterable, it is placed into these buffers.
3.  **Creating Child Iterators**: It creates `n` instances of an internal `tee_peer` helper (not exposed directly), each linked to its own buffer and aware of the other peers' progress. This ensures items are only discarded from the buffer once the "least advanced" iterator has consumed them.
4.  **Concurrency Control**: Optionally, a `lock` (e.g., `asyncio.Lock`) can be provided during instantiation to synchronize access to the shared buffers, ensuring thread-safe operations in concurrent environments.

### Component Relationships

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "tee_class", "label": "Tee Class", "type": "component", "link": null},
        {"id": "internal_buffers", "label": "Internal Buffers (deques)", "type": "component", "link": null},
        {"id": "child_iterators", "label": "Child Iterators (tee_peer instances)", "type": "component", "link": null},
        {"id": "async_source_iterable", "label": "Async Source Iterable", "type": "component", "link": null},
        {"id": "lock_mechanism", "label": "Concurrency Lock (Optional)", "type": "component", "link": null},
        {"id": "iterator_utilities_module", "label": "iterator_utilities Module", "type": "external", "link": "iterator_utilities.md"},
        {"id": "synchronous_iterator_tee_module", "label": "synchronous_iterator_tee Module", "type": "external", "link": "synchronous_iterator_tee.md"}
    ],
    "edges": [
        {"source": "async_source_iterable", "target": "tee_class", "label": "Input"},
        {"source": "tee_class", "target": "internal_buffers", "label": "Manages"},
        {"source": "tee_class", "target": "child_iterators", "label": "Creates"},
        {"source": "tee_class", "target": "lock_mechanism", "label": "Uses"},
        {"source": "iterator_utilities_module", "target": "tee_class", "label": "Contains"},
        {"source": "synchronous_iterator_tee_module", "target": "tee_class", "label": "Synchronous Counterpart"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    async_source_iterable[Async Source Iterable]
    tee_class[Tee Class]
    internal_buffers[Internal Buffers (deques)]
    child_iterators[Child Iterators (tee_peer instances)]
    lock_mechanism[Concurrency Lock (Optional)]
    iterator_utilities_module[iterator_utilities Module]
    synchronous_iterator_tee_module[synchronous_iterator_tee Module]

    async_source_iterable --> tee_class -- "Input"
    tee_class --> internal_buffers -- "Manages"
    tee_class --> child_iterators -- "Creates"
    tee_class --> lock_mechanism -- "Uses"
    iterator_utilities_module --> tee_class -- "Contains"
    synchronous_iterator_tee_module --> tee_class -- "Synchronous Counterpart"
```

### Module Integration

The `asynchronous_iterator_tee` module is part of the `core_utils.iterator_utilities` package (see [iterator_utilities.md](iterator_utilities.md)). It complements the `synchronous_iterator_tee` module (see [synchronous_iterator_tee.md](synchronous_iterator_tee.md)) by providing an asynchronous equivalent for splitting iterables. This allows consistent patterns for handling both synchronous and asynchronous data streams within the broader system.

Its role is fundamental in any part of the system that deals with streaming asynchronous data that needs to be consumed by multiple logic branches or components without requiring the source to be re-read or re-computed. Examples include:
*   Real-time data processing pipelines where multiple analysis steps need to operate on the same incoming data.
*   Distributing streamed LLM responses to different UI elements or logging systems.
*   Advanced asynchronous agent frameworks where different components might need to inspect the same stream of agent thoughts or actions.

## `Tee` Class Details

```python
class Tee(Generic[T]):
    """Create `n` separate asynchronous iterators over `iterable`.

    This splits a single `iterable` into multiple iterators, each providing
    the same items in the same order.

    All child iterators may advance separately but share the same items from `iterable`
    -- when the most advanced iterator retrieves an item, it is buffered until the least
    advanced iterator has yielded it as well.

    A `tee` works lazily and can handle an infinite `iterable`, provided
    that all iterators advance.

    ```python
    async def derivative(sensor_data):
        previous, current = a.tee(sensor_data, n=2)
        await a.anext(previous)  # advance one iterator
        return a.map(operator.sub, previous, current)
    ```

    Unlike `itertools.tee`, `.tee` returns a custom type instead of a `tuple`. Like a
    tuple, it can be indexed, iterated and unpacked to get the child iterators. In
    addition, its `.tee.aclose` method immediately closes all children, and it can be
    used in an `async with` context for the same effect.

    If `iterable` is an iterator and read elsewhere, `tee` will *not* provide these
    items. Also, `tee` must internally buffer each item until the last iterator has
    yielded it; if the most and least advanced iterator differ by most data, using a
    `list` is more efficient (but not lazy).

    If the underlying iterable is concurrency safe (`anext` may be awaited concurrently)
    the resulting iterators are concurrency safe as well. Otherwise, the iterators are
    safe if there is only ever one single "most advanced" iterator.

    To enforce sequential use of `anext`, provide a `lock`

    - e.g. an `asyncio.Lock` instance in an `asyncio` application - and access is
        automatically synchronised.

    """

    def __init__(
        self,
        iterable: AsyncIterator[T],
        n: int = 2,
        *,
        lock: AbstractAsyncContextManager[Any] | None = None,
    ):
        """Create a `tee`.

        Args:
            iterable: The iterable to split.
            n: The number of iterators to create.
            lock: The lock to synchronise access to the shared buffers.

        """
        self._iterator = iterable.__aiter__()  # before 3.10 aiter() doesn't exist
        self._buffers: list[deque[T]] = [deque() for _ in range(n)]
        self._children = tuple(
            tee_peer(
                iterator=self._iterator,
                buffer=buffer,
                peers=self._buffers,
                lock=lock if lock is not None else NoLock(),
            )
            for buffer in self._buffers
        )

    def __len__(self) -> int:
        """Return the number of child iterators."""
        return len(self._children)

    @overload
    def __getitem__(self, item: int) -> AsyncIterator[T]: ...

    @overload
    def __getitem__(self, item: slice) -> tuple[AsyncIterator[T], ...]: ...

    def __getitem__(
        self, item: int | slice
    ) -> AsyncIterator[T] | tuple[AsyncIterator[T], ...]:
        """Return the child iterator(s) for the given index or slice."""
        return self._children[item]

    def __iter__(self) -> Iterator[AsyncIterator[T]]:
        """Iterate over the child iterators.

        Yields:
            The child iterators.
        """
        yield from self._children

    async def __aenter__(self) -> "Tee[T]":
        """Return the tee instance."""
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> bool:
        """Close all child iterators.

        Returns:
            `False`, exceptions not suppressed.
        """
        await self.aclose()
        return False

    async def aclose(self) -> None:
        """Async close all child iterators."""
        for child in self._children:
            await child.aclose()
```

### Methods and Properties

*   `__init__(self, iterable: AsyncIterator[T], n: int = 2, *, lock: AbstractAsyncContextManager[Any] | None = None)`:
    *   **iterable**: The asynchronous iterable to split.
    *   **n**: The number of independent child iterators to create (default is 2).
    *   **lock**: An optional asynchronous context manager (e.g., `asyncio.Lock`) to ensure sequential access to the shared buffers, making the `tee` concurrency-safe even if the underlying iterable is not.
*   `__len__(self) -> int`: Returns the number of child iterators created.
*   `__getitem__(self, item: int | slice) -> AsyncIterator[T] | tuple[AsyncIterator[T], ...]`: Allows accessing individual child iterators by index or multiple iterators via slicing.
*   `__iter__(self) -> Iterator[AsyncIterator[T]]`: Enables iteration over the child iterators, allowing unpacking (e.g., `a, b = Tee(my_async_iter)`).
*   `__aenter__(self) -> "Tee[T]"`: Enables usage of `Tee` in an `async with` statement.
*   `__aexit__(self, exc_type, exc_val, exc_tb) -> bool`: Automatically calls `aclose()` on exit from an `async with` block, ensuring all child iterators are properly closed. Returns `False` to not suppress exceptions.
*   `aclose(self) -> None`: Asynchronously closes all managed child iterators, releasing resources.

## Usage Example

```python
import asyncio
from collections import deque
from typing import AsyncIterator, Generic, TypeVar, Any
from types import TracebackType
from abc import ABC, abstractmethod

T = TypeVar("T")

# Assume tee_peer and NoLock are defined elsewhere in the module
# For documentation purposes, we show how Tee uses them.

class NoLock(ABC):
    async def __aenter__(self) -> None:
        pass

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> bool:
        return False

# Placeholder for tee_peer logic (actual implementation is internal)
class _TeePeer(AsyncIterator[T]):
    def __init__(self, iterator: AsyncIterator[T], buffer: deque[T], peers: list[deque[T]], lock: Any):
        self._iterator = iterator
        self._buffer = buffer
        self._peers = peers
        self._lock = lock
        self._closed = False

    async def __anext__(self) -> T:
        if self._closed:
            raise StopAsyncIteration
        if not self._buffer:
            async with self._lock:
                # If buffer is empty, try to fetch from source
                try:
                    item = await self._iterator.__anext__()
                    for peer_buffer in self._peers:
                        peer_buffer.append(item)
                except StopAsyncIteration:
                    self._closed = True
                    raise
        
        # Pop from own buffer
        if self._buffer:
            item = self._buffer.popleft()
            return item
        else: # Buffer is empty and source is exhausted
            raise StopAsyncIteration


    async def aclose(self) -> None:
        self._closed = True
        # Logic to clean up or signal to other peers if needed.
        # For simplicity, just mark as closed.


class Tee(Generic[T]):
    # ... (Tee class implementation as provided) ...
    def __init__(
        self,
        iterable: AsyncIterator[T],
        n: int = 2,
        *,
        lock: Any | None = None, # Simplified type for example
    ):
        self._iterator = iterable.__aiter__()
        self._buffers: list[deque[T]] = [deque() for _ in range(n)]
        self._children = tuple(
            _TeePeer( # Using _TeePeer for the example
                iterator=self._iterator,
                buffer=buffer,
                peers=self._buffers,
                lock=lock if lock is not None else NoLock(),
            )
            for buffer in self._buffers
        )


async def generate_numbers(count: int):
    for i in range(count):
        print(f"Generating: {i}")
        await asyncio.sleep(0.1)
        yield i

async def consumer(name: str, aiterator: AsyncIterator[int]):
    print(f"{name}: Starting consumption")
    try:
        async for item in aiterator:
            print(f"{name}: Consumed {item}")
            await asyncio.sleep(0.05) # Simulate different processing times
    except StopAsyncIteration:
        print(f"{name}: Finished consumption")
    finally:
        await aiterator.aclose()


async def main():
    source = generate_numbers(5)
    
    # Create two tee'd iterators
    async with Tee(source, n=2) as t:
        iter1, iter2 = t[0], t[1] # Or iter1, iter2 = t

        task1 = asyncio.create_task(consumer("Consumer 1", iter1))
        task2 = asyncio.create_task(consumer("Consumer 2", iter2))

        await asyncio.gather(task1, task2)

    print("All consumers finished.")

if __name__ == "__main__":
    asyncio.run(main())
```

This example demonstrates how `Tee` can be used to distribute a single stream of `generate_numbers` to two independent consumers. The `async with` statement ensures that all child iterators are properly closed upon completion. The differing `asyncio.sleep` times in the consumers highlight `Tee`'s buffering mechanism, where slower consumers do not block faster ones, but items are held until all have consumed them.
