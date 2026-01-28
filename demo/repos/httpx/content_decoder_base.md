# content_decoder_base Module Documentation

## Introduction

The `content_decoder_base` module defines the foundational interface for content decoding within the HTTPX library. It provides the abstract `ContentDecoder` class, which serves as a blueprint for all specific content decoding implementations.

## Module Purpose and Core Functionality

This module's primary purpose is to establish a standardized contract for decoders that process various content encodings (e.g., gzip, deflate, brotli). By defining the `ContentDecoder` base class, it ensures that all concrete decoder implementations adhere to a common API, promoting consistency and extensibility.

The `ContentDecoder` class includes two abstract methods:

*   `decode(self, data: bytes) -> bytes`: This method is responsible for processing a chunk of encoded `data` and returning the decoded bytes.
*   `flush(self) -> bytes`: This method is called to retrieve any remaining decoded bytes after all input data has been processed, ensuring that no buffered data is lost.

All concrete decoders within HTTPX's content encoding system are expected to inherit from `ContentDecoder` and implement these methods.

## Architecture and Component Relationships

The `content_decoder_base` module contains the `ContentDecoder` class, which acts as an abstract base class. It is a critical component in the `decoders` subsystem, specifically within the `content_encoding_decoders` module. Other concrete decoder implementations, such as `IdentityDecoder`, `DeflateDecoder`, `BrotliDecoder`, `ZStandardDecoder`, and `GZipDecoder`, inherit from this base class.

This design enforces a clear separation of concerns, allowing specific decoding logic to be developed independently while ensuring adherence to a common interface.

## System Integration

The `content_decoder_base` module is an integral part of HTTPX's content decoding pipeline. It provides the fundamental interface that enables the `content_encoding_decoders` module to manage and apply various decoding strategies based on the `Content-Encoding` header in HTTP responses. By offering a consistent interface, it simplifies the process of adding new content encodings or modifying existing ones without impacting the overall decoding framework.

Other modules that interact with content decoding will typically do so through instances of classes that inherit from `ContentDecoder`, ensuring interoperability across the system.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "content_decoder", "label": "ContentDecoder (Base Class)", "type": "component", "link": null},
        {"id": "content_encoding_decoders", "label": "Content Encoding Decoders Module", "type": "external", "link": "content_encoding_decoders.md"}
    ],
    "edges": [
        {"source": "content_encoding_decoders", "target": "content_decoder"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    content_decoder[ContentDecoder (Base Class)]
    content_encoding_decoders[Content Encoding Decoders Module]
    content_encoding_decoders --> content_decoder
```