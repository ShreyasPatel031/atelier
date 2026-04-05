# number_difference_rendering Module Documentation

## Introduction

The `number_difference_rendering` module is a sub-module within the `pydantic_evals_reporting` package, specifically responsible for rendering numerical differences in a human-readable format. It provides a utility function to compute and format the difference between two numbers, handling both absolute and relative changes with specific rules for display, especially for floating-point numbers.

## Architecture and Component Relationships

The `number_difference_rendering` module contains core logic for formatting numerical differences. It interacts with other internal helper functions for rendering signed numbers and relative changes.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "default_render_number_diff", "label": "default_render_number_diff", "type": "component", "link": null},
        {"id": "render_signed", "label": "_render_signed (Internal Helper)", "type": "component", "link": null},
        {"id": "render_relative", "label": "_render_relative (Internal Helper)", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "default_render_number_diff", "target": "render_signed"},
        {"source": "default_render_number_diff", "target": "render_relative"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    default_render_number_diff[default_render_number_diff]
    render_signed[_render_signed (Internal Helper)]
    render_relative[_render_relative (Internal Helper)]
    default_render_number_diff --> render_signed
    default_render_number_diff --> render_relative
```

## How the Module Fits into the Overall System

This module is a leaf component within the [pydantic_evals_reporting](pydantic_evals_reporting.md) module, specifically part of the `reporting_renderers` and `number_and_duration_rendering` sub-modules. It provides a specialized rendering utility that is likely used by evaluation reporting tools to present numerical differences in a clear and consistent manner. It helps in summarizing changes in metrics and other numerical data within the evaluation framework.

## Core Components

### `default_render_number_diff`

`pydantic_evals.pydantic_evals.reporting.render_numbers.default_render_number_diff`

This function calculates and returns a string representation of the difference between an `old` and a `new` numerical value. It applies specific formatting rules based on the type of numbers (integers or floats) and the magnitude of the change.

**Parameters:**

- `old` (`float | int`): The old numerical value.
- `new` (`float | int`): The new numerical value.

**Returns:**

- `str | None`: A string representing the difference, or `None` if the old and new values are equal.

**Key Functionality:**

-   **Equality Check**: Returns `None` if `old` and `new` are identical.
-   **Integer Difference**: For two integers, it returns the raw difference with a leading sign (e.g., `+1`, `-5`).
-   **Float Difference (or mixed types)**:
    -   Computes the raw `delta` and formats it using a predefined number of significant figures (`ABS_SIG_FIGS`).
    -   If `old` is non-zero, it calculates a relative change:
        -   If `|delta| / |old| <= 1`, it renders the relative change as a percentage with `PERC_DECIMALS` decimal places (e.g., `'+0.7 / +70.0%'`).
        -   If `|delta| / |old| > 1`, it renders a multiplier (`new / old`). The number of decimal places for the multiplier depends on its absolute value relative to `MULTIPLIER_ONE_DECIMAL_THRESHOLD`.
    -   Exceptions:
        -   If the percentage rounds to `0.0%`, only the absolute difference is returned.
        -   If `|old|` is below `BASE_THRESHOLD` and `|delta|` exceeds `MULTIPLIER_DROP_FACTOR` times `|old|`, the relative change indicator is omitted.
