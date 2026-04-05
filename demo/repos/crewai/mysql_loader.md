# `mysql_loader` Module Documentation

## Introduction

The `mysql_loader` module provides a specialized loader for extracting data from MySQL databases. It is a key component within the RAG (Retrieval Augmented Generation) loaders of the CrewAI tools, enabling agents to retrieve and utilize information directly from MySQL tables based on SQL queries.

## Purpose and Core Functionality

The primary purpose of this module is to facilitate the seamless integration of MySQL database content into RAG workflows. The `MySQLLoader` class allows users to specify an SQL query and a database connection URI to fetch data, which is then formatted into a readable string for further processing by the CrewAI system.

### Core Component: `MySQLLoader`

The `MySQLLoader` class is the central component of this module. It inherits from `BaseLoader` and implements the `load` method to interact with MySQL databases.

**Key Features:**
-   **SQL Query Execution:** Executes a given SQL query against a specified MySQL database.
-   **URI-based Connection:** Establishes a connection to the MySQL database using a provided URI (e.g., `mysql+pymysql://user:password@host:port/database`).
-   **Data Formatting:** Fetches query results, including column names and row data, and formats them into a comprehensive string.
-   **Error Handling:** Manages connection errors, invalid URI schemes, missing database names, and general MySQL exceptions.
-   **Content Truncation:** Truncates extremely large content to prevent excessive memory usage, indicating when content has been truncated.

## Architecture and Component Relationships

The `mysql_loader` module is a leaf module within the `database_loaders` sub-module, which is part of the broader `crewai_tools_rag_loaders_and_chunkers` module. It depends on core components from the `base_components` module for its base loader functionality and result structuring.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "mysql_loader", "label": "MySQLLoader", "type": "component", "link": null},
        {"id": "base_loader", "label": "BaseLoader", "type": "external", "link": "base_components.md"},
        {"id": "loader_result", "label": "LoaderResult", "type": "external", "link": "base_components.md"},
        {"id": "source_content", "label": "SourceContent", "type": "external", "link": "base_components.md"},
        {"id": "mysql_connector", "label": "mysql.connector", "type": "external", "link": null},
        {"id": "urlparse", "label": "urllib.parse.urlparse", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "mysql_loader", "target": "base_loader", "label": "inherits"},
        {"source": "mysql_loader", "target": "mysql_connector", "label": "uses"},
        {"source": "mysql_loader", "target": "urlparse", "label": "uses"},
        {"source": "mysql_loader", "target": "loader_result", "label": "returns"},
        {"source": "mysql_loader", "target": "source_content", "label": "takes"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    mysql_loader[MySQLLoader]
    base_loader[BaseLoader]
    loader_result[LoaderResult]
    source_content[SourceContent]
    mysql_connector[mysql.connector]
    urlparse[urllib.parse.urlparse]

    mysql_loader -- inherits --> base_loader
    mysql_loader -- uses --> mysql_connector
    mysql_loader -- uses --> urlparse
    mysql_loader -- returns --> loader_result
    mysql_loader -- takes --> source_content
```

### Dependencies

-   **`base_components`**: Provides the foundational `BaseLoader` class, `LoaderResult` and `SourceContent` for standardizing data loading operations. Refer to the [base_components documentation](base_components.md) for more details.
-   **`mysql.connector`**: The official MySQL driver for Python, used for establishing connections and executing queries.
-   **`urllib.parse.urlparse`**: A standard Python library function used for parsing the database URI.

## How the Module Fits into the Overall System

The `mysql_loader` module is an integral part of the CrewAI's RAG system, specifically designed for fetching data from MySQL databases. It extends the data loading capabilities, allowing agents to access structured information stored in relational databases. This enables agents to perform tasks requiring up-to-date or specific data that resides in MySQL, enhancing their ability to generate relevant and informed responses.