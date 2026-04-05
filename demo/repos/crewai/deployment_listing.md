# Deployment Listing Module

The `deployment_listing` module provides the functionality to list all deployed crews within the CrewAI CLI. It serves as a simple interface to query and display information about active deployments, making it easier for users to monitor their running automation agents.

## Architecture and Component Relationships

This module's core functionality is encapsulated within a single command-line interface function that leverages the broader deployment management system.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "deploy_list", "label": "deploy_list()", "type": "component", "link": null},
        {"id": "deploy_command", "label": "DeployCommand (from crew_deployment_management)", "type": "external", "link": "crew_deployment_management.md"}
    ],
    "edges": [
        {"source": "deploy_list", "target": "deploy_command"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    deploy_list[deploy_list()]
    deploy_command[DeployCommand (from crew_deployment_management)]
    deploy_list --> deploy_command
```

## Core Functionality

### `deploy_list()`

`deploy_list()` is the main entry point for listing deployments. It initializes a `DeployCommand` object and invokes its `list_crews()` method to retrieve and display the deployment information.

```python
def deploy_list() -> None:
    """List all deployments."""
    deploy_cmd = DeployCommand()
    deploy_cmd.list_crews()
```

## Integration with Overall System

The `deployment_listing` module is a sub-module of `crewai_cli.crew_deployment_management.deployment_monitoring_and_query`. It acts as a specific command within the CrewAI Command Line Interface (`crewai_cli`), allowing users to interact with the deployment management system. It relies on the `crew_deployment_management` module for the actual logic of fetching deployment data, ensuring a clear separation of concerns between command-line interface presentation and core deployment operations.

For more details on deployment management, refer to the [crew_deployment_management module documentation](crew_deployment_management.md).