# Module: `text_chunking`

## Introduction
The `text_chunking` module is a fundamental component within the RAG (Retrieval Augmented Generation) system of `crewai_tools`. Its primary purpose is to efficiently break down large blocks of text into smaller, manageable chunks. This process is crucial for optimizing information retrieval and processing in AI applications, ensuring that models receive relevant and concise pieces of information rather than overwhelming, lengthy documents.

## Purpose and Core Functionality
This module provides the `BaseChunker` class, which serves as a flexible text splitter. It utilizes advanced text splitting techniques to segment text based on specified parameters, allowing for fine-grained control over chunk size, overlap, and separator characters. The core functionality revolves around preparing textual data for subsequent steps in the RAG pipeline, such as embedding and vector storage, by producing chunks that are suitable for effective semantic search and context provision to language models.

### `BaseChunker` Class
The `BaseChunker` class is designed to instantiate a text splitter with configurable parameters.

**`__init__` Method Parameters:**
- `chunk_size` (int, default: 1000): The maximum size (in characters) for each generated text chunk.
- `chunk_overlap` (int, default: 200): The number of characters that consecutive chunks will overlap. This helps maintain context across chunk boundaries.
- `separators` (list[str] | None, default: None): A list of strings to be used as separators when splitting the text. If `None`, default separators are used (e.g., "

", "
", " ", "").
- `keep_separator` (bool, default: True): Determines whether the separators themselves should be included in the resulting chunks.

**`chunk` Method:**
- `chunk(self, text: str) -> list[str]`
- Takes a single string `text` as input.
- Splits the input text into a list of strings (chunks) based on the `chunk_size`, `chunk_overlap`, and `separators` configured during initialization.
- Returns an empty list if the input text is empty or contains only whitespace.

## Architecture and Component Relationships

The `text_chunking` module primarily exposes the `BaseChunker` class. This class internally leverages `RecursiveCharacterTextSplitter` from an external library (`langchain`) to perform the actual text splitting. It acts as an abstraction layer, providing a simplified interface for text chunking within the `crewai_tools` ecosystem.

This module is a sub-module of `base_components`, which is part of `crewai_tools_rag_loaders_and_chunkers`, highlighting its foundational role in the RAG data preparation pipeline.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "base_chunker", "label": "BaseChunker", "type": "component", "link": null},
        {"id": "recursive_character_text_splitter", "label": "RecursiveCharacterTextSplitter (langchain)", "type": "external", "link": null},
        {"id": "rag_loaders_and_chunkers", "label": "crewai_tools_rag_loaders_and_chunkers", "type": "external", "link": "crewai_tools_rag_loaders_and_chunkers.md"}
    ],
    "edges": [
        {"source": "base_chunker", "target": "recursive_character_text_splitter"},
        {"source": "rag_loaders_and_chunkers", "target": "base_chunker"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    base_chunker[BaseChunker]
    recursive_character_text_splitter[RecursiveCharacterTextSplitter (langchain)]
    rag_loaders_and_chunkers[crewai_tools_rag_loaders_and_chunkers]
    base_chunker --> recursive_character_text_splitter
    rag_loaders_and_chunkers --> base_chunker
```

## How the Module Fits into the Overall System

The `text_chunking` module is a critical preprocessing step for any RAG-based functionality within CrewAI. Before data can be effectively retrieved and utilized by agents, it must be broken down into manageable and semantically meaningful chunks. This module provides that essential capability, ensuring that:
- **Optimal Context:** Chunks are sized appropriately to fit within the context windows of large language models.
- **Improved Retrieval Accuracy:** Smaller, focused chunks lead to more precise retrieval results.
- **Efficient Processing:** Reduces the computational load by processing only relevant portions of larger documents.

It directly supports modules responsible for loading data (e.g., `data_loaders` within `crewai_tools_rag_loaders_and_chunkers`) and prepares the output for embedding and indexing services, forming a foundational piece of the entire knowledge retrieval workflow.
