# cassette_checks Module Documentation

The `cassette_checks` module is a critical utility within the `repository_scripts` collection, designed to maintain the integrity and cleanliness of VCR (cassette) recordings used in automated tests. Its primary function is to identify and report "orphaned" VCR cassettes that no longer correspond to any active test cases, helping developers keep the test suite efficient and free of dead code.

## Core Functionality

This module focuses on ensuring that every VCR cassette file recorded by tests has a corresponding test that utilizes it. It achieves this by:
1.  **Collecting Cassettes**: Scanning the repository for all VCR cassette files.
2.  **Collecting Tests**: Identifying all test cases marked for VCR usage.
3.  **Matching and Reporting**: Comparing the collected cassettes against the identified tests to find any cassettes that do not have a matching test. These unmatched cassettes are flagged as "orphaned."

The module provides verbose output options for detailed debugging and a clear summary of the check results, returning a non-zero exit code if orphaned cassettes are found, which can be integrated into CI/CD pipelines for automated quality checks.

## Architecture and Component Relationships

The `cassette_checks` module is a standalone script that orchestrates a simple but effective workflow.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "main", "label": "main()", "type": "component", "link": null},
        {"id": "get_all_cassettes", "label": "get_all_cassettes()", "type": "component", "link": null},
        {"id": "get_all_tests", "label": "get_all_tests()", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "main", "target": "get_all_cassettes"},
        {"source": "main", "target": "get_all_tests"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    main[main()]
    get_all_cassettes[get_all_cassettes()]
    get_all_tests[get_all_tests()]
    main --> get_all_cassettes
    main --> get_all_tests
```

### Components:

*   **`main()`**: The entry point of the script. It orchestrates the collection of cassettes and tests, performs the matching logic, and reports the findings to the console. It also manages the exit code based on whether orphaned cassettes are found.
*   **`get_all_cassettes()`**: A utility function (internal to the `scripts.check_cassettes` module) responsible for scanning the file system to locate and list all VCR cassette files.
*   **`get_all_tests()`**: A utility function (internal to the `scripts.check_cassettes` module) responsible for identifying and listing all Python test functions that are decorated or otherwise configured to use VCR for network recording.

## Integration with the Overall System

The `cassette_checks` module is part of the broader [repository_scripts](repository_scripts.md) collection. These scripts are typically run as part of development workflows, pre-commit hooks, or continuous integration pipelines to ensure code quality and maintainability.

By identifying orphaned VCR cassettes, this module helps:
*   **Reduce Repository Bloat**: Removes unnecessary files from the codebase.
*   **Improve Test Maintainability**: Ensures that all test artifacts are relevant and actively used.
*   **Prevent Stale Data**: Guards against using outdated or irrelevant recorded interactions in tests.

It operates independently but contributes significantly to the health of the testing infrastructure, particularly in projects that heavily rely on VCR for mocking external API calls.