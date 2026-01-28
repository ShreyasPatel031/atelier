# `syntax_core` Module Documentation

## Introduction
The `syntax_core` module is a fundamental part of the `rich_syntax` package, responsible for applying syntax highlighting to source code and managing specific highlight ranges. It provides the core mechanisms for rendering code with rich styling based on syntax rules.

## Core Functionality

### `rich_syntax.Syntax`
The `Syntax` class is the primary component for syntax highlighting. It takes source code, a lexer (e.g., Python lexer), and a theme to render code with appropriate colors and styles. It handles the parsing of code, tokenization, and generation of styled text segments that Rich can display in the terminal or other outputs.

### `rich_syntax._SyntaxHighlightRange`
This internal component is used to define and manage specific ranges within the syntax-highlighted code that require special attention or additional styling. It allows for precise control over how parts of the code are presented, such as highlighting specific lines or sections for emphasis or error reporting.

## Architecture Overview
The `syntax_core` module fits within the broader `rich_syntax` module, which orchestrates all aspects of syntax highlighting. `syntax_core` handles the actual application of highlighting and range management, while other related modules manage padding, and theme definitions.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "rich_syntax", "label": "rich_syntax (Parent Module)", "type": "external"},
        {"id": "padding_utilities", "label": "Padding Utilities", "type": "module", "link": "padding_utilities.md"},
        {"id": "syntax_core", "label": "Syntax Core", "type": "module", "link": "syntax_core.md"},
        {"id": "theme_definitions", "label": "Theme Definitions", "type": "module", "link": "theme_definitions.md"}
    ],
    "edges": [
        {"source": "rich_syntax", "target": "padding_utilities"},
        {"source": "rich_syntax", "target": "syntax_core"},
        {"source": "rich_syntax", "target": "theme_definitions"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    rich_syntax[rich_syntax (Parent Module)]
    padding_utilities[Padding Utilities]
    syntax_core[Syntax Core]
    theme_definitions[Theme Definitions]
    
    rich_syntax --> padding_utilities
    rich_syntax --> syntax_core
    rich_syntax --> theme_definitions
    
    click padding_utilities "padding_utilities.md" "View Padding Utilities Module"
    click syntax_core "syntax_core.md" "View Syntax Core Module"
    click theme_definitions "theme_definitions.md" "View Theme Definitions Module"
```
