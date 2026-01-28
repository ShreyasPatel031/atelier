# Module: `synchronous_streams`

The `synchronous_streams` module, a sub-module of `content`, provides core functionality for handling synchronous byte streams within the HTTPX library. Its primary component, `IteratorByteStream`, enables efficient iteration over various forms of byte data, ensuring consistent processing of request and response bodies in a synchronous context.

## Purpose and Core Functionality

This module is dedicated to the robust management of data streams that are processed synchronously. It abstracts away the underlying source of bytes, allowing the rest of the HTTPX system to interact with a unified `SyncByteStream` interface.

### `IteratorByteStream`

The `httpx._content.IteratorByteStream` class is the central component of this module. It is designed to consume and yield chunks of bytes from an iterable source.

**Key Features:**
*   **Synchronous Iteration**: Implements the `SyncByteStream` interface, allowing it to be used wherever synchronous byte streams are expected.
*   **Flexible Input**: Can handle both generic `Iterable[bytes]` (e.g., lists of bytes, generators) and file-like objects that expose a `read()` method.
*   **Chunking**: Reads data in `CHUNK_SIZE` (65,536 bytes) increments when dealing with file-like objects, optimizing memory usage and performance for large streams.
*   **Stream Consumption Tracking**: Tracks whether the stream has been consumed, preventing accidental re-iteration of single-pass generators by raising a `StreamConsumed` exception (if the stream is a generator and already consumed).

**Usage Example (Conceptual):**

```python
from typing import Iterable, Iterator

class StreamConsumed(Exception):
    pass

class SyncByteStream:
    def __iter__(self) -> Iterator[bytes]:
        raise NotImplementedError()

class IteratorByteStream(SyncByteStream):
    CHUNK_SIZE = 65_536

    def __init__(self, stream: Iterable[bytes]) -> None:
        self._stream = stream
        self._is_stream_consumed = False
        self._is_generator = False # Placeholder, actual inspect.isgenerator(stream)

    def __iter__(self) -> Iterator[bytes]:
        if self._is_stream_consumed and self._is_generator:
            raise StreamConsumed()

        self._is_stream_consumed = True
        if hasattr(self._stream, "read"):
            chunk = self._stream.read(self.CHUNK_SIZE)
            while chunk:
                yield chunk
                chunk = self._stream.read(self.CHUNK_SIZE)
        else:
            for part in self._stream:
                yield part

# Example with a list of bytes
my_data = [b"hello", b" ", b"world"]
byte_stream = IteratorByteStream(my_data)
for chunk in byte_stream:
    print(chunk)

# Example with a file-like object (conceptual)
# with open("my_file.txt", "rb") as f:
#     file_stream = IteratorByteStream(f)
#     for chunk in file_stream:
#         print(chunk)
```

## Architecture and Component Relationships

The `synchronous_streams` module primarily exposes the `IteratorByteStream` component, which integrates with the broader HTTPX ecosystem by adhering to the `SyncByteStream` interface. It forms a crucial part of the [content](content.md) module's overall stream handling capabilities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "iterator_byte_stream", "label": "IteratorByteStream", "type": "component", "link": null},
        {"id": "sync_byte_stream", "label": "SyncByteStream (from types)", "type": "external", "link": "types.md"}
    ],
    "edges": [
        {"source": "iterator_byte_stream", "target": "sync_byte_stream", "label": "implements"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    iterator_byte_stream[IteratorByteStream]
    sync_byte_stream(SyncByteStream (from types))
    iterator_byte_stream -- implements --> sync_byte_stream
```

## How the Module Fits into the Overall System

The `synchronous_streams` module is an integral part of HTTPX's content handling layer, specifically for synchronous operations. It provides the mechanism for HTTPX clients to send request bodies and receive response bodies as manageable, iterable streams of bytes without loading the entire content into memory at once.

It is utilized by modules such as `client` (e.g., `httpx._client.Client`) and `transports` (e.g., `httpx._transports.default.HTTPTransport`) when dealing with synchronous HTTP communication, ensuring efficient and scalable data transfer. Its reliance on the `SyncByteStream` interface from the [types](types.md) module ensures type safety and consistency across the library's synchronous stream implementations.
