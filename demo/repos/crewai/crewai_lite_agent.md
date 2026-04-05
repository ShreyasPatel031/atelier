The `crewai_lite_agent` module defines the `LiteAgent` class, which is a lightweight agent designed for direct execution and tool usage.

### Purpose and Core Functionality

The `LiteAgent` is a simpler alternative to the full `Agent` class, focusing on direct interaction and execution rather than complex task delegation within a crew. Its core functionalities include:

*   **Message Processing**: The agent can process incoming messages, whether a single string query or a list of structured `LLMMessage` objects.
*   **Tool Utilization**: It is equipped with a list of `BaseTool` instances, allowing it to perform actions and retrieve information during its execution.
*   **Language Model Integration**: It uses a specified `BaseLLM` for generating responses and making decisions.
*   **Structured Output**: Supports defining a `response_format` using Pydantic models to ensure outputs are structured and validated.
*   **Memory Management (Optional)**: If configured, it can recall relevant memories for context and extract new memories from its interactions. This leverages the [crewai_memory_analysis](crewai_memory_analysis.md) module.
*   **Guardrail Validation (Optional)**: It can apply guardrails to its output to ensure adherence to specific criteria, with built-in retry mechanisms. This functionality relies on [crewai_experimental_evaluation](crewai_experimental_evaluation.md).
*   **Agent-to-Agent (A2A) Communication (Optional)**: Can be configured to delegate tasks to remote agents through A2A. This involves components from [crewai_agent_to_agent_communication](crewai_agent_to_agent_communication.md).
*   **Asynchronous Execution**: Provides `kickoff_async` for non-blocking operations.

**Deprecation Notice**: It's crucial to highlight that `LiteAgent` is deprecated. Users are advised to use `Agent().kickoff(messages)` for enhanced functionality, including robust memory and knowledge support.

### Architecture and Component Relationships

The `LiteAgent` class is the central component of this module. It orchestrates the flow of execution, from processing input messages to utilizing tools and generating a final output.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "lite_agent", "label": "LiteAgent", "type": "component", "link": null},
        {"id": "kickoff_method", "label": "kickoff()", "type": "component", "link": null},
        {"id": "_execute_core_method", "label": "_execute_core()", "type": "component", "link": null},
        {"id": "_invoke_loop_method", "label": "_invoke_loop()", "type": "component", "link": null},
        {"id": "llm_integrations", "label": "crewai_llm_integrations", "type": "external", "link": "crewai_llm_integrations.md"},
        {"id": "tool_base", "label": "crewai_tool_base", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "tools_adapters", "label": "crewai_tools_adapters", "type": "external", "link": "crewai_tools_adapters.md"},
        {"id": "a2a_communication", "label": "crewai_agent_to_agent_communication", "type": "external", "link": "crewai_agent_to_agent_communication.md"},
        {"id": "memory_analysis", "label": "crewai_memory_analysis", "type": "external", "link": "crewai_memory_analysis.md"},
        {"id": "event_system", "label": "crewai_event_system", "type": "external", "link": "crewai_event_system.md"},
        {"id": "utilities", "label": "crewai_utilities", "type": "external", "link": "crewai_utilities.md"},
        {"id": "execution_context", "label": "crewai_execution_context", "type": "external", "link": "crewai_execution_context.md"},
        {"id": "agent_core", "label": "crewai_agent_core", "type": "external", "link": "crewai_agent_core.md"},
        {"id": "experimental_evaluation", "label": "crewai_experimental_evaluation", "type": "external", "link": "crewai_experimental_evaluation.md"},
        {"id": "files_cache", "label": "crewai_files_cache", "type": "external", "link": "crewai_files_cache.md"},
        {"id": "flow_management", "label": "crewai_flow_management", "type": "external", "link": "crewai_flow_management.md"}
    ],
    "edges": [
        {"source": "lite_agent", "target": "kickoff_method"},
        {"source": "kickoff_method", "target": "_execute_core_method"},
        {"source": "_execute_core_method", "target": "_invoke_loop_method"},
        {"source": "lite_agent", "target": "llm_integrations"},
        {"source": "lite_agent", "target": "tool_base"},
        {"source": "lite_agent", "target": "tools_adapters"},
        {"source": "lite_agent", "target": "a2a_communication"},
        {"source": "lite_agent", "target": "memory_analysis"},
        {"source": "lite_agent", "target": "event_system"},
        {"source": "lite_agent", "target": "utilities"},
        {"source": "lite_agent", "target": "execution_context"},
        {"source": "lite_agent", "target": "agent_core"},
        {"source": "lite_agent", "target": "experimental_evaluation"},
        {"source": "lite_agent", "target": "files_cache"},
        {"source": "lite_agent", "target": "flow_management"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    lite_agent[LiteAgent]
    kickoff_method[kickoff()]
    _execute_core_method[_execute_core()]
    _invoke_loop_method[_invoke_loop()]
    llm_integrations[crewai_llm_integrations]
    tool_base[crewai_tool_base]
    tools_adapters[crewai_tools_adapters]
    a2a_communication[crewai_agent_to_agent_communication]
    memory_analysis[crewai_memory_analysis]
    event_system[crewai_event_system]
    utilities[crewai_utilities]
    execution_context[crewai_execution_context]
    agent_core[crewai_agent_core]
    experimental_evaluation[crewai_experimental_evaluation]
    files_cache[crewai_files_cache]
    flow_management[crewai_flow_management]
    lite_agent --> kickoff_method
    kickoff_method --> _execute_core_method
    _execute_core_method --> _invoke_loop_method
    lite_agent --> llm_integrations
    lite_agent --> tool_base
    lite_agent --> tools_adapters
    lite_agent --> a2a_communication
    lite_agent --> memory_analysis
    lite_agent --> event_system
    lite_agent --> utilities
    lite_agent --> execution_context
    lite_agent --> agent_core
    lite_agent --> experimental_evaluation
    lite_agent --> files_cache
    lite_agent --> flow_management
```

### How the Module Fits into the Overall System

The `crewai_lite_agent` module served as an accessible entry point for single-agent operations, simplifying the initial interaction with the CrewAI framework. It allowed developers to quickly set up agents for specific tasks without needing to configure a full crew.

However, with the ongoing development of CrewAI, the capabilities of `LiteAgent` have been integrated and expanded within the primary [crewai_agent_core](crewai_agent_core.md) module's `Agent` class. This consolidation means that the `LiteAgent` module is now considered deprecated. The recommended approach for all agent-based interactions is to utilize the `Agent` class, which offers a more comprehensive feature set, including enhanced memory, knowledge management, and a seamless integration with the broader CrewAI ecosystem. This transition streamlines the architecture and provides a more robust and scalable solution for agent-driven workflows.