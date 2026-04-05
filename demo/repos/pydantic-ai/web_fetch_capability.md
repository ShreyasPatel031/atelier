# web_fetch_capability Module Documentation

## Introduction

The `web_fetch_capability` module provides robust URL fetching capabilities for agents. It is designed to offer flexibility by leveraging either a model's native (builtin) URL fetching mechanism or falling back to a local, markdownify-based fetching tool when a builtin option is unavailable. This dual approach ensures that agents can consistently access and process web content, adapting to the underlying model's features.

## Architecture and Core Functionality

The core component of this module is the `WebFetch` class. `WebFetch` extends `BuiltinOrLocalTool`, allowing it to intelligently switch between a model's inherent web fetching capabilities and a local fallback mechanism. This design provides resilience and broad compatibility across different models.

### WebFetch Class

The `WebFetch` class encapsulates the logic for configuring and executing web fetch operations. Key functionalities include:

*   **Dual-mode Operation**: It prioritizes the `WebFetchTool` provided by the model (if available and configured) for efficient and potentially more integrated web access. If a builtin tool is not present or `builtin=False` is specified, it falls back to a locally implemented `web_fetch_tool` (typically from `pydantic_ai.common_tools.web_fetch`), which uses markdownify for content extraction.
*   **Domain Control**: Allows specifying `allowed_domains` and `blocked_domains` to control which websites the agent can access. These restrictions are enforced locally when the builtin tool is not used.
*   **Resource Management**: Supports `max_uses` to limit the number of fetch operations per run (requires builtin support).
*   **Content Processing**: Offers `enable_citations` and `max_content_tokens` for managing how fetched content is handled and presented (builtin-only features).
*   **Initialization Flexibility**: The `__init__` method provides comprehensive options to configure the builtin and local tools, including dynamic instantiation via callables.

### Integration with other modules

The `web_fetch_capability` module integrates with:

*   **builtin_local_tool_handler**: The `WebFetch` class inherits from `BuiltinOrLocalTool` (see [builtin_local_tool_handler.md](builtin_local_tool_handler.md)), which provides the foundational logic for managing and switching between builtin and local tool implementations.
*   **pydantic_ai_tools**: When the builtin web fetching is not available, `WebFetch` uses a local fallback tool, typically `web_fetch_tool` from `pydantic_ai.common_tools.web_fetch`. This local tool is part of the broader `pydantic_ai_tools` ecosystem (see [pydantic_ai_tools.md](pydantic_ai_tools.md)). The `WebFetchTool` interface, which defines the expected behavior of a builtin web fetching tool, is also implicitly part of the capabilities system.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "web_fetch_component", "label": "WebFetch Capability", "type": "component", "link": null},
        {"id": "builtin_local_tool_handler", "label": "BuiltinOrLocalTool", "type": "external", "link": "builtin_local_tool_handler.md"},
        {"id": "web_fetch_tool_interface", "label": "WebFetchTool Interface", "type": "external", "link": null},
        {"id": "pydantic_ai_tools", "label": "pydantic_ai_tools (common_tools.web_fetch)", "type": "external", "link": "pydantic_ai_tools.md"}
    ],
    "edges": [
        {"source": "web_fetch_component", "target": "builtin_local_tool_handler"},
        {"source": "web_fetch_component", "target": "web_fetch_tool_interface"},
        {"source": "web_fetch_component", "target": "pydantic_ai_tools"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    web_fetch_component[WebFetch Capability]
    builtin_local_tool_handler[BuiltinOrLocalTool]:::external
    web_fetch_tool_interface[WebFetchTool Interface]:::external
    pydantic_ai_tools[pydantic_ai_tools (common_tools.web_fetch)]:::external

    web_fetch_component --> builtin_local_tool_handler
    web_fetch_component --> web_fetch_tool_interface
    web_fetch_component --> pydantic_ai_tools

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```