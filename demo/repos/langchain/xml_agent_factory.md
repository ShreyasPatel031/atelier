# xml_agent_factory

The `xml_agent_factory` module is responsible for constructing agents that leverage XML for defining their interaction logic. It provides a straightforward way to create agents that can parse and generate XML-formatted actions and observations, making them suitable for scenarios where structured textual communication is preferred or required.

## Purpose and Core Functionality

The primary purpose of this module is to offer the `create_xml_agent` function, which serves as a factory for instantiating XML-based agents. These agents are designed to process natural language inputs, determine appropriate tools to use, execute those tools, and then formulate a final answer, all while adhering to an XML-based communication protocol.

### `create_xml_agent` Function

```python
def create_xml_agent(
    llm: BaseLanguageModel,
    tools: Sequence[BaseTool],
    prompt: BasePromptTemplate,
    tools_renderer: ToolsRenderer = render_text_description,
    *,
    stop_sequence: bool | list[str] = True,
) -> Runnable:
    # ... function implementation ...
```

This function constructs and returns a `Runnable` sequence that represents an XML agent. It orchestrates the flow from initial input to tool execution and final response generation. Key features include:

*   **LLM Integration**: Utilizes a provided `BaseLanguageModel` for reasoning and generating XML-formatted actions.
*   **Tool Utilization**: Grants the agent access to a collection of `BaseTool` instances, which it can invoke based on its reasoning.
*   **Prompt Engineering**: Employs a `BasePromptTemplate` to guide the LLM's behavior, ensuring it understands the XML structure for actions (`<tool>tool_name</tool><tool_input>input</tool_input>`) and observations (`<observation>output</observation>`).
*   **XML Output Parsing**: Automatically handles the parsing of the LLM's XML output to extract tool calls and observations.
*   **Stop Sequence Handling**: Can be configured with stop sequences to prevent the LLM from generating excessive output, specifically looking for `</tool_input>` by default.

#### Parameters

*   `llm` ([BaseLanguageModel](core_language_models.md)): The language model that will power the agent's decision-making and text generation.
*   `tools` (Sequence[[BaseTool](core_tools.md)]): A list of callable tools that the agent can utilize to perform actions.
*   `prompt` ([BasePromptTemplate](core_prompts.md)): The prompt template that defines the agent's persona, instructions, and the expected XML format for interaction.
    *   **Required input keys**: `tools` (for tool descriptions) and `agent_scratchpad` (for recording previous actions and observations).
*   `tools_renderer` (ToolsRenderer, default: [render_text_description](classic_tools.md)): A function responsible for converting the provided `tools` into a string format suitable for inclusion in the prompt.
*   `stop_sequence` (bool | list[str], default: `True`): Defines the stop tokens for the LLM. If `True`, `</tool_input>` is used. If `False`, no stop tokens are applied. A custom list of strings can also be provided.

#### Returns

A `Runnable` sequence that represents the XML agent. This runnable takes the same input variables as the provided prompt and returns either an `AgentAction` (indicating a tool call) or an `AgentFinish` (indicating a final answer).

## Architecture and Component Relationships

The `create_xml_agent` function orchestrates several internal and external components to construct the XML agent's execution flow. The agent operates as a `Runnable` sequence, processing input through a series of steps:

1.  **Prompt Preparation**: The input prompt is partially formatted with the rendered tool descriptions.
2.  **Scratchpad Formatting**: The `agent_scratchpad` (containing intermediate steps, i.e., previous tool actions and observations) is formatted into an XML string using the `format_xml` utility.
3.  **LLM Invocation**: The prepared prompt is passed to the language model (`llm`), which generates a response in XML format.
4.  **Output Parsing**: The `XMLAgentOutputParser` is used to interpret the LLM's XML output, extracting tool calls or the final answer.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "create_xml_agent_func", "label": "create_xml_agent", "type": "component", "link": null},
        {"id": "format_xml_utility", "label": "format_xml (utility)", "type": "component", "link": null},
        {"id": "xml_output_parser_component", "label": "XMLAgentOutputParser", "type": "component", "link": null},
        {"id": "llm", "label": "BaseLanguageModel", "type": "external", "link": "core_language_models.md"},
        {"id": "tools", "label": "BaseTool", "type": "external", "link": "core_tools.md"},
        {"id": "prompt", "label": "BasePromptTemplate", "type": "external", "link": "core_prompts.md"},
        {"id": "render_text_description_function", "label": "render_text_description", "type": "external", "link": "classic_tools.md"},
        {"id": "runnable_passthrough_assign", "label": "RunnablePassthrough.assign", "type": "external", "link": "passthrough_runnables.md"}
    ],
    "edges": [
        {"source": "create_xml_agent_func", "target": "format_xml_utility"},
        {"source": "create_xml_agent_func", "target": "xml_output_parser_component"},
        {"source": "create_xml_agent_func", "target": "llm"},
        {"source": "create_xml_agent_func", "target": "tools"},
        {"source": "create_xml_agent_func", "target": "prompt"},
        {"source": "create_xml_agent_func", "target": "render_text_description_function"},
        {"source": "create_xml_agent_func", "target": "runnable_passthrough_assign"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    create_xml_agent_func[create_xml_agent]
    format_xml_utility[format_xml (utility)]
    xml_output_parser_component[XMLAgentOutputParser]
    llm[BaseLanguageModel]
    tools[BaseTool]
    prompt[BasePromptTemplate]
    render_text_description_function[render_text_description]
    runnable_passthrough_assign[RunnablePassthrough.assign]

    create_xml_agent_func --> format_xml_utility
    create_xml_agent_func --> xml_output_parser_component
    create_xml_agent_func --> llm
    create_xml_agent_func --> tools
    create_xml_agent_func --> prompt
    create_xml_agent_func --> render_text_description_function
    create_xml_agent_func --> runnable_passthrough_assign
```

## How it Fits into the Overall System

The `xml_agent_factory` module is a crucial part of the [classic_agents](classic_agents.md) ecosystem, specifically within the [structured_agents](structured_agents.md) category and its [xml_agents](xml_agents.md) sub-module. It provides a specialized agent construction mechanism for scenarios where XML is the desired format for agent-tool interaction. This module enables developers to rapidly deploy agents that can engage in complex reasoning and tool use, with a clear and structured communication protocol defined by XML tags.

By leveraging components from [core_language_models](core_language_models.md), [core_tools](core_tools.md), and [core_prompts](core_prompts.md), `xml_agent_factory` integrates seamlessly with the broader LangChain framework, allowing for flexible and powerful agent design. Its output as a `Runnable` makes it compatible with the LangChain Expression Language (LCEL), facilitating the creation of custom, chained agent workflows. This allows XML agents to be easily incorporated into larger applications, contributing to the system's overall ability to handle diverse and structured conversational AI tasks.