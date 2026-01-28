# text_chunking

## Introduction

The `text_chunking` module provides functionality for processing text content into fixed-size chunks. Its primary component, `TextChunker`, is designed to handle streaming text data, buffering it, and yielding segments as they reach a specified size.

## Core Functionality

The `TextChunker` class is responsible for:

*   **Buffering Text:** Accumulating incoming text content in an internal buffer.
*   **Chunking:** Extracting and returning text segments of a predefined `chunk_size`.
*   **Flushing Remaining Content:** Providing any buffered text that doesn't form a full chunk when the stream ends.

## Architecture and Component Relationships

The `text_chunking` module is a leaf module within the `httpx._decoders.text_stream_processors` hierarchy. It contains a single core component, `TextChunker`, which encapsulates the logic for text segmentation.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "TextChunker_class", "label": "TextChunker Class", "type": "component", "link": null},
        {"id": "init_method", "label": "__init__(chunk_size)", "type": "component", "link": null},
        {"id": "decode_method", "label": "decode(content)", "type": "component", "link": null},
        {"id": "flush_method", "label": "flush()", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "TextChunker_class", "target": "init_method"},
        {"source": "TextChunker_class", "target": "decode_method"},
        {"source": "TextChunker_class", "target": "flush_method"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    TextChunker_class[TextChunker Class]
    init_method[__init__(chunk_size)]
    decode_method[decode(content)]
    flush_method[flush()]

    TextChunker_class --> init_method
    TextChunker_class --> decode_method
    TextChunker_class --> flush_method
```

### `TextChunker` Class

This class provides methods to decode a continuous stream of text into manageable chunks. It internally uses `io.StringIO` to buffer the incoming text.

*   `__init__(self, chunk_size: int | None = None)`:
    *   Initializes the `TextChunker` with an optional `chunk_size`. If `chunk_size` is `None`, the `decode` method will return the entire content as a single chunk.
    *   Sets up an internal `io.StringIO` buffer.

*   `decode(self, content: str) -> list[str]`:
    *   Appends the provided `content` to the internal buffer.
    *   If `chunk_size` is defined and the buffered content size meets or exceeds it, it extracts full chunks.
    *   Any remaining content that doesn't form a full chunk is retained in the buffer for future calls.
    *   Returns a list of extracted text chunks.

*   `flush(self) -> list[str]`:
    *   Empties the internal buffer and returns any remaining content as a single chunk.
    *   This method is typically called at the end of a text stream to ensure all data is processed.

## How it Fits into the Overall System

The `text_chunking` module, specifically the `TextChunker`, plays a crucial role in the `httpx` library's ability to handle and process streamed text responses. It is a part of the [text_stream_processors](text_stream_processors.md) group within the broader [decoders](decoders.md) module.

When `httpx` receives a response body as a byte stream that needs to be interpreted as text (e.g., with a `Content-Type: text/plain` or `application/json` header), the `TextChunker` can be employed to incrementally process this text. This allows applications to deal with large text responses without having to load the entire content into memory at once, facilitating efficient and responsive stream processing. It works in conjunction with other decoders like [text_line_decoding](text_line_decoding.md) and [byte_to_text_decoding](byte_to_text_decoding.md) to provide a comprehensive text decoding pipeline.