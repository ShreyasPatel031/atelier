# Image Generation Subsystem
This module manages the core logic for generating images using various models like Flux2 and Z-Image, handling model capability validation and exposing image generation functionality through an API.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "image_api_and_capabilities", "label": "Image API and Capabilities", "type": "module", "link": "image_api_and_capabilities.md"},
        {"id": "image_generation_core", "label": "Image Generation Core", "type": "module", "link": "image_generation_core.md"}
    ],
    "edges": [
        {"source": "image_api_and_capabilities", "target": "image_generation_core", "label": "requests generation"}
    ],
    "groups": [
        {"id": "api_interface", "label": "API Interface", "role": "surface", "nodes": ["image_api_and_capabilities"]},
        {"id": "core_logic", "label": "Core Generation Logic", "role": "generative", "nodes": ["image_generation_core"]}
    ]
}
-->

```mermaid
flowchart TD
    subgraph api_interface["API Interface"]
        image_api_and_capabilities["Image API and Capabilities"]
    end
    subgraph core_logic["Core Generation Logic"]
        image_generation_core["Image Generation Core"]
    end

    image_api_and_capabilities -->|"requests generation"| image_generation_core

    click image_api_and_capabilities "image_api_and_capabilities.md"
    click image_generation_core "image_generation_core.md"

    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class image_api_and_capabilities surface
    class image_generation_core generative
```