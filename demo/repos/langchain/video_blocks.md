The `video_blocks` module is a specialized component within the `core_messages` package, specifically designed for the creation of structured video content blocks. It provides a dedicated function to encapsulate video data, including URLs, base64 encoded strings, or file IDs, along with their respective MIME types. This module ensures proper formatting and validation for video content, making it easier to integrate video assets into various messaging or content generation workflows within the system.

### Architecture and Component Relationships

The `video_blocks` module is a leaf module, meaning it does not contain any sub-modules. Its core functionality revolves around the `create_video_block` function, which is responsible for constructing `VideoContentBlock` objects. This function utilizes an internal ID generation utility to assign unique identifiers to each block, enhancing traceability and management of content.

The `video_blocks` module is a part of the [media_content_blocks](media_content_blocks.md) module, which in turn is a sub-module of [content_blocks](content_blocks.md), and ultimately resides within the [core_messages](core_messages.md) package. This hierarchical structure ensures that all content block creation utilities are organized and accessible within a coherent messaging framework.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "create_video_block", "label": "create_video_block", "type": "component", "link": null},
        {"id": "id_utility", "label": "ID Generation Utility (ensure_id)", "type": "component", "link": null},
        {"id": "media_content_blocks", "label": "media_content_blocks", "type": "external", "link": "media_content_blocks.md"}
    ],
    "edges": [
        {"source": "create_video_block", "target": "id_utility"},
        {"source": "create_video_block", "target": "media_content_blocks"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    create_video_block[create_video_block]
    id_utility[ID Generation Utility (ensure_id)]
    media_content_blocks[media_content_blocks]

    create_video_block --> id_utility
    create_video_block --> media_content_blocks
```

### Core Functionality

The primary function of this module is:

#### `create_video_block`

This function is used to instantiate a `VideoContentBlock`. It accepts parameters such as `url`, `base64`, `file_id`, and `mime_type` to define the video source. It ensures that at least one video source is provided and that `mime_type` is specified when `base64` data is used. An optional `id` can be provided; otherwise, a unique ID is automatically generated using a UUID4 format. The function also supports an `index` parameter for streaming contexts.

```python
def create_video_block(
    *,
    url: str | None = None,
    base64: str | None = None,
    file_id: str | None = None,
    mime_type: str | None = None,
    id: str | None = None,
    index: int | str | None = None,
    **kwargs: Any,
) -> VideoContentBlock:
    """Create a `VideoContentBlock`.

    Args:
        url: URL of the video.
        base64: Base64-encoded video data.
        file_id: ID of the video file from a file storage system.
        mime_type: MIME type of the video.

            Required for base64 data.
        id: Content block identifier.

            Generated automatically if not provided.
        index: Index of block in aggregate response.

            Used during streaming.

    Returns:
        A properly formatted `VideoContentBlock`.

    Raises:
        ValueError: If no video source is provided or if `base64` is used without
            `mime_type`.

    !!! note

        The `id` is generated automatically if not provided, using a UUID4 format
        prefixed with `'lc_'` to indicate it is a LangChain-generated ID.
    """
    if not any([url, base64, file_id]):
        msg = "Must provide one of: url, base64, or file_id"
        raise ValueError(msg)

    if base64 and not mime_type:
        msg = "mime_type is required when using base64 data"
        raise ValueError(msg)

    block = VideoContentBlock(type="video", id=ensure_id(id))

    if url is not None:
        block["url"] = url
    if base64 is not None:
        block["base64"] = base64
    if file_id is not None:
        block["file_id"] = file_id
    if mime_type is not None:
        block["mime_type"] = mime_type
    if index is not None:
        block["index"] = index

    extras = {k: v for k, v in kwargs.items() if v is not None}
    if extras:
        block["extras"] = extras

    return block
```