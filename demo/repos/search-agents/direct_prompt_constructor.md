# direct_prompt_constructor Module Documentation

## Introduction

The `direct_prompt_constructor` module provides the `DirectPromptConstructor` class, a specialized component within the agent's prompt generation system. Its primary role is to construct prompts that enable the agent to directly predict an action based on the current observation and intent, without requiring a multi-step Chain-of-Thought (CoT) process.

This module is crucial for scenarios where a direct and concise action prediction is desired, streamlining the agent's decision-making process.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "direct_prompt_constructor_class", "label": "DirectPromptConstructor", "type": "component", "link": null},
        {"id": "construct_method", "label": "construct()", "type": "component", "link": null},
        {"id": "extract_action_method", "label": "_extract_action()", "type": "component", "link": null},
        {"id": "prompt_constructor", "label": "PromptConstructor", "type": "external", "link": "prompt_construction.md"},
        {"id": "lm_config", "label": "LMConfig", "type": "external", "link": "llm_integrations.md"},
        {"id": "tokenizer", "label": "Tokenizer", "type": "external", "link": null},
        {"id": "trajectory_state_info", "label": "Trajectory/StateInfo", "type": "external", "link": "execution_and_testing.md"},
        {"id": "api_input", "label": "APIInput", "type": "external", "link": null},
        {"id": "action_parsing_error", "label": "ActionParsingError", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "direct_prompt_constructor_class", "target": "prompt_constructor"},
        {"source": "direct_prompt_constructor_class", "target": "construct_method"},
        {"source": "direct_prompt_constructor_class", "target": "extract_action_method"},
        {"source": "construct_method", "target": "lm_config"},
        {"source": "construct_method", "target": "tokenizer"},
        {"source": "construct_method", "target": "trajectory_state_info"},
        {"source": "construct_method", "target": "api_input"},
        {"source": "extract_action_method", "target": "action_parsing_error"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    direct_prompt_constructor_class[DirectPromptConstructor]
    construct_method{construct()}
    extract_action_method{_extract_action()}
    action_parsing_error[ActionParsingError]

    prompt_constructor[PromptConstructor]:::external
    lm_config[LMConfig]:::external
    tokenizer[Tokenizer]:::external
    trajectory_state_info[Trajectory/StateInfo]:::external
    api_input[APIInput]:::external

    direct_prompt_constructor_class --> prompt_constructor
    direct_prompt_constructor_class --> construct_method
    direct_prompt_constructor_class --> extract_action_method

    construct_method --> lm_config
    construct_method --> tokenizer
    construct_method --> trajectory_state_info
    construct_method --> api_input

    extract_action_method --> action_parsing_error

    class prompt_constructor,lm_config,tokenizer,trajectory_state_info,api_input external;
```

## Architecture and Component Relationships

The `direct_prompt_constructor` module primarily consists of the `DirectPromptConstructor` class, which extends the base [PromptConstructor](prompt_construction.md). Below is a breakdown of its components and their interactions.

### `DirectPromptConstructor` Class

This class is responsible for generating prompts that lead to direct action predictions from the agent. It takes an instruction path, language model configuration, and a tokenizer during initialization.

#### `__init__(self, instruction_path: str | Path, lm_config: lm_config.LMConfig, tokenizer: Tokenizer)`

The constructor initializes the `DirectPromptConstructor` instance. It calls the constructor of its parent class, [PromptConstructor](prompt_construction.md), passing the `instruction_path`, `lm_config`, and `tokenizer`. This ensures that common prompt construction logic and configurations are inherited.

-   `instruction_path`: Path to the YAML or JSON file containing prompt instructions, examples, and metadata.
-   `lm_config` ([LMConfig](llm_integrations.md)): Configuration object for the language model, including provider and generation settings.
-   `tokenizer`: An instance of a tokenizer used for processing text, especially for handling `max_obs_length`.

#### `construct(self, trajectory: Trajectory, intent: str, meta_data: dict[str, Any] = {}) -> APIInput`

This method is the core logic for building the prompt. It takes the agent's current trajectory, the overall intent, and additional metadata to form a comprehensive prompt.

1.  **Instruction Loading**: It retrieves `intro`, `examples`, `template`, and `keywords` from the loaded instruction set.
2.  **State Information Extraction**: It extracts the latest observation (`obs`), current URL (`url`), and the `previous_action_str` from the provided `trajectory` and `meta_data`.
3.  **Observation Truncation**: If `max_obs_length` is specified in `lm_config`, the observation is truncated. For Google models, truncation is character-based; otherwise, it's token-based using the provided `tokenizer`.
4.  **Prompt Formatting**: The `template` is formatted with the extracted `objective` (intent), `url`, `observation`, and `previous_action`. An assertion ensures all template keywords have been replaced.
5.  **API Input Generation**: Finally, it calls the inherited `get_lm_api_input` method (from [PromptConstructor](prompt_construction.md)) to assemble the final `APIInput` object, which is ready to be sent to the language model.

-   `trajectory` ([Trajectory](execution_and_testing.md)): A sequence of `StateInfo` objects representing the agent's interaction history.
-   `intent`: The high-level goal or objective of the agent.
-   `meta_data`: A dictionary containing additional information, such as `action_history`.
-   Returns: An `APIInput` object configured for the language model.

#### `_extract_action(self, response: str) -> str`

This private helper method is responsible for parsing the language model's raw `response` to extract the predicted action.

1.  **Action Splitting**: It uses a `action_splitter` pattern (defined in the instruction's metadata) to locate and extract the action string from the response using regular expressions.
2.  **Error Handling**: If the action cannot be successfully parsed from the response, an `ActionParsingError` is raised.

-   `response`: The raw string output from the language model.
-   Returns: The extracted action string.
-   Raises: `ActionParsingError` if the action cannot be found or parsed.

## How the Module Fits into the Overall System

The `direct_prompt_constructor` module is a vital part of the `prompt_construction` sub-system, specifically designed for agents that perform direct action prediction. It works in conjunction with other modules:

-   **[Prompt Construction](prompt_construction.md)**: It extends the base `PromptConstructor` class, inheriting core functionalities and ensuring consistency across different prompt construction strategies.
-   **[LLM Integrations](llm_integrations.md)**: It utilizes `LMConfig` objects from the `llm_integrations` module to correctly configure prompt generation based on the target language model (e.g., handling `max_obs_length` differently for Google models).
-   **[Execution and Testing](execution_and_testing.md)**: It consumes `Trajectory` and `StateInfo` objects, which are generated during the agent's execution, to construct context-aware prompts. The `APIInput` it produces is then used by the language model interaction components.

This module provides a streamlined approach for agents that can directly map observations and intent to actions, contributing to the overall efficiency and directness of the agent's reasoning process.