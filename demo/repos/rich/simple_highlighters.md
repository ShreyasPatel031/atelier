# `simple_highlighters`

The `simple_highlighters` module provides fundamental and commonly used highlighter implementations within the Rich library. It includes highlighters for Python object representations and a "null" highlighter that performs no highlighting.

## Core Components

### `ReprHighlighter`

`ReprHighlighter` is a specialized highlighter designed to apply syntax highlighting to the string representation of Python objects. It enhances readability when displaying debugging information or object structures by highlighting different parts of the representation (e.g., strings, numbers, booleans, `None`).

### `NullHighlighter`

`NullHighlighter` is a passive highlighter that, as its name suggests, performs no actual highlighting. It serves as a default or placeholder when no specific highlighting is required, ensuring that the Rich rendering pipeline can always expect a highlighter object without performing unnecessary operations.

## Architecture and Relationships

This module's highlighters are concrete implementations inheriting from the base `Highlighter` class, defined in the [`rich_highlighter` module](rich_highlighter.md). They integrate seamlessly into Rich's console rendering process, allowing various parts of the library (e.g., `rich_console`, `rich_pretty`) to apply basic formatting.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "repr_highlighter", "label": "ReprHighlighter", "type": "component", "link": null},
        {"id": "null_highlighter", "label": "NullHighlighter", "type": "component", "link": null},
        {"id": "highlighter_base", "label": "Highlighter (Base)", "type": "external", "link": "rich_highlighter.md"}
    ],
    "edges": [
        {"source": "repr_highlighter", "target": "highlighter_base"},
        {"source": "null_highlighter", "target": "highlighter_base"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    repr_highlighter[ReprHighlighter]
    null_highlighter[NullHighlighter]
    highlighter_base[Highlighter (Base)]

    repr_highlighter --> highlighter_base
    null_highlighter --> highlighter_base
```