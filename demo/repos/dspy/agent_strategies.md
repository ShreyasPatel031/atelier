# Agent Strategies Module

## Introduction

The `agent_strategies` module in DSPy provides a collection of advanced prompting strategies that empower language models to perform complex tasks by breaking them down into actionable steps, using tools, or engaging in recursive problem-solving. These strategies enhance the capabilities of standard prediction models by introducing iterative reasoning, tool utilization, and code execution.

## Architecture Overview

This module is structured into several sub-modules, each implementing a distinct agent strategy. The relationships and dependencies between these strategies are illustrated in the diagram below:

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "avatar_agent", "label": "Avatar Agent", "type": "module", "link": "avatar_agent.md"},
        {"id": "react_based_agents", "label": "ReAct and CodeAct Agents", "type": "module", "link": "react_based_agents.md"},
        {"id": "recursive_language_model", "label": "Recursive Language Model (RLM)", "type": "module", "link": "recursive_language_model.md"}
    ],
    "edges": [
        {"source": "react_based_agents", "target": "avatar_agent"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    avatar_agent[Avatar Agent]
    react_based_agents[ReAct and CodeAct Agents]
    recursive_language_model[Recursive Language Model (RLM)]

    react_based_agents --> avatar_agent

    click avatar_agent "avatar_agent.md" "View Avatar Agent Documentation"
    click react_based_agents "react_based_agents.md" "View ReAct and CodeAct Agents Documentation"
    click recursive_language_model "recursive_language_model.md" "View Recursive Language Model (RLM) Documentation"
```

## Sub-modules

### [Avatar Agent](avatar_agent.md)

This sub-module introduces the `Avatar` agent, a strategy designed for iterative tool selection and execution. It leverages a defined signature to guide the agent's actions, ensuring structured outputs for complex tasks.

### [ReAct and CodeAct Agents](react_based_agents.md)

The `react_based_agents` sub-module encompasses the ReAct (Reasoning and Acting) paradigm, a powerful approach for tool-using language models. It also includes `CodeAct`, an extension of ReAct that integrates a Python interpreter, allowing the agent to execute code snippets for more dynamic problem-solving.

### [Recursive Language Model (RLM)](recursive_language_model.md)

The `recursive_language_model` sub-module provides the `RLM` strategy, which enables programmatic exploration of large contexts. By utilizing a sandboxed REPL, the RLM allows LLMs to write and execute Python code, call other sub-LLMs for semantic analysis, and iteratively construct answers.
