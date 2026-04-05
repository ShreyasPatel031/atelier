# expectation_updater Module Documentation

The `expectation_updater` module is a crucial component within the `test_generation_and_update` system, specifically nested under `verify_test_updater` and `test_expectation_handler`. Its primary purpose is to automate the updating of expected diagnostic messages (errors, warnings, notes) in "verify" test files for Swift projects. This automation helps maintain test correctness and reduces manual effort when compiler diagnostics change due to intended feature work or bug fixes.

## Core Functionality

This module provides two main ways to update expectations:

1.  **Standalone CLI Tool (`utils.update-verify-tests.main`)**: This script can be invoked directly, typically by piping the `stderr` output of a compiler run (which includes diagnostic messages) into its standard input. It parses these diagnostics and updates the corresponding test files to reflect the new expectations. This is useful for batch updates or when integrating into other scripts.

2.  **LIT Plugin (`utils.update_verify_tests.litplugin.uvt_lit_plugin`)**: This plugin integrates seamlessly with the LLVM Integrated Test (LIT) runner. When a test command involving `swift-frontend -verify` is executed, the plugin intercepts the `stderr` output. It then processes these diagnostics and updates the test files in-place. This provides a convenient way to update expectations during regular test runs, especially when dealing with "split" files where multiple `.swift` or `.sil` files are derived from a single `.test` input.

Both methods rely on a shared core logic to identify and update expectation patterns within the test files.

## Architecture and Component Relationships

The `expectation_updater` module interacts with the test runner and compiler output to perform its updates. It contains a command-line interface and a LIT plugin, both leveraging common internal utilities for processing and updating files.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "expectation_updater_cli", "label": "CLI Script (update-verify-tests.py)", "type": "component", "link": null},
        {"id": "uvt_lit_plugin", "label": "LIT Plugin (uvt_lit_plugin)", "type": "component", "link": null},
        {"id": "check_expectations", "label": "Check Expectations Logic", "type": "component", "link": null},
        {"id": "propagate_split_files", "label": "Propagate Split Files Logic", "type": "component", "link": null},
        {"id": "test_expectation_handler", "label": "Test Expectation Handler", "type": "external", "link": "test_expectation_handler.md"}
    ],
    "edges": [
        {"source": "expectation_updater_cli", "target": "check_expectations"},
        {"source": "uvt_lit_plugin", "target": "check_expectations"},
        {"source": "uvt_lit_plugin", "target": "propagate_split_files"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    %% Internal components of expectation_updater
    expectation_updater_cli[CLI Script (update-verify-tests.py)]
    uvt_lit_plugin[LIT Plugin (uvt_lit_plugin)]
    check_expectations[Check Expectations Logic]
    propagate_split_files[Propagate Split Files Logic]

    %% External dependencies
    test_expectation_handler[Test Expectation Handler]

    %% Relationships
    expectation_updater_cli --> check_expectations
    uvt_lit_plugin --> check_expectations
    uvt_lit_plugin --> propagate_split_files
```

### Component Breakdown:

*   **CLI Script (`expectation_updater_cli`)**: Implements the `utils.update-verify-tests.main` function. It parses command-line arguments, reads compiler output from `stdin`, and orchestrates the update process by calling `check_expectations`.
*   **LIT Plugin (`uvt_lit_plugin`)**: Implements the `utils.update_verify_tests.litplugin.uvt_lit_plugin` function. This plugin hooks into the LIT test runner, identifying `swift-frontend -verify` commands. It extracts diagnostics from `stderr` and uses `check_expectations` and `propagate_split_files` to update test expectations.
*   **Check Expectations Logic (`check_expectations`)**: An internal utility (shared by both the CLI and LIT plugin) responsible for parsing diagnostic messages, comparing them against existing expectations in test files, and generating the necessary modifications to update those expectations.
*   **Propagate Split Files Logic (`propagate_split_files`)**: An internal utility primarily used by the LIT plugin. It handles the complexities of "split" test files, ensuring that updates to one part of a multi-file test correctly propagate to all derived files.

## Integration with the Overall System

The `expectation_updater` module is a leaf module within the broader `test_generation_and_update` ecosystem. It is a sub-module of [test_expectation_handler](test_expectation_handler.md), which itself is a sub-module of [verify_test_updater](verify_test_updater.md). This hierarchy underscores its specialized role in managing diagnostic expectations.

It works closely with the `swift-frontend` compiler, processing its output to maintain an accurate set of expected errors, warnings, and notes in test files. By automating this process, it significantly contributes to the stability and maintainability of the Swift compiler's test suite, ensuring that changes to diagnostics are properly acknowledged and tracked. Its integration as a LIT plugin makes it an essential tool for developers when writing and debugging new compiler features or fixing existing bugs.
