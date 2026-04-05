# General Conversion Utilities

The `general_conversion_utilities` module provides a set of robust tools for converting various model checkpoints and data formats into a standardized Hugging Face compatible format. This module is essential for integrating diverse models into the Hugging Face ecosystem, ensuring interoperability and ease of use.

## Architecture Overview

The module is structured to handle different conversion tasks through specialized sub-modules. The primary sub-module focuses on the conversion of Marian models, encompassing SentencePiece models and full directories of checkpoints.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "marian_model_conversion", "label": "Marian Model Conversion", "type": "module", "link": "marian_model_conversion.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    marian_model_conversion[Marian Model Conversion]

    click marian_model_conversion "marian_model_conversion.md" "View Marian Model Conversion Documentation"
```

## Sub-modules

### [Marian Model Conversion](marian_model_conversion.md)
This sub-module is dedicated to the conversion of Marian models. It includes functionalities for converting individual SentencePiece models, as well as utility functions to process and convert entire directories of Marian model checkpoints.