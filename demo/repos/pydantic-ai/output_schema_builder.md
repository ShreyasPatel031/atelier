# output_schema_builder Module Documentation

The `output_schema_builder` module is a core component within the `pydantic_ai_agent_core` system, specifically responsible for defining and constructing `OutputSchema` objects. These schemas dictate how an AI agent's responses should be structured, processed, and validated, supporting various output formats including plain text, structured objects, tool calls, and even images or deferred tool requests.

## Purpose and Core Functionality

The primary purpose of the `output_schema_builder` module is to provide a flexible and robust mechanism for developers to specify the expected output of an AI agent. At its heart is the `OutputSchema` class, an abstract base class that serves as a blueprint for different output handling strategies. It enables the system to:

*   **Define Output Types**: Allow agents to specify outputs as strings, Pydantic models, tool calls, or a combination thereof.
*   **Handle Complex Output Scenarios**: Support scenarios like deferred tool execution, binary image outputs, and native or prompted outputs.
*   **Process and Validate Outputs**: Integrate with text and object processors, and toolsets to ensure outputs conform to the defined schema.
*   **Build Concrete Output Schemas**: Provide a `build` method that intelligently constructs the appropriate concrete `OutputSchema` subclass based on the provided output specification.

This module is crucial for ensuring that AI agent responses are well-defined, predictable, and can be seamlessly integrated into downstream processes or user interfaces.

## Architecture and Component Relationships

The `output_schema_builder` module primarily revolves around the `OutputSchema` abstract base class and its associated helper methods.

### OutputSchema

The `OutputSchema` class is a generic abstract base class that defines the interface for all output schema types. It encapsulates the logic for determining the output mode and handling different processing components.

**Key Properties and Methods:**

*   **`text_processor`**: An optional `BaseOutputProcessor` instance responsible for processing text-based outputs.
*   **`toolset`**: An optional `OutputToolset` instance, which manages and validates tool calls made by the agent.
*   **`object_def`**: An optional `OutputObjectDefinition` for structured object outputs.
*   **`allows_deferred_tools`**: A boolean flag indicating if the schema permits deferred tool requests.
*   **`allows_image`**: A boolean flag indicating if the schema allows binary image outputs.
*   **`mode`**: An abstract property that concrete `OutputSchema` subclasses must implement to declare their output mode (e.g., `TEXT`, `TOOL`, `NATIVE`, `PROMPTED`, `AUTO`).
*   **`allows_text`**: A read-only property that returns `True` if a `text_processor` is configured.
*   **`build(output_spec, name, description, strict)`**: A class method that serves as the main entry point for constructing an `OutputSchema`. It intelligently parses the `output_spec` (which can be a single type, a union of types, or specific output markers like `NativeOutput` or `PromptedOutput`) and returns an appropriate concrete `OutputSchema` implementation (e.g., `TextOutputSchema`, `ToolOutputSchema`, `NativeOutputSchema`, `PromptedOutputSchema`, `AutoOutputSchema`, `ImageOutputSchema`). This method handles the complexities of combining different output types and flags like `DeferredToolRequests` and `_messages.BinaryImage`.
*   **`_build_processor(outputs, name, description, strict)`**: A static helper method used by `build` to construct `BaseObjectOutputProcessor` instances. Depending on whether a single object type or a union of types is specified, it returns either an `ObjectOutputProcessor` or a `UnionOutputProcessor`.

### Relationship with other components:

*   **[output_toolset_management](output_toolset_management.md)**: The `OutputSchema` interacts closely with `OutputToolset` for handling and validating tool-related outputs. The `build` method delegates the creation of the `toolset` to `OutputToolset.build()`.
*   **[pydantic_ai_agent_core](pydantic_ai_agent_core.md)**: The `OutputSchema` class uses various output markers and types defined within the broader `pydantic_ai_agent_core` framework, such as `DeferredToolRequests`, `_messages.BinaryImage`, `NativeOutput`, and `PromptedOutput`. These represent different modalities or behaviors for agent responses.

### Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "output_schema", "label": "OutputSchema", "type": "component", "link": null},
        {"id": "build_method", "label": "OutputSchema.build()", "type": "component", "link": null},
        {"id": "build_processor_method", "label": "OutputSchema._build_processor()", "type": "component", "link": null},
        {"id": "base_output_processor", "label": "BaseOutputProcessor", "type": "component", "link": null},
        {"id": "object_output_processor", "label": "ObjectOutputProcessor", "type": "component", "link": null},
        {"id": "union_output_processor", "label": "UnionOutputProcessor", "type": "component", "link": null},
        {"id": "output_toolset", "label": "OutputToolset", "type": "external", "link": "output_toolset_management.md"},
        {"id": "pydantic_ai_agent_core", "label": "Pydantic AIAgent Core (Output Types)", "type": "external", "link": "pydantic_ai_agent_core.md"}
    ],
    "edges": [
        {"source": "build_method", "target": "output_schema"},
        {"source": "build_method", "target": "build_processor_method"},
        {"source": "build_method", "target": "output_toolset"},
        {"source": "build_method", "target": "pydantic_ai_agent_core"},
        {"source": "build_processor_method", "target": "object_output_processor"},
        {"source": "build_processor_method", "target": "union_output_processor"},
        {"source": "output_schema", "target": "base_output_processor", "label": "uses text_processor"},
        {"source": "output_schema", "target": "output_toolset", "label": "uses toolset"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    output_schema[OutputSchema]
    build_method[OutputSchema.build()]
    build_processor_method[OutputSchema._build_processor()]
    base_output_processor[BaseOutputProcessor]
    object_output_processor[ObjectOutputProcessor]
    union_output_processor[UnionOutputProcessor]
    output_toolset[OutputToolset]:::external
    pydantic_ai_agent_core[Pydantic AIAgent Core (Output Types)]:::external

    build_method --> output_schema
    build_method --> build_processor_method
    build_method --> output_toolset
    build_method --> pydantic_ai_agent_core
    build_processor_method --> object_output_processor
    build_processor_method --> union_output_processor
    output_schema -- uses text_processor --> base_output_processor
    output_schema -- uses toolset --> output_toolset

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

## How the Module Fits into the Overall System

The `output_schema_builder` module is a foundational piece of the `pydantic_ai_agent_core` architecture, particularly within the `tool_output_management` subsystem. It provides the essential capability to define and enforce the structure of an AI agent's responses.

*   **Agent Definition**: When defining an AI agent using modules like [agent_definition](agent_definition.md) and [agent_spec_management](agent_spec_management.md), the `OutputSchema` built by this module is specified as part of the agent's capabilities or run configuration. This tells the agent what kind of output it is expected to produce.
*   **Output Processing and Validation**: After an AI model generates a response, the `OutputSchema` instance created by this module is used to parse, process, and validate that response. This involves:
    *   Using the configured `text_processor` to handle plain text outputs.
    *   Employing the `output_toolset` to interpret and validate tool calls.
    *   Converting raw model outputs into structured data according to the schema.
*   **Ensuring Type Safety and Predictability**: By strictly defining the output schema, the module ensures that agent responses are type-safe and predictable, which is critical for reliable integration with other system components, such as UI frameworks or downstream data processing pipelines.
*   **Flexibility for Diverse AI Tasks**: The ability to build various types of `OutputSchema` (e.g., for simple text, complex Pydantic objects, or tool interactions) makes the `pydantic_ai_agent_core` highly flexible for a wide range of AI tasks.

In essence, `output_schema_builder` acts as the contract enforcement layer for AI agent outputs, translating high-level output requirements into concrete processing and validation logic.
