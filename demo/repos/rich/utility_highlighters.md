# Utility Highlighters Module Documentation

The `utility_highlighters` module provides essential, straightforward highlighter implementations designed for common text formatting and representation tasks within the Rich library ecosystem. It includes a highlighter for object representations and a null highlighter for cases where no highlighting is required.

## Architecture Overview

The `utility_highlighters` module is a part of the broader `rich_highlighter` module, specifically within the `base_highlighters` sub-category. It encapsulates basic highlighting utilities, forming a foundational layer for more specialized highlighters.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "simple_highlighters", "label": "Simple Highlighters", "type": "module", "link": "simple_highlighters.md"}
    ],
    "edges": [],
    "groups": []
}
-->
```mermaid
graph TD
    simple_highlighters[Simple Highlighters]

    click simple_highlighters "simple_highlighters.md" "View Simple Highlighters Documentation"
```

## Sub-modules

### Simple Highlighters (`simple_highlighters.md`)

This sub-module contains core highlighter classes, `ReprHighlighter` and `NullHighlighter`.

- **`ReprHighlighter`**: Automatically highlights the output of `repr()` for Python objects, applying Rich styles to make object representations more readable.
- **`NullHighlighter`**: A placeholder highlighter that performs no highlighting, useful when a highlighter is expected but no styling is desired.

For more detailed information, refer to the [Simple Highlighters documentation](simple_highlighters.md).