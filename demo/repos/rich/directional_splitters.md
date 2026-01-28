# Directional Splitters Module

## Introduction

The `directional_splitters` module provides specialized splitter implementations, `RowSplitter` and `ColumnSplitter`, for the `rich_layout` module. These splitters enable precise control over how layout space is divided, either horizontally into rows or vertically into columns, facilitating complex UI arrangements within Rich applications.

## Architecture

The `directional_splitters` module is a sub-module of `rich_layout.layout_splitting.base_splitters` and builds upon the `Splitter` base class. It offers concrete implementations for dividing layout space directionally.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "layout_directional_splitters", "label": "Directional Layout Splitters", "type": "module", "link": "layout_directional_splitters.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    layout_directional_splitters[Directional Layout Splitters]
    click layout_directional_splitters "layout_directional_splitters.md" "View Directional Layout Splitters Module"
```

## Sub-modules

### [Directional Layout Splitters](layout_directional_splitters.md)

This sub-module contains the core implementations for directional splitting: `RowSplitter` and `ColumnSplitter`. These classes define how layout regions are divided along a specific axis.