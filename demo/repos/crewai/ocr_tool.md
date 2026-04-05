# ocr_tool

## Introduction
The `ocr_tool` module provides an Optical Character Recognition (OCR) tool for the CrewAI ecosystem. This tool allows agents to extract text from images, supporting both local image files and images accessible via URLs. It leverages the capabilities of Large Language Models (LLMs) to perform accurate text extraction.

## Architecture and Component Relationships

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "ocr_tool_main", "label": "OCRTool", "type": "component", "link": null},
        {"id": "ocr_tool_encode", "label": "OCRTool._encode_image", "type": "component", "link": null},
        {"id": "ocr_tool_schema", "label": "OCRToolSchema", "type": "component", "link": null},
        {"id": "base_tool", "label": "BaseTool", "type": "external", "link": "crewai_tool_base.md"},
        {"id": "llm", "label": "LLM", "type": "external", "link": "crewai_llm_integrations.md"}
    ],
    "edges": [
        {"source": "ocr_tool_main", "target": "ocr_tool_encode"},
        {"source": "ocr_tool_main", "target": "llm"},
        {"source": "ocr_tool_main", "target": "ocr_tool_schema"},
        {"source": "ocr_tool_main", "target": "base_tool", "label": "inherits"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    ocr_tool_main[OCRTool]
    ocr_tool_encode[OCRTool._encode_image]
    ocr_tool_schema[OCRToolSchema]
    base_tool[BaseTool]
    llm[LLM]

    ocr_tool_main --> ocr_tool_encode
    ocr_tool_main --> llm
    ocr_tool_main --> ocr_tool_schema
    ocr_tool_main --|> base_tool
```

The `ocr_tool` module centers around the `OCRTool` class, which is a specialized `BaseTool` designed for OCR tasks. It interacts with an LLM to process images and an internal utility function `_encode_image` to handle local file processing.

## Core Functionality

### `OCRTool`
The `OCRTool` class is the primary component of this module. It provides the functionality to extract text from images.

-   **Purpose**: To enable CrewAI agents to perform Optical Character Recognition on various image sources.
-   **Inheritance**: It inherits from `BaseTool`, providing a standardized interface for integration within CrewAI workflows. For more details on the base tool structure, refer to the [crewai_tool_base](crewai_tool_base.md) documentation.
-   **LLM Integration**: The tool uses an instance of `LLM` to make API calls for text extraction. By default, it uses a "gpt-4o" model with a temperature of 0.7. Information about LLM integrations can be found in the [crewai_llm_integrations](crewai_llm_integrations.md) documentation.
-   **Input Handling**: The `_run` method intelligently handles image inputs:
    -   If a URL is provided (starts with "http"), it is passed directly to the LLM's vision API.
    -   If a local file path is provided, the image is first encoded into a base64 string using the `_encode_image` static method, and then passed to the LLM.
-   **Schema**: It utilizes `OCRToolSchema` for input validation, ensuring that `image_path_url` is always provided.

#### `OCRTool._encode_image` (Static Method)
This private static method is responsible for converting a local image file into a base64 encoded string. This encoding is necessary for sending local image data to LLMs that accept base64-encoded images.

## How the Module Fits into the Overall System
The `ocr_tool` module is a vital part of the `crewai_tools_platform_automation` suite, extending the capabilities of CrewAI agents to interact with visual content. By providing robust OCR functionality, it allows agents to process information embedded in images, such as scanned documents, screenshots, or diagrams. This enhances the agents' ability to gather and interpret diverse forms of data, making them more versatile in complex workflows that involve visual data analysis. It integrates seamlessly with other tools through its `BaseTool` inheritance, allowing for flexible orchestration within larger CrewAI crews.