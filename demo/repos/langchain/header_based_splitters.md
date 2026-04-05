# Header Based Splitters

The `header_based_splitters` module provides specialized tools for parsing and segmenting HTML content based on its inherent header structure. It offers two distinct approaches: `HTMLHeaderTextSplitter` for creating hierarchical `Document` objects from header-defined sections and `HTMLSectionSplitter` for splitting HTML into sections using specified tags and font sizes, often leveraging XSLT transformations.

## Architecture Overview

This module is composed of two primary components, each designed to address different aspects of HTML content splitting:

- **HTML Header Text Splitter**: Focuses on semantic splitting based on header tags (h1, h2, etc.), preserving the document's hierarchical structure in the metadata of the generated `Document` objects.
- **HTML Section Splitter**: Provides a more flexible approach to splitting, allowing for custom tag-based sectioning and leveraging XSLT for transformations, which can be useful for complex or less structured HTML.

Both splitters are crucial for converting raw HTML into manageable, semantically rich `Document` objects, facilitating further processing in information retrieval and language model applications.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "html_header_text_splitter", "label": "HTML Header Text Splitter", "type": "module", "link": "html_header_text_splitter.md"},
        {"id": "html_section_splitter", "label": "HTML Section Splitter", "type": "module", "link": "html_section_splitter.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    html_header_text_splitter[HTML Header Text Splitter]
    html_section_splitter[HTML Section Splitter]

    click html_header_text_splitter "html_header_text_splitter.md" "View HTML Header Text Splitter Documentation"
    click html_section_splitter "html_section_splitter.md" "View HTML Section Splitter Documentation"
```
