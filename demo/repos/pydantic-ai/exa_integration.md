The `exa_integration` module provides a powerful and efficient way to integrate Exa's search capabilities into AI agents. It does this through the `ExaToolset`, which centralizes the management of various Exa tools and ensures optimal resource usage by sharing a single Exa API client across them. This module is essential for agents requiring robust web search and content retrieval functionalities.

### **Exa Integration Module**

The `exa_integration` module facilitates seamless interaction with the Exa.ai search API. Its primary component, `ExaToolset`, acts as a consolidated interface for creating and managing different Exa-powered tools, such as searching, finding similar content, retrieving document contents, and answering questions. By encapsulating these functionalities within a single toolset, it streamlines development and enhances performance for AI agents that rely on Exa for information gathering.

#### **Key Features:**

*   **Shared Client for Efficiency:** The `ExaToolset` initializes a single `AsyncExa` client, which is then reused by all Exa tools within the toolset. This significantly reduces overhead and improves efficiency compared to creating individual clients for each tool.
*   **Configurable Tools:** Users can enable or disable specific Exa tools (search, find similar, get contents, answer) based on their agent's requirements, allowing for flexible and tailored integrations.
*   **Result Customization:** Parameters like `num_results` and `max_characters` provide fine-grained control over the volume and length of the search results, helping to manage token usage and focus on relevant information.
*   **Simplified Agent Integration:** Designed to be easily integrated into `pydantic_ai` agents by simply passing an `ExaToolset` instance to the agent's toolsets.

#### **Core Components**

##### `ExaToolset`

The `ExaToolset` class is the central component of this module. It inherits from `FunctionToolset` (refer to [toolset_management.md](toolset_management.md) for more details on toolsets) and is responsible for:

1.  **Initializing the Exa API Client:** Upon instantiation, it creates an `AsyncExa` client using the provided API key.
2.  **Tool Creation:** It dynamically creates and configures individual Exa tools (e.g., `exa_search_tool`, `exa_find_similar_tool`) based on the constructor parameters. These tools then share the single `AsyncExa` client.
3.  **Tool Management:** It bundles these configured tools into a `FunctionToolset`, making them readily available for use by an AI agent.

**Example Usage:**

```python
from pydantic_ai import Agent
from pydantic_ai.common_tools.exa import ExaToolset

# Initialize the ExaToolset with your API key
# You can get one by signing up at https://dashboard.exa.ai
toolset = ExaToolset(api_key='your-api-key', num_results=3, include_get_contents=True)

# Create an agent and provide the ExaToolset
agent = Agent('openai:gpt-5.2', toolsets=[toolset])

# Now the agent can use the 'search', 'find_similar', 'get_contents', and 'answer' tools
# if they were enabled during toolset initialization.
```

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "ExaToolset_component",
            "label": "ExaToolset",
            "type": "component",
            "link": null
        },
        {
            "id": "FunctionToolset_ext",
            "label": "FunctionToolset (from Toolset Management)",
            "type": "external",
            "link": "toolset_management.md"
        },
        {
            "id": "AsyncExa_ext",
            "label": "Exa.ai API Client (AsyncExa)",
            "type": "external",
            "link": "https://pypi.org/project/exa-py/"
        },
        {
            "id": "create_search_tool",
            "label": "Create Exa Search Tool (exa_search_tool)",
            "type": "component",
            "link": null
        },
        {
            "id": "create_find_similar_tool",
            "label": "Create Exa Find Similar Tool (exa_find_similar_tool)",
            "type": "component",
            "link": null
        },
        {
            "id": "create_get_contents_tool",
            "label": "Create Exa Get Contents Tool (exa_get_contents_tool)",
            "type": "component",
            "link": null
        },
        {
            "id": "create_answer_tool",
            "label": "Create Exa Answer Tool (exa_answer_tool)",
            "type": "component",
            "link": null
        }
    ],
    "edges": [
        {
            "source": "ExaToolset_component",
            "target": "FunctionToolset_ext",
            "label": "inherits from"
        },
        {
            "source": "ExaToolset_component",
            "target": "AsyncExa_ext",
            "label": "initializes with API key"
        },
        {
            "source": "ExaToolset_component",
            "target": "create_search_tool",
            "label": "configures & instantiates if enabled"
        },
        {
            "source": "ExaToolset_component",
            "target": "create_find_similar_tool",
            "label": "configures & instantiates if enabled"
        },
        {
            "source": "ExaToolset_component",
            "target": "create_get_contents_tool",
            "label": "configures & instantiates if enabled"
        },
        {
            "source": "ExaToolset_component",
            "target": "create_answer_tool",
            "label": "configures & instantiates if enabled"
        },
        {
            "source": "create_search_tool",
            "target": "AsyncExa_ext",
            "label": "uses client"
        },
        {
            "source": "create_find_similar_tool",
            "target": "AsyncExa_ext",
            "label": "uses client"
        },
        {
            "source": "create_get_contents_tool",
            "target": "AsyncExa_ext",
            "label": "uses client"
        },
        {
            "source": "create_answer_tool",
            "target": "AsyncExa_ext",
            "label": "uses client"
        }
    ],
    "groups": [
        {
            "id": "exa_tool_creation",
            "label": "Exa Tool Creation Process",
            "role": "analytical",
            "nodes": [
                "create_search_tool",
                "create_find_similar_tool",
                "create_get_contents_tool",
                "create_answer_tool"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    %% Module Components
    ExaToolset_component["ExaToolset"]

    %% External Dependencies
    FunctionToolset_ext["FunctionToolset (from Toolset Management)"]
    AsyncExa_ext["Exa.ai API Client (AsyncExa)"]

    %% Internal Helper Components/Functions
    subgraph exa_tool_creation["Exa Tool Creation Process"]
        create_search_tool["Create Exa Search Tool (exa_search_tool)"]
        create_find_similar_tool["Create Exa Find Similar Tool (exa_find_similar_tool)"]
        create_get_contents_tool["Create Exa Get Contents Tool (exa_get_contents_tool)"]
        create_answer_tool["Create Exa Answer Tool (exa_answer_tool)"]
    end

    %% Relationships
    ExaToolset_component --|> FunctionToolset_ext: "inherits from"
    ExaToolset_component --> AsyncExa_ext: "initializes with API key"
    ExaToolset_component --> create_search_tool: "configures & instantiates if enabled"
    ExaToolset_component --> create_find_similar_tool: "configures & instantiates if enabled"
    ExaToolset_component --> create_get_contents_tool: "configures & instantiates if enabled"
    ExaToolset_component --> create_answer_tool: "configures & instantiates if enabled"

    create_search_tool -.-> AsyncExa_ext: "uses client"
    create_find_similar_tool -.-> AsyncExa_ext: "uses client"
    create_get_contents_tool -.-> AsyncExa_ext: "uses client"
    create_answer_tool -.-> AsyncExa_ext: "uses client"

    %% Links for external dependencies
    click FunctionToolset_ext "toolset_management.md"
    click AsyncExa_ext "https://pypi.org/project/exa-py/"
```

#### **How it Connects to the Rest of the System**

The `exa_integration` module primarily interacts with:

*   **`toolset_management` module**: `ExaToolset` extends `FunctionToolset`, integrating Exa's capabilities into the broader tool management system of the `pydantic_ai_agent_core`. This allows agents to discover and utilize Exa tools like any other registered tool.
*   **AI Agents**: Agents (defined in modules like `agent_definition`) consume `ExaToolset` instances. By providing an `ExaToolset` during agent initialization, the agent gains the ability to perform searches, retrieve web content, and answer questions using Exa's powerful API.
*   **External Exa.ai API**: The module directly communicates with the Exa.ai service through the `AsyncExa` client to execute search queries and retrieve data.

This integration point ensures that agents have a robust and efficient mechanism for accessing external web knowledge, significantly enhancing their ability to respond to information-seeking queries.