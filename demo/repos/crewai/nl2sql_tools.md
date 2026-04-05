# `nl2sql_tools` Module Documentation

The `nl2sql_tools` module provides a powerful mechanism for interacting with SQL databases using natural language. It enables agents to convert natural language requests into executable SQL queries, retrieve data, and manage database interactions seamlessly.

### Purpose and Core Functionality
The primary purpose of the `nl2sql_tools` module is to facilitate Natural Language to SQL (NL2SQL) capabilities within the CrewAI framework. It offers a tool, `NL2SQLTool`, that abstracts the complexities of SQL query generation and execution, allowing agents to perform database operations through descriptive natural language prompts.

The core functionality includes:
- **Natural Language to SQL Conversion**: Although the tool itself executes pre-generated SQL, its design allows it to be used in conjunction with LLMs that can convert natural language prompts into appropriate SQL queries.
- **SQL Query Execution**: Safely executes SQL queries against a specified database.
- **Database Schema Introspection**: Automatically fetches available tables and their respective columns from the connected database, providing crucial context for SQL query generation.
- **Error Handling**: Provides informative error messages if a SQL query fails, guiding agents toward correct query formulation.
- **Data Retrieval**: Returns query results in a structured dictionary format for easy consumption by agents.

### Architecture and Component Relationships

The `nl2sql_tools` module is centered around a single, robust component: `NL2SQLTool`.

#### `NL2SQLTool`
The `NL2SQLTool` class inherits from `BaseTool` (from `crewai_tool_base`), adhering to the standard tool interface within CrewAI. It encapsulates all logic required to connect to a database, inspect its schema, execute SQL queries, and process results.

**Key Internal Methods:**
- `model_post_init`: This method is automatically called after initialization. It's responsible for fetching the database schema (tables and columns) which is then used to provide context for SQL query generation. It also validates the presence of the `sqlalchemy` library.
- `_fetch_available_tables`: Connects to the database and retrieves a list of all available table names from the `information_schema.tables`.
- `_fetch_all_available_columns`: For a given table, this method fetches all column names and their data types from `information_schema.columns`.
- `execute_sql`: This is the core method for executing any SQL query. It uses `SQLAlchemy` to establish a connection, execute the query, commit transactions, and handle result parsing. It also includes error handling with session rollback.
- `_run`: This method is the entry point for the tool's execution when called by an agent. It takes a SQL query string as input, calls `execute_sql`, and formats the output or error message.

**Dependencies:**
- **`sqlalchemy`**: This external library is critical for database connectivity and interaction. The `NL2SQLTool` explicitly checks for its installation and raises an `ImportError` if it's not found.
- **`BaseTool`**: Inherited from [crewai_tool_base](crewai_tool_base.md), ensuring compatibility with the CrewAI tool ecosystem.
- **`BaseModel`, `Field`**: From `pydantic`, used for defining the tool's input schema and validation (`NL2SQLToolInput`).

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "nl2sql_tool", "label": "NL2SQLTool", "type": "component", "link": null},
        {"id": "model_post_init", "label": "model_post_init()", "type": "component", "link": null},
        {"id": "fetch_tables", "label": "_fetch_available_tables()", "type": "component", "link": null},
        {"id": "fetch_columns", "label": "_fetch_all_available_columns()", "type": "component", "link": null},
        {"id": "execute_sql", "label": "execute_sql()", "type": "component", "link": null},
        {"id": "run_method", "label": "_run(sql_query)", "type": "component", "link": null},
        {"id": "database", "label": "Database (db_uri)", "type": "external", "link": null},
        {"id": "crewai_tool_base", "label": "crewai_tool_base", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "sqlalchemy", "label": "SQLAlchemy Library", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "nl2sql_tool", "target": "model_post_init"},
        {"source": "model_post_init", "target": "fetch_tables"},
        {"source": "model_post_init", "target": "fetch_columns"},
        {"source": "model_post_init", "target": "execute_sql"},
        {"source": "fetch_tables", "target": "database"},
        {"source": "fetch_columns", "target": "database"},
        {"source": "execute_sql", "target": "database"},
        {"source": "run_method", "target": "execute_sql"},
        {"source": "nl2sql_tool", "target": "run_method"},
        {"source": "nl2sql_tool", "target": "crewai_tool_base"},
        {"source": "execute_sql", "target": "sqlalchemy"},
        {"source": "model_post_init", "target": "sqlalchemy"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    nl2sql_tool[NL2SQLTool]
    model_post_init[model_post_init()]
    fetch_tables[_fetch_available_tables()]
    fetch_columns[_fetch_all_available_columns()]
    execute_sql[execute_sql()]
    run_method[_run(sql_query)]
    database[(Database (db_uri))]
    crewai_tool_base[crewai_tool_base]
    sqlalchemy[SQLAlchemy Library]

    nl2sql_tool --> model_post_init
    model_post_init --> fetch_tables
    model_post_init --> fetch_columns
    model_post_init --> execute_sql
    fetch_tables --> database
    fetch_columns --> database
    execute_sql --> database
    run_method --> execute_sql
    nl2sql_tool --> run_method
    nl2sql_tool --> crewai_tool_base
    execute_sql --> sqlalchemy
    model_post_init --> sqlalchemy
```

### How the Module Fits into the Overall System
The `nl2sql_tools` module is a specialized component within the `crewai_tools_database_query` family of tools. It empowers CrewAI agents to interact with relational databases by translating natural language into SQL operations. This is crucial for applications requiring data retrieval, analysis, or manipulation directly from a database without requiring the agent to be proficient in SQL itself.

By providing a structured and reliable way to query databases, `nl2sql_tools` enhances the capabilities of agents, allowing them to:
- **Access real-time data**: Query databases for up-to-date information.
- **Perform data analysis**: Retrieve specific datasets for further processing by other tools or agents.
- **Automate database tasks**: Execute predefined or dynamically generated SQL commands.

It acts as a bridge between the agent's high-level understanding of a task and the low-level database operations, significantly expanding the scope of problems CrewAI agents can address. It complements other data-related tools by providing direct access to structured data sources.