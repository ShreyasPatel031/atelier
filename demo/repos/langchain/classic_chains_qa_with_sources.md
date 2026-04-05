# classic_chains_qa_with_sources Module

The `classic_chains_qa_with_sources` module provides essential functionalities for building Question Answering (QA) chains that integrate source retrieval. This module focuses on various strategies for processing documents and generating answers while referencing the original source material, ensuring accuracy and traceability.

## Architecture

The module is structured around different document processing and answer generation strategies, encapsulated within specialized chain loaders. The core functionality is to facilitate the creation of robust QA systems that can handle diverse input document structures and generate informative responses with accompanying sources.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "qa_chain_loaders", "label": "QA Chain Loaders", "type": "module", "link": "qa_chain_loaders.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    qa_chain_loaders[QA Chain Loaders]

    click qa_chain_loaders "qa_chain_loaders.md" "View QA Chain Loaders Module"
```

## Sub-modules

### [QA Chain Loaders](qa_chain_loaders.md)
This sub-module contains functions responsible for loading different types of Question Answering with Sources chains, including Map Rerank, Stuff, Map Reduce, and Refine chains. Each function configures a specific chain type, allowing for flexible document processing and answer generation strategies.