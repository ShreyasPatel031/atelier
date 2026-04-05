# Specialized Search Headers

## Introduction
The `specialized_search_headers` module is a crucial component within the `crewai_tools_web_search.search_api_schemas` package. Its primary purpose is to define specific header schemas for various specialized search endpoints provided by Brave Search, such as Local POIs, Video, Image, and News searches. This module ensures that API requests to these diverse Brave Search functionalities are correctly structured and adhere to their respective requirements.

## Architecture
The module is structured to provide clear, type-safe definitions for different search header types. It centralizes the schema definitions, promoting reusability and maintainability across various Brave Search integrations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "brave_search_specific_headers", "label": "Brave Search Specific Headers", "type": "module", "link": "brave_search_specific_headers.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    brave_search_specific_headers[Brave Search Specific Headers]
    click brave_search_specific_headers "brave_search_specific_headers.md" "View Brave Search Specific Headers Module"
```

## Sub-modules

### [Brave Search Specific Headers](brave_search_specific_headers.md)
This sub-module contains the concrete header definitions for specialized Brave Search endpoints. It includes schemas like `LocalPOIsDescriptionHeaders`, `VideoSearchHeaders`, `ImageSearchHeaders`, and `NewsSearchHeaders`, each tailored for its specific search context.
