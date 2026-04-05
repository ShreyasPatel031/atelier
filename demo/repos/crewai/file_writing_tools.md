# Module: file_writing_tools

## Introduction
The `file_writing_tools` module provides functionalities for writing content to files within the CrewAI framework. It offers a secure and controlled way to interact with the file system, primarily through the `FileWriterTool`. This module is a sub-module of `file_structure_tools`, which is part of the broader `crewai_tools_data_file_tools` module, responsible for various file-related operations.

## Architecture and Component Relationships

The `file_writing_tools` module is centered around the `FileWriterTool`, which facilitates writing operations. It relies on external modules for its base functionality and input schema definition.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "file_writer_tool", "label": "FileWriterTool", "type": "component", "link": null},
        {"id": "base_tool_module", "label": "BaseTool (from crewai_tool_base)", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "schema_definitions_module", "label": "Schema Definitions", "type": "external", "link": "schema_definitions.md"}
    ],
    "edges": [
        {"source": "file_writer_tool", "target": "base_tool_module"},
        {"source": "file_writer_tool", "target": "schema_definitions_module"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    file_writer_tool[FileWriterTool]
    base_tool_module[BaseTool (from crewai_tool_base)]
    schema_definitions_module[Schema Definitions]
    file_writer_tool --> base_tool_module
    file_writer_tool --> schema_definitions_module
```

### Component: FileWriterTool

The `FileWriterTool` is the primary component of this module, designed to safely and efficiently write content to files.

#### Purpose and Core Functionality
The `FileWriterTool` allows agents to write specified content to a file. It takes the filename, the content to be written, an optional directory path, and an optional overwrite flag as input. Its core functionalities include:
- **File Writing**: Writes the provided content to the designated file.
- **Path Traversal Prevention**: Implements robust checks to ensure that the target file path does not escape the intended directory, preventing security vulnerabilities.
- **Directory Creation**: Automatically creates the target directory if it does not already exist.
- **Overwrite Control**: Provides an option to prevent accidental overwriting of existing files.
- **Error Handling**: Gracefully handles various exceptions, such as `FileExistsError` and `KeyError`, providing informative error messages.

#### Input Parameters (via `args_schema: FileWriterToolInput`)
- `filename` (str): The name of the file to write to.
- `content` (str): The content to be written into the file.
- `directory` (str, optional): The directory where the file should be created. Defaults to the current directory (`./`).
- `overwrite` (bool, optional): A flag indicating whether to overwrite the file if it already exists. Defaults to `False`.

#### Implementation Details
The `_run` method orchestrates the file writing process. It performs the following steps:
1. **Path Resolution**: Resolves the full path to the target file and directory, ensuring absolute and real paths are used for security.
2. **Path Traversal Check**: Verifies that the resolved file path is strictly contained within the resolved directory path using `Path.is_relative_to()`. If not, an error is returned.
3. **Directory Creation**: If a custom `directory` is provided, `os.makedirs(real_directory, exist_ok=True)` ensures the directory structure exists.
4. **Overwrite Handling**: Converts the `overwrite` parameter to a boolean using `strtobool` and checks if the file exists and overwriting is disallowed.
5. **File Opening and Writing**: Opens the file in "write" (`w`) or "exclusive creation" (`x`) mode based on the `overwrite` flag, and writes the `content`.
6. **Error Management**: Catches `FileExistsError` specifically for cases where `overwrite` is `False`, and a general `Exception` for other potential issues during file operations.

## How the Module Fits into the Overall System

The `file_writing_tools` module is a vital part of the `crewai_tools_data_file_tools` suite, which provides agents with the capability to interact with the local file system. Specifically, it empowers agents to generate or modify files, which can be crucial for tasks involving:
- **Report Generation**: Agents can write generated reports or summaries to files.
- **Configuration Management**: Agents can create or update configuration files.
- **Code Generation**: Agents can write generated code snippets or full programs to files.
- **Data Persistence**: Agents can store intermediate or final data outputs in files for later use or analysis.

By providing a secure and reliable way to write files, `file_writing_tools` enhances the overall utility and autonomy of agents within the CrewAI ecosystem, enabling them to perform a wider range of tasks that require file system interaction. It complements other file-related tools such as [file_reading_tools](file_reading_tools.md) and [file_compression_tools](file_compression_tools.md) by offering the write functionality. It relies on the [crewai_tool_base](crewai_tool_base.md) for its foundational structure and on [schema_definitions](schema_definitions.md) for defining its input parameters.