# recursive_language_model

## Introduction

The `recursive_language_model` module introduces the `RLM` (Recursive Language Model) class, a powerful component for Dspy that enables Language Models (LLMs) to programmatically explore and analyze large contexts through code execution within a sandboxed REPL (Read-Eval-Print Loop) environment. This module empowers LLMs to write Python code, interact with sub-LLMs for semantic analysis, and iteratively build up solutions, making it ideal for complex tasks requiring dynamic reasoning and interaction with external data or tools.

## Architecture and Core Functionality

The `RLM` class is designed to integrate an LLM's reasoning capabilities with a code interpreter, allowing for a flexible and interactive problem-solving approach. It manages the lifecycle of the REPL, integrates custom tools, handles input/output processing, and orchestrates the iterative execution process.

### RLM Class

The `RLM` class is the central component of this module. It takes a signature defining its inputs and outputs, and a set of configuration parameters that govern its behavior, such as maximum iterations, LLM call limits, and verbosity.

**Key Features:**

*   **Sandboxed REPL Execution:** Provides a secure environment for LLMs to execute Python code, inspect variables, and interact with the environment.
*   **Tool Integration:** Allows the injection of custom Python functions as tools callable from within the REPL, alongside built-in `llm_query` and `llm_query_batched` for sub-LLM interactions.
*   **Iterative Reasoning:** Facilitates a step-by-step problem-solving process where the LLM can generate code, observe results, and refine its approach over multiple iterations.
*   **Dynamic Signature Building:** Constructs internal `dspy.Predict` signatures for generating code actions and extracting final outputs based on the module's overall signature.
*   **Asynchronous Support:** Offers `aforward` for non-blocking execution, enhancing performance in concurrent applications.

### Component Relationships

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "RLM_Module", "label": "RLM (Recursive Language Model)", "type": "component", "link": null},
        {"id": "SignatureBuilder", "label": "_build_signatures", "type": "component", "link": null},
        {"id": "ToolManagement", "label": "Tool Management (internal)", "type": "component", "link": null},
        {"id": "InterpreterLifecycle", "label": "Interpreter Lifecycle (internal)", "type": "component", "link": null},
        {"id": "ExecutionCore", "label": "Execution Core (internal)", "type": "component", "link": null},
        {"id": "IO_Processing", "label": "Input/Output Processing (internal)", "type": "component", "link": null},
        {"id": "AsyncExecution", "label": "Asynchronous Execution (internal)", "type": "component", "link": null},
        {"id": "PredictionModule", "label": "generate_action, extract (dspy.Predict instances)", "type": "component", "link": null},
        {"id": "dspy_primitives", "label": "dspy_primitives", "type": "external", "link": "dspy_primitives.md"},
        {"id": "dspy_clients", "label": "dspy_clients", "type": "external", "link": "dspy_clients.md"},
        {"id": "dspy_adapters", "label": "dspy_adapters", "type": "external", "link": "dspy_adapters.md"},
        {"id": "dspy_signatures", "label": "dspy_signatures", "type": "external", "link": "dspy_signatures.md"}
    ],
    "edges": [
        {"source": "RLM_Module", "target": "SignatureBuilder"},
        {"source": "RLM_Module", "target": "ToolManagement"},
        {"source": "RLM_Module", "target": "InterpreterLifecycle"},
        {"source": "RLM_Module", "target": "ExecutionCore"},
        {"source": "RLM_Module", "target": "IO_Processing"},
        {"source": "RLM_Module", "target": "AsyncExecution"},
        {"source": "RLM_Module", "target": "PredictionModule"},
        {"source": "SignatureBuilder", "target": "dspy_signatures"},
        {"source": "ToolManagement", "target": "dspy_adapters"},
        {"source": "ToolManagement", "target": "dspy_clients"},
        {"source": "ExecutionCore", "target": "dspy_primitives"},
        {"source": "ExecutionCore", "target": "PredictionModule"},
        {"source": "PredictionModule", "target": "dspy_primitives"},
        {"source": "InterpreterLifecycle", "target": "dspy_primitives"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    RLM_Module[RLM (Recursive Language Model)]
    SignatureBuilder[_build_signatures]
    ToolManagement[Tool Management (internal)]
    InterpreterLifecycle[Interpreter Lifecycle (internal)]
    ExecutionCore[Execution Core (internal)]
    IO_Processing[Input/Output Processing (internal)]
    AsyncExecution[Asynchronous Execution (internal)]
    PredictionModule[generate_action, extract (dspy.Predict instances)]
    dspy_primitives[dspy_primitives]
    dspy_clients[dspy_clients]
    dspy_adapters[dspy_adapters]
    dspy_signatures[dspy_signatures]

    RLM_Module --> SignatureBuilder
    RLM_Module --> ToolManagement
    RLM_Module --> InterpreterLifecycle
    RLM_Module --> ExecutionCore
    RLM_Module --> IO_Processing
    RLM_Module --> AsyncExecution
    RLM_Module --> PredictionModule
    SignatureBuilder --> dspy_signatures
    ToolManagement --> dspy_adapters
    ToolManagement --> dspy_clients
    ExecutionCore --> dspy_primitives
    ExecutionCore --> PredictionModule
    PredictionModule --> dspy_primitives
    InterpreterLifecycle --> dspy_primitives
```

### How RLM Fits into the Overall System

The `recursive_language_model` module, particularly the `RLM` class, serves as a sophisticated agent strategy within the `dspy.predict.agent_strategies` ecosystem. It enables LLMs to go beyond simple text generation by empowering them with programmatic execution capabilities. This is crucial for tasks that require:

*   **Complex Data Exploration:** Analyzing large documents, databases, or APIs by writing and executing code to retrieve, process, and summarize information.
*   **Multi-Step Reasoning:** Breaking down complex problems into smaller, manageable steps, each potentially involving code execution and sub-LLM calls.
*   **Tool Use:** Integrating external tools and services directly into the LLM's reasoning process, expanding its capabilities beyond its core language understanding.
*   **Interactive Problem Solving:** Adapting its approach based on the output of executed code, mimicking a human developer's iterative debugging and refinement process.

`RLM` leverages other Dspy modules:

*   **dspy_primitives**: Provides the `Module` base class for `RLM` itself, as well as `REPLVariable` for managing variables within the REPL environment. The `dspy.Predict` instances (`generate_action`, `extract`) are also built upon the `Module` primitive. See [dspy_primitives.md](dspy_primitives.md) for more details.
*   **dspy_clients**: The `llm_query` and `llm_query_batched` tools, which allow the RLM to call sub-LLMs, depend on the Language Model (LM) configurations managed by `dspy_clients`. See [dspy_clients.md](dspy_clients.md) for more details.
*   **dspy_adapters**: User-provided tools are normalized and validated using `dspy.Tool` objects, which are part of the `dspy_adapters` module. See [dspy_adapters.md](dspy_adapters.md) for more details.
*   **dspy_signatures**: The `RLM` module dynamically builds internal `dspy.Signature` objects to define the inputs and outputs for its code generation and extraction steps. See [dspy_signatures.md](dspy_signatures.md) for more details.

By combining these elements, `RLM` provides a powerful framework for building intelligent agents that can engage in complex, programmatic reasoning, making it a key component for advanced AI applications within Dspy.