# basic_text_blocks Module Documentation

## Introduction

The `basic_text_blocks` module is a fundamental component within the `core_messages` package, specifically designed for the creation of basic text content blocks. It provides a straightforward function to encapsulate textual information into a standardized `TextContentBlock` format, which is essential for consistent message handling and representation across the system.

## Purpose and Core Functionality

This module's primary purpose is to offer a simple and reliable way to generate text content blocks. These blocks serve as the most granular form of text data within the larger messaging framework, allowing for structured storage and transmission of text along with optional metadata like IDs, annotations, and an index for streaming.

### `create_text_block` Function

This function is the sole core component of the `basic_text_blocks` module. It facilitates the creation of a `TextContentBlock` instance.

**Component:** `libs.core.langchain_core.messages.content.create_text_block`

```python
def create_text_block(
    text: str,
    *,
    id: str | None = None,
    annotations: list[Annotation] | None = None,
    index: int | str | None = None,
    **kwargs: Any,
) -> TextContentBlock:
    """Create a `TextContentBlock`.

    Args:
        text: The text content of the block.
        id: Content block identifier.

            Generated automatically if not provided.
        annotations: `Citation`s and other annotations for the text.
        index: Index of block in aggregate response.

            Used during streaming.

    Returns:
        A properly formatted `TextContentBlock`.

    !!! note

        The `id` is generated automatically if not provided, using a UUID4 format
        prefixed with 'lc_' to indicate it is a LangChain-generated ID.
    """
    block = TextContentBlock(
        type="text",
        text=text,
        id=ensure_id(id),
    )
    if annotations is not None:
        block["annotations"] = annotations
    if index is not None:
        block["index"] = index

    extras = {k: v for k, v in kwargs.items() if v is not None}
    if extras:
        block["extras"] = extras

    return block
```

This function takes the actual `text` content as a mandatory argument. Optional arguments include `id` for unique identification, `annotations` for attaching additional information (like citations), and `index` for ordering in streaming contexts. It automatically generates a UUID4-based ID if one is not provided.

## Architecture and Component Relationships

The `basic_text_blocks` module is a leaf module, focusing on a single, well-defined responsibility: creating text content blocks. It contributes to the broader content creation capabilities within the `core_messages` module.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "create_text_block", "label": "create_text_block()", "type": "component", "link": null},
        {"id": "text_content_block", "label": "TextContentBlock", "type": "component", "link": null},
        {"id": "ensure_id", "label": "ensure_id()", "type": "component", "link": null},
        {"id": "content_blocks", "label": "content_blocks Module", "type": "external", "link": "content_blocks.md"},
        {"id": "core_messages", "label": "core_messages Module", "type": "external", "link": "core_messages.md"}
    ],
    "edges": [
        {"source": "create_text_block", "target": "text_content_block"},
        {"source": "create_text_block", "target": "ensure_id"},
        {"source": "content_blocks", "target": "create_text_block"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    create_text_block[create_text_block()]
    text_content_block[TextContentBlock]
    ensure_id[ensure_id()]
    content_blocks[content_blocks Module]
    core_messages[core_messages Module]

    create_text_block --> text_content_block
    create_text_block --> ensure_id
    content_blocks --> create_text_block

    click content_blocks "content_blocks.md"
    click core_messages "core_messages.md"
```

## How the Module Fits into the Overall System

The `basic_text_blocks` module plays a crucial role in the [core_messages](core_messages.md) component by providing the foundational `TextContentBlock`. This block is utilized throughout the system wherever textual content needs to be represented in a structured, consistent manner. It is a specific implementation detail of the broader [content_blocks](content_blocks.md) module, which deals with various types of message content.

Its function ensures that raw text can be easily converted into a format compatible with LangChain's internal message structures, facilitating further processing, serialization, and interaction with language models and other components that expect structured message inputs. It works in conjunction with other content block creators (e.g., for images, videos) to compose rich, multi-modal messages.