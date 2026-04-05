# pii_handling

The `pii_handling` module provides a robust middleware for detecting and managing Personally Identifiable Information (PII) within conversational agents. This module ensures that sensitive data, such as email addresses, credit card numbers, IP addresses, MAC addresses, and URLs, can be handled according to predefined strategies like blocking, redaction, masking, or hashing. It integrates seamlessly into an agent's lifecycle, processing messages both before and after model invocation, and also handling tool results.

## Architecture and Component Relationships

The `pii_handling` module primarily consists of the `PIIMiddleware` class, which acts as the central orchestrator for PII detection and remediation. It interacts with the core messaging components to access and modify conversational content.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "pii_middleware", "label": "PIIMiddleware", "type": "component", "link": null},
        {"id": "before_model", "label": "before_model (hook)", "type": "component", "link": null},
        {"id": "after_model", "label": "after_model (hook)", "type": "component", "link": null},
        {"id": "process_content", "label": "_process_content", "type": "component", "link": null},
        {"id": "core_messages", "label": "Core Messages", "type": "external", "link": "core_messages.md"},
        {"id": "agent_middleware", "label": "Agent Middleware Framework", "type": "external", "link": "langchain_v1_agents_middleware.md"}
    ],
    "edges": [
        {"source": "agent_middleware", "target": "pii_middleware"},
        {"source": "pii_middleware", "target": "before_model"},
        {"source": "pii_middleware", "target": "after_model"},
        {"source": "before_model", "target": "process_content"},
        {"source": "after_model", "target": "process_content"},
        {"source": "before_model", "target": "core_messages"},
        {"source": "after_model", "target": "core_messages"},
        {"source": "process_content", "target": "core_messages"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    agent_middleware[Agent Middleware Framework] --> pii_middleware[PIIMiddleware]
    pii_middleware --> before_model[before_model (hook)]
    pii_middleware --> after_model[after_model (hook)]
    before_model --> process_content[_process_content]
    after_model --> process_content[_process_content]
    before_model --> core_messages[Core Messages]
    after_model --> core_messages[Core Messages]
    process_content --> core_messages[Core Messages]
    click agent_middleware "langchain_v1_agents_middleware.md"
    click core_messages "core_messages.md"
```

### Core Functionality

The `PIIMiddleware` class is the sole core component of this module, providing comprehensive PII handling capabilities.

#### PIIMiddleware

- **Purpose**: A middleware class designed to detect and apply various strategies to Personally Identifiable Information (PII) found in conversational exchanges within an agent.
- **Location**: `libs.langchain_v1.langchain.agents.middleware.pii.PIIMiddleware`

- **Key Features**:
    - **PII Detection**: Identifies common PII types including email addresses, credit card numbers, IP addresses, MAC addresses, and URLs. It also supports custom PII types defined by regex patterns or callable detectors.
    - **Configurable Strategies**: Offers four distinct strategies for handling detected PII:
        - `block`: Raises a `PIIDetectionError`, preventing the sensitive information from proceeding.
        - `redact`: Replaces the PII with a generic `[REDACTED_TYPE]` placeholder.
        - `mask`: Partially obscures the PII, revealing only a portion (e.g., last four digits of a credit card).
        - `hash`: Replaces the PII with a deterministic hash, allowing for pseudonymous tracking or analytics.
    - **Application Scope**: Can be configured to apply PII detection and handling to:
        - User input messages (`apply_to_input`).
        - Agent output messages (`apply_to_output`).
        - Results from tool executions (`apply_to_tool_results`).
    - **Integration**: Implements `before_model`, `abefore_model`, `after_model`, and `aafter_model` hooks from the agent middleware framework to intercept and process messages at different stages of an agent's operation.

- **Dependencies**:
    - Relies on the broader [Agent Middleware Framework](langchain_v1_agents_middleware.md) for its lifecycle hooks and integration.
    - Interacts with [Core Messages](core_messages.md) to access and modify message content, including `HumanMessage`, `AIMessage`, and `ToolMessage` types.

- **Usage Example (from component code)**:

    ```python
    from langchain.agents.middleware import PIIMiddleware
    from langchain.agents import create_agent

    # Redact all emails in user input
    agent = create_agent(
        "openai:gpt-5",
        middleware=[
            PIIMiddleware("email", strategy="redact"),
        ],
    )

    # Use different strategies for different PII types
    agent = create_agent(
        "openai:gpt-4o",
        middleware=[
            PIIMiddleware("credit_card", strategy="mask"),
            PIIMiddleware("url", strategy="redact"),
            PIIMiddleware("ip", strategy="hash"),
        ],
    )

    # Custom PII type with regex
    agent = create_agent(
        "openai:gpt-5",
        middleware=[
            PIIMiddleware("api_key", detector=r"sk-[a-zA-Z0-9]{32}", strategy="block"),
        ],
    )
    ```

## How the Module Fits into the Overall System

The `pii_handling` module plays a crucial role in enhancing the security and compliance of conversational AI systems. By providing a flexible and configurable mechanism for PII detection and handling, it allows developers to build agents that respect user privacy and adhere to data protection regulations. It acts as a gatekeeper for sensitive information, preventing its unwarranted exposure or processing throughout the agent's operation. Its integration within the broader [Agent Middleware Framework](langchain_v1_agents_middleware.md) ensures that PII handling can be applied consistently across various agent types and conversational flows.
