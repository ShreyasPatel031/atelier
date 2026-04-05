# Evolla Models Documentation

## Introduction

The `evolla_models` module provides the core components for the Evolla framework, specializing in protein-aware text generation. It integrates protein sequence information with natural language processing capabilities to enable tasks such as protein function prediction, description generation, and question answering based on protein data.

## Architecture Overview

The `evolla_models` module is structured to provide a clear separation of concerns, with its primary focus on the `EvollaForProteinText2Text` model, which is capable of handling both textual and protein sequence inputs.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "protein_text_to_text_models", "label": "Protein Text-to-Text Models", "type": "module", "link": "protein_text_to_text_models.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    protein_text_to_text_models[Protein Text-to-Text Models]

    click protein_text_to_text_models "protein_text_to_text_models.md" "View Protein Text-to-Text Models Documentation"
```

## Sub-modules

*   **[Protein Text-to-Text Models](protein_text_to_text_models.md)**: Contains the core Evolla models for protein-aware text generation tasks.