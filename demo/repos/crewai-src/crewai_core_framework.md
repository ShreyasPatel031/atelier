The `crewai_core_framework` module serves as the foundational layer for building and orchestrating intelligent AI agent systems. It provides the essential components for defining agents and their collaborative crews, managing complex task workflows and execution flows, integrating with various Large Language Models (LLMs), establishing robust eventing and context management, and enabling secure agent-to-agent communication. This module empowers users to design, run, and monitor sophisticated multi-agent applications.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "agents_and_crews", "label": "Define and Manage Agents", "type": "module", "link": "agents_and_crews.md"},
        {"id": "tasks_and_flow", "label": "Orchestrate Tasks and Flows", "type": "module", "link": "tasks_and_flow.md"},
        {"id": "llm_integration", "label": "Integrate Large Language Models", "type": "module", "link": "llm_integration.md"},
        {"id": "eventing_and_context", "label": "Manage Events and Context", "type": "module", "link": "eventing_and_context.md"},
        {"id": "a2a_communication", "label": "Handle Agent-to-Agent Communication", "type": "module", "link": "a2a_communication.md"}
    ],
    "edges": [
        {"source": "agents_and_crews", "target": "tasks_and_flow", "label": "defines roles for"},
        {"source": "tasks_and_flow", "target": "agents_and_crews", "label": "assigns tasks to"},
        {"source": "agents_and_crews", "target": "llm_integration", "label": "uses LLMs from"},
        {"source": "tasks_and_flow", "target": "llm_integration", "label": "leverages LLMs for steps"},
        {"source": "eventing_and_context", "target": "agents_and_crews", "label": "provides runtime context"},
        {"source": "eventing_and_context", "target": "tasks_and_flow", "label": "tracks flow execution"},
        {"source": "agents_and_crews", "target": "a2a_communication", "label": "enables communication"},
        {"source": "tasks_and_flow", "target": "a2a_communication", "label": "facilitates inter-agent steps"},
        {"source": "a2a_communication", "target": "eventing_and_context", "label": "emits communication events"}
    ],
    "groups": [
        {"id": "core_orchestration", "label": "Core Orchestration", "nodes": ["agents_and_crews", "tasks_and_flow"]},
        {"id": "external_interaction", "label": "External Interaction", "nodes": ["llm_integration", "a2a_communication"]},
        {"id": "system_foundation", "label": "System Foundation", "nodes": ["eventing_and_context"]}
    ]
}
-->

The `crewai_core_framework` module is composed of several interconnected sub-modules that work in concert to provide a comprehensive platform for multi-agent systems:

*   **Agents and Crews**: This module defines the core components for creating and managing AI agents and their collaborative crews. It handles agent definition, lifecycle management, and execution logic. Agents defined here are assigned tasks and roles within a flow.
*   **Tasks and Flow Management**: This module is responsible for defining and orchestrating the execution of individual tasks and the overall flow of AI agent collaborations. It supports conditional logic, human feedback, and persistence, assigning tasks to agents and managing their progression.
*   **LLM Integration**: This module provides robust integrations with various Large Language Models (LLMs) and OpenAI-compatible APIs. It offers a unified interface for agents and flows to interact with LLMs for generating responses, performing actions, and more.
*   **Eventing and Context Management**: This module establishes a robust eventing system, allowing components to emit and subscribe to events. It also manages the execution context, providing flexible lifecycle hooks for custom logic integration and tracking the state and progress of agents and flows.
*   **A2A Communication**: This module manages secure agent-to-agent (A2A) communication, providing authentication, flexible update mechanisms, and extensible configurations. It enables agents to interact seamlessly, facilitating complex inter-agent workflows and emitting events related to communication.

These modules collectively form the backbone of CrewAI, allowing for the creation of dynamic, intelligent, and collaborative AI systems.

### Core Components Documentation

*   [Agents and Crews](agents_and_crews.md)
*   [Tasks and Flow Management](tasks_and_flow.md)
*   [LLM Integration](llm_integration.md)
*   [Eventing and Context Management](eventing_and_context.md)
*   [A2A Communication](a2a_communication.md)