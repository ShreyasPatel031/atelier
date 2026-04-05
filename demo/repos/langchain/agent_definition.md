# Module: agent_definition

## Introduction

The `agent_definition` module is a crucial component within the `classic_agents` ecosystem, specifically designed to define and implement the `StructuredChatAgent`. This agent is tailored for scenarios requiring structured output from language models, making it suitable for tasks where the agent's responses need to conform to a predefined format, often involving tool usage. It extends the base `Agent` class, providing specialized handling for prompts, intermediate steps, and output parsing in a structured chat environment.

## Architecture and Component Relationships

The `StructuredChatAgent` leverages several core LangChain components to achieve its functionality. It inherits from a base `Agent` class, utilizes dedicated output parsers for structured responses, and integrates with language models and tools through a prompt-driven `LLMChain`.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "structured_chat_agent", "label": "StructuredChatAgent", "type": "component", "link": null},
        {"id": "agent_base", "label": "Agent (Base Class)", "type": "external", "link": "agent_core.md"},
        {"id": "output_parser_with_retries", "label": "StructuredChatOutputParserWithRetries", "type": "external", "link": "output_parsing.md"},
        {"id": "base_tool", "label": "BaseTool", "type": "external", "link": "core_tools.md"},
        {"id": "base_language_model", "label": "BaseLanguageModel", "type": "external", "link": "core_language_models.md"},
        {"id": "base_callback_manager", "label": "BaseCallbackManager", "type": "external", "link": "core_callbacks.md"},
        {"id": "prompt_templates", "label": "Prompt Templates", "type": "external", "link": "core_prompts.md"},
        {"id": "llm_chain", "label": "LLMChain", "type": "external", "link": "classic_chains_base.md"}
    ],
    "edges": [
        {"source": "structured_chat_agent", "target": "agent_base"},
        {"source": "structured_chat_agent", "target": "output_parser_with_retries"},
        {"source": "structured_chat_agent", "target": "base_tool"},
        {"source": "structured_chat_agent", "target": "base_language_model"},
        {"source": "structured_chat_agent", "target": "base_callback_manager"},
        {"source": "structured_chat_agent", "target": "prompt_templates"},
        {"source": "structured_chat_agent", "target": "llm_chain"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    structured_chat_agent[StructuredChatAgent]
    agent_base[Agent (Base Class)]:::external
    output_parser_with_retries[StructuredChatOutputParserWithRetries]:::external
    base_tool[BaseTool]:::external
    base_language_model[BaseLanguageModel]:::external
    base_callback_manager[BaseCallbackManager]:::external
    prompt_templates[Prompt Templates]:::external
    llm_chain[LLMChain]:::external

    structured_chat_agent --> agent_base
    structured_chat_agent --> output_parser_with_retries
    structured_chat_agent --> base_tool
    structured_chat_agent --> base_language_model
    structured_chat_agent --> base_callback_manager
    structured_chat_agent --> prompt_templates
    structured_chat_agent --> llm_chain

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

### Core Functionality

The `agent_definition` module primarily exposes the `StructuredChatAgent` class, which offers the following key functionalities:

*   **Structured Output Parsing**: It utilizes `StructuredChatOutputParserWithRetries` to parse the language model's output, ensuring it adheres to a predefined structure. This parser can also handle retries in case of malformed output.
*   **Tool Integration**: The agent is designed to work with a collection of `BaseTool` instances, allowing it to perform actions by calling external functions or services.
*   **Prompt Engineering**: It constructs sophisticated prompts using a combination of system messages, human messages, and formatted tool descriptions. This allows for clear instructions to the language model on how to interact with tools and format its responses.
*   **Scratchpad Management**: The agent manages an "agent scratchpad" to keep track of intermediate steps and observations during its execution, providing context for subsequent turns.
*   **LLM Integration**: It integrates with `BaseLanguageModel` instances through an `LLMChain` to send prompts and receive responses from the underlying large language model.

## How it Fits into the Overall System

The `agent_definition` module, through its `StructuredChatAgent` class, plays a central role in the `classic_agents.structured_chat` sub-module. It provides the concrete implementation of an agent that can engage in structured conversations and utilize tools.

*   **`structured_chat_core`**: This module acts as a container for core components related to structured chat agents, with `agent_definition` providing the actual agent class.
*   **`output_parsing`**: The `StructuredChatOutputParserWithRetries` from this module is directly used by `StructuredChatAgent` for processing LLM output.
*   **`agent_factory`**: This module (likely `classic_agents.structured_chat.base.create_structured_chat_agent`) would use `StructuredChatAgent` to instantiate and configure structured chat agents for various applications.
*   **`classic_agents`**: As part of the broader `classic_agents` module, `StructuredChatAgent` contributes to the rich set of agent types available in LangChain Classic, offering a specialized solution for structured interactions.

Developers would use this module to create agents that require precise output formats, such as agents that need to call specific functions or interact with external APIs based on structured commands. Its integration with `BaseTool` and sophisticated prompt construction makes it a powerful choice for building robust, structured AI agents.
