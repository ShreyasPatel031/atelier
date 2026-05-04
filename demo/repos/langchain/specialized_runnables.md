## Specialized Runnables

This module provides advanced runnable implementations, including managing conversational history, transparently passing and modifying inputs, integrating with the LangChain Hub for shared runnables, and routing execution based on OpenAI function calls.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "history_runnable",
            "label": "Runnable With Message History",
            "type": "component",
            "link": null
        },
        {
            "id": "passthrough_runnable",
            "label": "Runnable Passthrough",
            "type": "component",
            "link": null
        },
        {
            "id": "hub_runnable",
            "label": "Hub Runnable",
            "type": "component",
            "link": null
        },
        {
            "id": "openai_router",
            "label": "OpenAI Functions Router",
            "type": "component",
            "link": null
        },
        {
            "id": "runnable_framework",
            "label": "Runnable Framework",
            "type": "external",
            "link": "runnable_framework.md"
        },
        {
            "id": "chat_history",
            "label": "Chat Message History",
            "type": "external",
            "link": "messages_and_history.md"
        },
        {
            "id": "langchain_hub",
            "label": "LangChain Hub",
            "type": "external",
            "link": null
        },
        {
            "id": "llm_function_calls",
            "label": "LLM Function Calls",
            "type": "external",
            "link": "language_model_interface.md"
        }
    ],
    "edges": [
        {
            "source": "history_runnable",
            "target": "runnable_framework",
            "label": "wraps/extends"
        },
        {
            "source": "history_runnable",
            "target": "chat_history",
            "label": "manages conversation context"
        },
        {
            "source": "passthrough_runnable",
            "target": "runnable_framework",
            "label": "modifies/passes through data"
        },
        {
            "source": "hub_runnable",
            "target": "langchain_hub",
            "label": "loads runnables from"
        },
        {
            "source": "hub_runnable",
            "target": "runnable_framework",
            "label": "instantiates/executes"
        },
        {
            "source": "openai_router",
            "target": "llm_function_calls",
            "label": "routes based on"
        },
        {
            "source": "openai_router",
            "target": "runnable_framework",
            "label": "dispatches to"
        }
    ],
    "groups": [
        {
            "id": "specialized_implementations",
            "label": "Specialized Runnable Implementations",
            "role": "analytical",
            "nodes": [
                "history_runnable",
                "passthrough_runnable",
                "hub_runnable",
                "openai_router"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph specialized_implementations["Specialized Runnable Implementations"]
        history_runnable["Runnable With Message History"]
        passthrough_runnable["Runnable Passthrough"]
        hub_runnable["Hub Runnable"]
        openai_router["OpenAI Functions Router"]
    end

    runnable_framework["Runnable Framework"]
    chat_history["Chat Message History"]
    langchain_hub["LangChain Hub"]
    llm_function_calls["LLM Function Calls"]

    history_runnable -->|"wraps/extends"| runnable_framework
    history_runnable ==>|"manages conversation context"| chat_history
    passthrough_runnable -->|"modifies/passes through data"| runnable_framework
    hub_runnable ==>|"loads runnables from"| langchain_hub
    hub_runnable -->|"instantiates/executes"| runnable_framework
    openai_router ==>|"routes based on"| llm_function_calls
    openai_router -->|"dispatches to"| runnable_framework

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    class history_runnable,passthrough_runnable,hub_runnable,openai_router analytical

    click runnable_framework "runnable_framework.md" "View Runnable Framework"
    click chat_history "messages_and_history.md" "View Messages and History"
    click llm_function_calls "language_model_interface.md" "View Language Model Interface"
```