# reddit_helpers Module Documentation

## Introduction

The `reddit_helpers` module provides a collection of utility functions specifically designed to interact with and extract data from Reddit comments. It serves as a dedicated part of the `evaluation_helpers` within the overall system, offering specialized functionalities for handling Reddit-specific data extraction tasks.

## Architecture

The `reddit_helpers` module is composed of the `reddit_comment_data_extraction` sub-module, which encapsulates the core logic for retrieving information from Reddit comments.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "reddit_comment_data_extraction", "label": "Reddit Comment Data Extraction", "type": "module", "link": "reddit_comment_data_extraction.md"}
    ],
    "edges": [],
    "groups": []
}
-->
```mermaid
graph TD
    reddit_comment_data_extraction[Reddit Comment Data Extraction]
    click reddit_comment_data_extraction "reddit_comment_data_extraction.md" "View Reddit Comment Data Extraction Module"
```

## Sub-modules

### reddit_comment_data_extraction

This sub-module focuses on providing helper functions for extracting specific data points from Reddit comments, such as the content of the latest comment by a user and the username of the parent comment.

For more detailed information, please refer to the [reddit_comment_data_extraction documentation](reddit_comment_data_extraction.md).
