# Console Info Structures Module

The `console_info_structures` module is a foundational component within the `rich` library's Windows console interaction layer. Its primary purpose is to define the essential data structures required for interfacing with the Windows Console API. These structures enable other parts of the system, particularly those related to `rich_win32_console` and `win32_api_structures`, to query and manipulate console properties such as cursor position, visibility, and screen buffer characteristics.

## Architecture Overview

This module sits within the `rich.win32_console.win32_api_structures` namespace, providing the raw data definitions that higher-level components utilize to abstract Windows console interactions. It acts as a direct bridge to the underlying Windows API, offering the necessary templates for system calls related to console information.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "windows_console_info", "label": "Windows Console Information", "type": "module", "link": "windows_console_info.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    windows_console_info[Windows Console Information]

    click windows_console_info "windows_console_info.md" "View Windows Console Information Module"
```

## Sub-modules

### Windows Console Information (`windows_console_info.md`)

This sub-module encapsulates the core data structures, `CONSOLE_CURSOR_INFO` and `CONSOLE_SCREEN_BUFFER_INFO`, which are fundamental for querying and setting various Windows console properties. It is a critical component for any low-level interaction with the Windows terminal environment, enabling precise control over how text and cursors are rendered. For more details, refer to the [Windows Console Information documentation](windows_console_info.md).