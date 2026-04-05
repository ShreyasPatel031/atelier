# Anthropic File Search Module

The `anthropic_file_search` module provides middleware for integrating file search capabilities, specifically Glob and Grep, into agents utilizing Anthropic's tool-use functionality. This module enhances agent capabilities by allowing them to efficiently search through virtual files stored in the agent's state.

## Core Functionality

The primary component of this module is `StateFileSearchMiddleware`, which acts as an `AgentMiddleware` to inject file search tools into the agent's environment. It exposes two key tools:

*   **Glob Search**: For fast file pattern matching by file path, supporting standard glob patterns.
*   **Grep Search**: For fast content searching within files using regular expressions, with options to filter files and customize output format.

This middleware is crucial for agents that need to inspect or locate files based on their names or content during their operation.

## Architecture and Component Relationships

The `StateFileSearchMiddleware` class is responsible for initializing and exposing the `glob_search` and `grep_search` tools. These tools, when invoked by an agent, delegate their operations to internal handler methods that interact with the agent's state to perform the actual file searches.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "state_file_search_middleware", "label": "StateFileSearchMiddleware", "type": "component", "link": null},
        {"id": "glob_search_tool", "label": "Glob Search Tool", "type": "component", "link": null},
        {"id": "grep_search_tool", "label": "Grep Search Tool", "type": "component", "link": null},
        {"id": "handle_glob_search", "label": "_handle_glob_search", "type": "component", "link": null},
        {"id": "handle_grep_search", "label": "_handle_grep_search", "type": "component", "link": null},
        {"id": "format_grep_results", "label": "_format_grep_results", "type": "component", "link": null},
        {"id": "anthropic_tools_state", "label": "AnthropicToolsState", "type": "external", "link": "partners_anthropic_middleware.md"},
        {"id": "tool_decorator", "label": "tool decorator (core_tools)", "type": "external", "link": "core_tools.md"},
        {"id": "regex_module", "label": "re (Regex Module)", "type": "external", "link": null},
        {"id": "pathlib_module", "label": "pathlib (Path Utilities)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "state_file_search_middleware", "target": "glob_search_tool"},
        {"source": "state_file_search_middleware", "target": "grep_search_tool"},
        {"source": "glob_search_tool", "target": "handle_glob_search"},
        {"source": "grep_search_tool", "target": "handle_grep_search"},
        {"source": "handle_grep_search", "target": "format_grep_results"},
        {"source": "handle_glob_search", "target": "anthropic_tools_state"},
        {"source": "handle_grep_search", "target": "anthropic_tools_state"},
        {"source": "glob_search_tool", "target": "tool_decorator"},
        {"source": "grep_search_tool", "target": "tool_decorator"},
        {"source": "handle_grep_search", "target": "regex_module"},
        {"source": "handle_glob_search", "target": "pathlib_module"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    state_file_search_middleware[StateFileSearchMiddleware]
    glob_search_tool[Glob Search Tool]
    grep_search_tool[Grep Search Tool]
    handle_glob_search[_handle_glob_search]
    handle_grep_search[_handle_grep_search]
    format_grep_results[_format_grep_results]
    anthropic_tools_state[AnthropicToolsState]
    tool_decorator[tool decorator (core_tools)]
    regex_module[re (Regex Module)]
    pathlib_module[pathlib (Path Utilities)]

    state_file_search_middleware --> glob_search_tool
    state_file_search_middleware --> grep_search_tool
    glob_search_tool --> handle_glob_search
    grep_search_tool --> handle_grep_search
    handle_grep_search --> format_grep_results
    handle_glob_search --> anthropic_tools_state
    handle_grep_search --> anthropic_tools_state
    glob_search_tool --> tool_decorator
    grep_search_tool --> tool_decorator
    handle_grep_search --> regex_module
    handle_glob_search --> pathlib_module
```

### Components Detail

*   **`StateFileSearchMiddleware`**: This is the main class that inherits from `AgentMiddleware`. It initializes the file search capabilities and registers the `glob_search` and `grep_search` tools. It depends on `AnthropicToolsState` (likely defined within the [partners_anthropic_middleware](partners_anthropic_middleware.md) module) to access and manipulate the agent's file state.

*   **`glob_search` Tool**: A decorated function that allows agents to perform glob-style file path matching. It leverages the internal `_handle_glob_search` method for its logic.

*   **`grep_search` Tool**: A decorated function that enables agents to search file contents using regular expressions. It relies on the internal `_handle_grep_search` method for its execution.

*   **`_handle_glob_search`**: An internal method responsible for processing glob patterns, matching files within the agent's state (`AnthropicToolsState`), and returning sorted file paths. It utilizes `pathlib` utilities for path manipulation.

*   **`_handle_grep_search`**: An internal method that compiles regular expressions, filters files based on an optional `include` pattern, and searches file content within the agent's state. It uses the `re` module for regex operations and delegates result formatting to `_format_grep_results`.

*   **`_format_grep_results`**: An auxiliary internal method that formats the results of a grep search based on the specified `output_mode` (e.g., `files_with_matches`, `content`, `count`).

### External Dependencies

*   **`AnthropicToolsState`**: Represents the structured state where virtual files are stored. This is a critical dependency for both search operations to access the file system within the agent's context. (Refer to [partners_anthropic_middleware](partners_anthropic_middleware.md) for more details).
*   **`tool` decorator**: From the [core_tools](core_tools.md) module, this decorator transforms Python functions into callable tools that agents can utilize.
*   **`re` module**: Python's built-in regular expression module, used by `_handle_grep_search` for pattern matching within file contents.
*   **`pathlib` module**: Python's object-oriented filesystem paths, used by `_handle_glob_search` for path matching and manipulation.

## How the Module Fits into the Overall System

This `anthropic_file_search` module is part of the `partners_anthropic_middleware` package, which provides specific middleware functionalities tailored for agents interacting with Anthropic models. By extending `AgentMiddleware`, it seamlessly integrates into the agent's processing pipeline, making file search tools available during an agent's execution.

It plays a vital role in scenarios where an agent needs to programmatically inspect its working directory or analyze specific file contents to make informed decisions or retrieve necessary information. This enhances the agent's ability to operate within a file-aware environment, acting as a crucial bridge between the agent's reasoning capabilities and its virtual file system.