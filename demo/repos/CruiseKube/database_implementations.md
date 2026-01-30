# Database Implementations Module

The `database_implementations` module provides concrete factory implementations for various database clients, specifically PostgreSQL and SQLite. This module is responsible for abstracting the underlying database client creation logic, allowing other parts of the system to interact with different database systems through a unified interface.

## Architecture Overview

This module contains the specific factories for PostgreSQL and SQLite clients. These factories adhere to the `ClientFactory` interface defined in the [database_clients.md](database_clients.md) module, ensuring a consistent way to create database client instances. It facilitates the integration of different database solutions into the application by providing a clear and decoupled mechanism for database client instantiation.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "postgres_client_factory", "label": "PostgreSQL Client Factory", "type": "module", "link": "postgres_client_factory.md"},
        {"id": "sqlite_client_factory", "label": "SQLite Client Factory", "type": "module", "link": "sqlite_client_factory.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    postgres_client_factory[PostgreSQL Client Factory]
    sqlite_client_factory[SQLite Client Factory]

    click postgres_client_factory "postgres_client_factory.md" "View PostgreSQL Client Factory Documentation"
    click sqlite_client_factory "sqlite_client_factory.md" "View SQLite Client Factory Documentation"
```

## Sub-modules

*   **[PostgreSQL Client Factory](postgres_client_factory.md)**: Handles the creation of PostgreSQL database clients.
*   **[SQLite Client Factory](sqlite_client_factory.md)**: Manages the creation of SQLite database clients.