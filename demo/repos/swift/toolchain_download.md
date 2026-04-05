# Toolchain Download Module

The `toolchain_download` module is responsible for fetching and managing unpublished Swift toolchains. It provides functionality to download the latest development toolchains for specific platforms and architectures, and optionally extract them.

## Architecture and Component Relationships

This module primarily exposes a single entry point, `main`, which orchestrates the entire download process. It relies on several internal utility functions for parsing command-line arguments, constructing download URLs, performing the download, and untarring the downloaded archive.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "main", "label": "main()", "type": "component", "link": null},
        {"id": "parse_args", "label": "parse_args()", "type": "component", "link": null},
        {"id": "get_build_url", "label": "get_build_url()", "type": "component", "link": null},
        {"id": "get_latest_toolchain_url", "label": "get_latest_toolchain_url()", "type": "component", "link": null},
        {"id": "download_toolchain", "label": "download_toolchain()", "type": "component", "link": null},
        {"id": "untar_toolchain", "label": "untar_toolchain()", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "main", "target": "parse_args"},
        {"source": "main", "target": "get_build_url"},
        {"source": "main", "target": "get_latest_toolchain_url"},
        {"source": "main", "target": "download_toolchain"},
        {"source": "main", "target": "untar_toolchain"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    %% Internal components of toolchain_download module
    main[main()]
    parse_args[parse_args()]
    get_build_url[get_build_url()]
    get_latest_toolchain_url[get_latest_toolchain_url()]
    download_toolchain[download_toolchain()]
    untar_toolchain[untar_toolchain()]

    %% Control flow
    main --> parse_args
    main --> get_build_url
    main --> get_latest_toolchain_url
    main --> download_toolchain
    main --> untar_toolchain
```

### Core Functionality

The `utils.download-unpublished-toolchains.main` function serves as the primary entry point:

1.  **Argument Parsing**: It parses command-line arguments to determine the desired platform, architecture, output directory, and whether to untar the downloaded toolchain.
2.  **URL Construction**: It dynamically constructs the base URL for the build and then identifies the specific URL for the latest toolchain archive.
3.  **Download**: If not in dry-run mode, it proceeds to download the toolchain archive to the specified output directory.
4.  **Extraction (Optional)**: If the `untar` option is enabled, the downloaded archive is extracted into the output directory.

## Integration with the Overall System

The `toolchain_download` module is a vital part of the [toolchain_management](toolchain_management.md) subsystem, which itself belongs to the broader [swift_toolchain_utilities](swift_toolchain_utilities.md) module. It provides the essential capability of obtaining pre-built Swift toolchains, which are then used by other modules for tasks such as performance benchmarking, API/ABI analysis, or general development. Its role is foundational, ensuring that the necessary build artifacts are available for subsequent operations within the Swift ecosystem development workflow.