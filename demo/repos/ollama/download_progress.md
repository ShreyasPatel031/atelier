# Module: `download_progress`

## Introduction

The `download_progress` module is responsible for displaying the progress of ongoing downloads within the application's user interface. It provides a visual indicator and textual representation of the download status, including the completed amount, total size, and percentage.

## Core Functionality

The primary component of this module is `Downloading`, which is a React functional component. It receives the current `completed` bytes and `total` bytes as properties and renders a progress bar along with formatted download statistics.

### `Downloading` Component

-   **Purpose**: Renders the download progress UI.
-   **Props**:
    -   `completed`: A number representing the bytes downloaded so far.
    -   `total`: A number representing the total size of the file being downloaded.
-   **Calculations**:
    -   Calculates the download `percentage` based on `completed` and `total`.
    -   Determines the appropriate unit (e.g., KB, MB, GB) for displaying file sizes using `K` and `SIZES` constants.
-   **UI Elements**:
    -   An SVG icon depicting a download.
    -   Text indicating "Downloading model".
    -   Formatted display of completed and total bytes, along with the percentage (e.g., "1.2 MB / 10.5 MB (11%)").
    -   A horizontal progress bar that visually represents the `percentage` of the download completed.

## Architecture and Component Relationships

The `download_progress` module is a UI component designed to be integrated into other parts of the application's user interface where download status needs to be shown. It relies on external utility functions for byte formatting and constants for size calculations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "downloading_component", "label": "Downloading Component", "type": "component", "link": null},
        {"id": "format_bytes_util", "label": "formatBytes (Utility)", "type": "external", "link": null},
        {"id": "k_constant", "label": "K (Constant)", "type": "external", "link": null},
        {"id": "sizes_array", "label": "SIZES (Array)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "downloading_component", "target": "format_bytes_util"},
        {"source": "downloading_component", "target": "k_constant"},
        {"source": "downloading_component", "target": "sizes_array"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    downloading_component[Downloading Component]
    format_bytes_util[formatBytes (Utility)]
    k_constant[K (Constant)]
    sizes_array[SIZES (Array)]
    downloading_component --> format_bytes_util
    downloading_component --> k_constant
    downloading_component --> sizes_array
```

## Integration with the Overall System

The `download_progress` module is part of the `app_ui_components.utility_ui_components.display_elements` family of modules. It serves as a specialized display element for showing download status. It is expected to be used by higher-level UI components that initiate and monitor file downloads, providing them with a standardized and visually consistent way to present progress to the user.

Given its placement within the `app_ui_components` hierarchy, it contributes to the overall user experience by offering clear feedback during potentially long-running download operations, improving the perceived responsiveness of the application.