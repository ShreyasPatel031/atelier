# Typer Rich Utils Module

## Introduction
The `typer_rich_utils` module provides utility classes for integrating [rich](https://rich.readthedocs.io/en/stable/) capabilities, specifically for enhancing the display of command-line interface (CLI) elements within applications built with Typer. It focuses on improving the visual presentation of metavars, options, and negative options through custom highlighting, making CLI help messages and outputs more readable and user-friendly.

## Architecture Overview
The `typer_rich_utils` module is a focused component that extends Typer's capabilities by leveraging the `rich` library for advanced text styling and highlighting. It primarily consists of highlighter classes designed to be used with Typer's internal rendering mechanisms.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "highlighters", "label": "Rich Highlighters", "type": "module", "link": "highlighters.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    highlighters[Rich Highlighters]

    click highlighters "highlighters.md" "View Rich Highlighters Module"
```

## Sub-modules

### Rich Highlighters (`highlighters.md`)
This sub-module contains classes like `MetavarHighlighter`, `OptionHighlighter`, and `NegativeOptionHighlighter` which are responsible for applying `rich` styling to different parts of Typer CLI output. These highlighters parse and format text to enhance readability, particularly in `--help` messages, by differentiating various CLI components visually. For more details, refer to the [Rich Highlighters documentation](highlighters.md).
