# Reddit Helpers Module

## Introduction

The `reddit_helpers` module provides essential utility functions for interacting with Reddit-specific data within the evaluation harness. It focuses on extracting information from Reddit comments, such as the content of the latest comment by a user and the username of its parent comment.

## Architecture Overview

The module is structured into a single sub-module responsible for handling Reddit comment data retrieval. This design ensures a clear separation of concerns and facilitates easy maintenance and extension of Reddit-related functionalities.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "reddit_comment_retrieval", "label": "Reddit Comment Retrieval", "type": "module", "link": "reddit_comment_retrieval.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    reddit_comment_retrieval[Reddit Comment Retrieval]
    
    click reddit_comment_retrieval "reddit_comment_retrieval.md" "View Reddit Comment Retrieval Module"
```

## High-Level Functionality

### Reddit Comment Retrieval ([reddit_comment_retrieval.md](reddit_comment_retrieval.md))
This sub-module contains functions designed to retrieve specific details from Reddit comments, such as the content of the latest comment made by a given username and the username of that comment's parent. It simplifies the process of extracting critical information for evaluation purposes.
