# Module: version_management

## Introduction
The `version_management` module, a core part of the `crewai_devtools_cli` package, is responsible for automating the process of bumping version numbers across all packages within the `lib/` directory of the repository. It streamlines the version update process, including Git operations like branching, committing, and optionally pushing changes and creating pull requests.

## Core Functionality

### `bump` Function
The `bump` function is the primary entry point for managing package versions. It orchestrates the entire version bumping workflow, ensuring consistency and adherence to development best practices.

**Purpose:**
To update the version string for all `crewai` packages found in the `lib/` directory. It supports dry runs, skipping Git push, and skipping Git commit operations for flexible usage.

**Parameters:**
-   `version` (str): The new version string to be applied (e.g., "1.0.0", "1.0.0a1").
-   `dry_run` (bool): If `True`, the function will simulate the actions without making any actual changes to files or the Git repository.
-   `no_push` (bool): If `True`, Git changes will not be pushed to the remote repository after committing.
-   `no_commit` (bool): If `True`, changes will be applied to the files, but no Git commit or subsequent operations will be performed.

**Process Flow:**
1.  **User Confirmation:** Prompts the user for confirmation before proceeding with the version bump, especially noting that this tool only updates versions locally and does not perform a full release (tagging, PyPI publish, enterprise release).
2.  **Git Status Check:** In a non-dry run, it verifies that the current Git working directory is clean to prevent conflicts.
3.  **Package Discovery:** Identifies all relevant packages within the `lib/` directory that need their versions updated.
4.  **Version Update:** Iterates through the discovered packages and updates their version strings to the specified `version`.
5.  **Git Operations (Conditional):**
    *   If `no_commit` is `False`:
        *   Creates a new Git branch (e.g., `feat/bump-version-X.Y.Z`).
        *   Stages and commits the version changes with a standardized commit message.
        *   If `no_push` is `False`, pushes the newly created branch to the remote origin.
        *   If `no_push` is `False`, it attempts to create a Pull Request on GitHub using the `gh` CLI tool.
6.  **Error Handling:** Catches `subprocess.CalledProcessError` for issues with Git/GitHub CLI commands and general exceptions, providing informative error messages.

## Architecture and Component Relationships

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "bump", "label": "bump()", "type": "component", "link": null},
        {"id": "git", "label": "Git (Version Control)", "type": "external", "link": null},
        {"id": "github_cli", "label": "GitHub CLI (gh)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "bump", "target": "git"},
        {"source": "bump", "target": "github_cli"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    bump[bump()]
    git[Git (Version Control)]
    github_cli[GitHub CLI (gh)]
    bump --> git
    bump --> github_cli
```

The `bump` function serves as the central orchestrator for version management. It directly interacts with external version control systems (Git) and the GitHub CLI to automate the branching, committing, pushing, and pull request creation steps.

## How it Fits into the Overall System
The `version_management` module is a crucial part of the `crewai_devtools_cli` package, which provides command-line utilities for developers working on the CrewAI project. It ensures that all internal `lib/` packages maintain consistent version numbers, which is vital for releases and dependency management. While `bump` handles internal version updates, it explicitly informs users that a full release (which includes tagging, publishing to PyPI, and enterprise releases) should be handled by the `devtools release` command, likely found in the [release_tagging.md](release_tagging.md) module documentation. This separation of concerns allows for granular control over the release process.