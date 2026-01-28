# abstract_highlighter Module Documentation

The `abstract_highlighter` module defines the foundational `Highlighter` class, serving as the abstract base for all highlighting functionalities within the Rich library. It establishes the essential interface and core logic that concrete highlighter implementations, such as those for representing Python objects (`ReprHighlighter`), handling JSON, or parsing ISO8601 timestamps, must adhere to.

## Core Functionality

The primary role of the `Highlighter` class is to provide a standardized mechanism for applying styles to text based on specific patterns or rules. It ensures consistency across different highlighting strategies, allowing for modular and extensible text styling.

### `Highlighter`

The `Highlighter` class acts as an abstract base class (ABC) from which all other highlighters in Rich are derived. It typically defines a `highlight` method that takes a `rich.text.Text` object and modifies its styles in place.

## Architecture and Relationships

The `abstract_highlighter` module, specifically the `Highlighter` class, sits at the root of the Rich highlighting system. It provides the blueprint for more specialized highlighters found in modules like `utility_highlighters` and `specialized_highlighters`. It depends on fundamental Rich components such as `rich_text` for text manipulation and `rich_style` for applying formatting.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "highlighter_abstract", "label": "Highlighter (Abstract Base)", "type": "component", "link": null},
        {"id": "utility_highlighters", "label": "Utility Highlighters", "type": "external", "link": "utility_highlighters.md"},
        {"id": "rich_text", "label": "Text Module", "type": "external", "link": "rich_text.md"},
        {"id": "rich_style", "label": "Style Module", "type": "external", "link": "rich_style.md"}
    ],
    "edges": [
        {"source": "utility_highlighters", "target": "highlighter_abstract"},
        {"source": "highlighter_abstract", "target": "rich_text"},
        {"source": "highlighter_abstract", "target": "rich_style"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    highlighter_abstract[Highlighter (Abstract Base)]
    utility_highlighters[Utility Highlighters]
    rich_text[Text Module]
    rich_style[Style Module]

    utility_highlighters --> highlighter_abstract
    highlighter_abstract --> rich_text
    highlighter_abstract --> rich_style
```
