# crew_ai_platform_tool
The `crew_ai_platform_tool` module defines `CrewAIPlatformActionTool`, a class for executing actions on the CrewAI platform. It dynamically generates tool schemas from action definitions and manages API calls, authentication, and response processing.

<!-- DIAGRAM_JSON
{
    "nodes": [
        {
            "id": "CrewAIPlatformActionTool",
            "label": "CrewAIPlatformActionTool",
            "type": "class"
        },
        {
            "id": "BaseTool",
            "label": "BaseTool",
            "type": "class"
        },
        {
            "id": "create_model_from_schema",
            "label": "create_model_from_schema",
            "type": "function"
        },
        {
            "id": "create_model",
            "label": "create_model",
            "type": "function"
        },
        {
            "id": "get_platform_api_base_url",
            "label": "get_platform_api_base_url",
            "type": "function"
        },
        {
            "id": "get_platform_integration_token",
            "label": "get_platform_integration_token",
            "type": "function"
        },
        {
            "id": "requests_post",
            "label": "requests.post",
            "type": "function"
        },
        {
            "id": "json_lib",
            "label": "json",
            "type": "library"
        },
        {
            "id": "os_lib",
            "label": "os",
            "type": "library"
        }
    ],
    "edges": [
        {
            "source": "CrewAIPlatformActionTool",
            "target": "BaseTool",
            "label": "inherits"
        },
        {
            "source": "CrewAIPlatformActionTool",
            "target": "create_model_from_schema",
            "label": "uses (init)"
        },
        {
            "source": "CrewAIPlatformActionTool",
            "target": "create_model",
            "label": "uses (init)"
        },
        {
            "source": "CrewAIPlatformActionTool",
            "target": "get_platform_api_base_url",
            "label": "calls (run)"
        },
        {
            "source": "CrewAIPlatformActionTool",
            "target": "get_platform_integration_token",
            "label": "calls (run)"
        },
        {
            "source": "CrewAIPlatformActionTool",
            "target": "requests_post",
            "label": "calls (run)"
        },
        {
            "source": "CrewAIPlatformActionTool",
            "target": "json_lib",
            "label": "uses (run)"
        },
        {
            "source": "CrewAIPlatformActionTool",
            "target": "os_lib",
            "label": "uses (run)"
        }
    ],
    "groups": [
        {
            "id": "crew_ai_platform_tool",
            "label": "crew_ai_platform_tool",
            "nodes": [
                "CrewAIPlatformActionTool"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph crew_ai_platform_tool["CrewAI Platform Tool"]
        CrewAIPlatformActionTool["CrewAIPlatformActionTool"]
    end

    CrewAIPlatformActionTool -->|"inherits"| BaseTool["BaseTool"]
    CrewAIPlatformActionTool -->|"uses (init)"| create_model_from_schema["create_model_from_schema"]
    CrewAIPlatformActionTool -->|"uses (init)"| create_model["create_model"]
    CrewAIPlatformActionTool -->|"calls (run)"| get_platform_api_base_url["get_platform_api_base_url"]
    CrewAIPlatformActionTool -->|"calls (run)"| get_platform_integration_token["get_platform_integration_token"]
    CrewAIPlatformActionTool -->|"calls (run)"| requests_post["requests.post"]
    CrewAIPlatformActionTool -->|"uses (run)"| json_lib["json"]
    CrewAIPlatformActionTool -->|"uses (run)"| os_lib["os"]

    classDef nodeClass fill:#D2E5FF,stroke:#0066FF,stroke-width:2px;
    classDef nodeFunction fill:#D4EDDA,stroke:#28A745,stroke-width:2px;
    classDef nodeLibrary fill:#FFF3CD,stroke:#FFC107,stroke-width:2px;

    class CrewAIPlatformActionTool,BaseTool nodeClass
    class create_model_from_schema,create_model,get_platform_api_base_url,get_platform_integration_token,requests_post nodeFunction
    class json_lib,os_lib nodeLibrary
```