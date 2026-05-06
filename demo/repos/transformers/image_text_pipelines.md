# image_text_pipelines
This module provides the `ImageTextToTextPipeline` for generating text from images and accompanying text, supporting both single-turn and conversational interactions.

<!-- DIAGRAM_JSON
{
    "nodes": [
        {
            "id": "N1",
            "label": "ImageTextToTextPipeline",
            "metadata": {
                "type": "class"
            }
        }
    ],
    "edges": [],
    "groups": [
        {
            "id": "G1",
            "label": "image_text_pipelines",
            "nodes": [
                "N1"
            ],
            "metadata": {
                "type": "module"
            }
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph G1 [image_text_pipelines]
        N1["ImageTextToTextPipeline"]
    end

    classDef nodeStyle fill:#DAE8FC,stroke:#6C8EBF,stroke-width:2px,color:#000000;

    class N1 nodeStyle
```