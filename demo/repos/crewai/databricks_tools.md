# Databricks Tools Module Documentation

## Introduction
The `databricks_tools` module provides a specialized tool for interacting with Databricks workspaces. Its primary function is to enable the execution of SQL queries against Databricks tables, retrieving and formatting the results. This module is a key component within the `crewai_tools_database_query` ecosystem, extending CrewAI's capabilities to integrate with Databricks for data retrieval and analysis tasks.

## Core Functionality - `DatabricksQueryTool`

The central component of this module is the `DatabricksQueryTool` class, which inherits from `BaseTool` (see [crewai_tool_base.md](crewai_tool_base.md)). It facilitates secure and efficient querying of Databricks tables using SQL.

### Features:
*   **SQL Query Execution:** Executes arbitrary SQL queries against specified Databricks catalogs and schemas.
*   **Flexible Authentication:** Supports authentication via Databricks CLI profiles (`DATABRICKS_CONFIG_PROFILE`) or direct credentials (`DATABRICKS_HOST` and `DATABRICKS_TOKEN` environment variables).
*   **Default Parameters:** Allows for setting default catalog, schema, and SQL warehouse ID during initialization, streamlining query execution.
*   **Robust Result Formatting:** Formats query results into a human-readable string, handling various data types, `NULL` values, and dynamically adjusting column widths for clarity. It also includes advanced logic for attempting to parse potentially malformed result structures.
*   **Error Handling:** Provides comprehensive error handling for query execution, status polling, and result processing, offering detailed traceback information for debugging.

### Usage Example:
```python
from crewai_tools import DatabricksQueryTool
import os

# Ensure Databricks credentials are set in environment variables
# For example:
# os.environ["DATABRICKS_HOST"] = "https://your-databricks-workspace.cloud.databricks.com"
# os.environ["DATABRICKS_TOKEN"] = "dapi..."
# Or os.environ["DATABRICKS_CONFIG_PROFILE"] = "your_profile_name"

# Initialize the tool, optionally with default parameters
tool = DatabricksQueryTool(
    default_catalog="my_catalog",
    default_schema="my_schema",
    default_warehouse_id="your_warehouse_id"
)

# Run a SQL query
query_results = tool.run(query="SELECT * FROM my_table LIMIT 5")
print(query_results)

# Run a query overriding defaults
query_results_override = tool.run(
    query="SELECT id, name FROM another_table WHERE created_at > '2023-01-01' LIMIT 10",
    catalog="temp_catalog",
    db_schema="temp_schema"
)
print(query_results_override)
```

## Architecture and Component Relationships

The `databricks_tools` module is built around the `DatabricksQueryTool` class, which orchestrates the interaction with the Databricks environment.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "databricks_query_tool", "label": "DatabricksQueryTool", "type": "component", "link": null},
        {"id": "_validate_credentials", "label": "._validate_credentials()", "type": "component", "link": null},
        {"id": "_format_results", "label": "._format_results()", "type": "component", "link": null},
        {"id": "_run_method", "label": "._run()", "type": "component", "link": null},
        {"id": "databricks_query_tool_schema", "label": "DatabricksQueryToolSchema", "type": "component", "link": null},
        {"id": "base_tool", "label": "BaseTool", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "databricks_sdk", "label": "databricks-sdk", "type": "external", "link": null},
        {"id": "environment_variables", "label": "Environment Variables", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "databricks_query_tool", "target": "base_tool"},
        {"source": "databricks_query_tool", "target": "databricks_query_tool_schema"},
        {"source": "databricks_query_tool", "target": "_validate_credentials"},
        {"source": "databricks_query_tool", "target": "_run_method"},
        {"source": "_validate_credentials", "target": "environment_variables"},
        {"source": "_run_method", "target": "databricks_query_tool_schema"},
        {"source": "_run_method", "target": "databricks_sdk"},
        {"source": "_run_method", "target": "_format_results"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    databricks_query_tool[DatabricksQueryTool]
    _validate_credentials[._validate_credentials()]
    _format_results[._format_results()]
    _run_method[._run()]
    databricks_query_tool_schema[DatabricksQueryToolSchema]
    base_tool[BaseTool]:::external
    databricks_sdk[databricks-sdk]:::external
    environment_variables[Environment Variables]

    databricks_query_tool --> base_tool
    databricks_query_tool --> databricks_query_tool_schema
    databricks_query_tool --> _validate_credentials
    databricks_query_tool --> _run_method
    _validate_credentials --> environment_variables
    _run_method --> databricks_query_tool_schema
    _run_method --> databricks_sdk
    _run_method --> _format_results

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

### Component Breakdown:

*   **`DatabricksQueryTool`**: The main class, responsible for initializing the tool, managing authentication, and invoking query execution. It provides the public interface for the tool.
*   **`._validate_credentials()`**: An internal method ensuring that the necessary Databricks authentication environment variables (`DATABRICKS_CONFIG_PROFILE` or `DATABRICKS_HOST` and `DATABRICKS_TOKEN`) are present before any operations.
*   **`DatabricksQueryToolSchema`**: A Pydantic `BaseModel` used to define and validate the input arguments for the `DatabricksQueryTool`, ensuring that queries and optional parameters are well-formed.
*   **`._run()`**: The core method that handles the actual execution of the SQL query. It leverages the `databricks-sdk` to interact with the Databricks workspace, polls for query completion, and then processes the raw results.
*   **`._format_results()`**: An internal utility method that takes the raw query results and transforms them into a structured, human-readable string representation for output. This includes complex logic for parsing and reconstructing rows, especially for cases where data might be malformed or split.

### External Dependencies:

*   **`BaseTool`**: The foundation class from which `DatabricksQueryTool` inherits, providing the common interface and functionality expected of CrewAI tools. (Refer to [crewai_tool_base.md](crewai_tool_base.md) for more details).
*   **`databricks-sdk`**: The official Python SDK for Databricks. The `DatabricksQueryTool` uses the `WorkspaceClient` from this SDK to establish connections and execute SQL statements against the Databricks SQL warehouse. This dependency is dynamically imported to avoid mandatory installation if the tool is not used.

## Integration with the Overall System

The `databricks_tools` module is a specific implementation under the broader `crewai_tools_database_query` module. This places it within the suite of tools designed to interact with various database systems. As part of the `crewai_tools` ecosystem, it allows CrewAI agents to programmatically query and retrieve data from Databricks, enabling tasks such as:

*   **Data Analysis:** Agents can fetch data for analysis directly from Databricks tables.
*   **Reporting:** Automating the generation of reports by querying data points.
*   **Feature Engineering:** Retrieving datasets needed for machine learning feature creation.
*   **Workflow Automation:** Integrating Databricks data access into larger automated workflows managed by CrewAI.

By adhering to the `BaseTool` interface, `DatabricksQueryTool` can be seamlessly integrated into any CrewAI agent's toolkit, providing a powerful capability for database interaction within an agentic workflow.
