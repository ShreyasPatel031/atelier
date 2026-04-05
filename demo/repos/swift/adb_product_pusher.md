# `adb_product_pusher` Module Documentation

## Introduction

The `adb_product_pusher` module is a specialized utility within the `android_utilities` ecosystem, specifically designed for deploying built products, such as shared libraries (`.so` files) and NDK-related components, to an Android device using Android Debug Bridge (ADB). It simplifies the process of transferring necessary files for testing and development of Android applications and libraries.

## Purpose and Core Functionality

The primary purpose of this module is to automate the pushing of compiled artifacts from a host machine to a specified destination on an Android device. This is crucial for rapid iteration during Android development, allowing developers to quickly deploy and test new builds without manual intervention.

Its core functionality includes:

*   **Argument Parsing**: Handles command-line arguments to specify source paths, destination paths on the device, and architectural details for NDK components.
*   **Directory and File Handling**: Can process individual files or entire directories, identifying relevant `.so` files for pushing.
*   **NDK `libc++_shared.so` Push**: Automatically locates and pushes the appropriate `libc++_shared.so` library from the Android NDK based on the target architecture, ensuring correct runtime environment for C++-based applications.
*   **Integration with ADB**: Leverages underlying ADB commands (likely via the `adb_commands` module) to perform the actual file transfer operations.

## Architecture and Component Relationships

The `adb_product_pusher` module is a leaf module under `adb_tools`, which itself is part of `android_utilities`. It primarily exposes a `main` function that orchestrates the pushing process.

Its internal components handle argument parsing and the actual push logic. It relies on external modules like `adb_commands` for executing low-level ADB operations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "main_func", "label": "main()", "type": "component", "link": null},
        {"id": "argument_parser", "label": "argument_parser()", "type": "component", "link": null},
        {"id": "push_func", "label": "_push()", "type": "component", "link": null},
        {"id": "adb_commands", "label": "adb_commands", "type": "external", "link": "adb_commands.md"}
    ],
    "edges": [
        {"source": "main_func", "target": "argument_parser"},
        {"source": "main_func", "target": "push_func"},
        {"source": "push_func", "target": "adb_commands"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    main_func[main()]
    argument_parser[argument_parser()]
    push_func[_push()]

    %% External Dependencies
    adb_commands[adb_commands]

    main_func --> argument_parser
    main_func --> push_func
    push_func --> adb_commands
```

### Core Components

#### `utils.android.adb_push_built_products.main.main`

This is the entry point for the module. It orchestrates the process of parsing command-line arguments and iterating through specified paths to push built products to an Android device. It handles both individual files and directories containing `.so` files. Additionally, it contains logic to locate and push the `libc++_shared.so` library from the NDK based on the target architecture (armv7 or aarch64).

## How the Module Fits into the Overall System

The `adb_product_pusher` module is a critical part of the `android_utilities` suite, specifically within the `adb_tools` sub-module. It works in conjunction with other ADB-related utilities, such as `adb_test_executor` (for running tests on the device) and `adb_commands` (for basic ADB operations like `rmdir` and `reboot`).

By providing a robust and automated way to push built artifacts, it supports the continuous integration and testing workflows for Android-related projects, ensuring that the correct binaries are always present on the target device before tests are executed or applications are launched. It acts as a foundational utility for any development that requires deploying custom builds to Android devices.

Refer to the [android_utilities.md](android_utilities.md) and [adb_tools.md](adb_tools.md) documentation for a broader understanding of its context within the Android development toolchain.