# semantic_preserving_splitter

## Introduction
The `semantic_preserving_splitter` module provides the `HTMLSemanticPreservingSplitter` class, designed to intelligently split HTML content while maintaining its semantic structure. This is particularly useful for processing web pages and documents where the hierarchical organization (e.g., headers) and embedded media (images, videos, links) are crucial for context and understanding.

## Module Purpose and Core Functionality
The `HTMLSemanticPreservingSplitter` is a specialized document transformer that processes HTML input. Its primary goal is to break down complex HTML into manageable "chunks" (Document objects) that retain as much of the original semantic meaning as possible.

Key functionalities include:
- **Header-Based Splitting**: Divides content based on specified HTML header tags (e.g., `h1`, `h2`), ensuring that logical sections of a document remain together.
- **Semantic Preservation**: Prioritizes keeping entire HTML elements intact, even if it means slightly exceeding a defined `max_chunk_size` to avoid breaking up important structural units.
- **Media and Link Conversion**: Automatically converts `a` (links), `img` (images), `video`, and `audio` tags into a Markdown-like format, making them readable and interpretable in text-based chunks.
- **Custom Handlers**: Supports custom callback functions for specific HTML tags, allowing developers to define bespoke extraction or processing logic for unique elements like iframes.
- **Configurable Text Processing**: Offers options for stopword removal (using NLTK) and text normalization (e.g., lowercasing, punctuation removal) to clean and prepare text content.
- **Tag Filtering**: Allows for explicit inclusion (`allowlist_tags`) or exclusion (`denylist_tags`) of HTML tags during the splitting process.
- **Recursive Splitting**: For chunks that still exceed the `max_chunk_size` after initial semantic splitting, it leverages `RecursiveCharacterTextSplitter` for further, more granular division based on predefined separators.
- **Metadata Management**: Can preserve parent document metadata and attaches header information and external metadata to the generated document chunks.

This module is essential for applications requiring robust HTML parsing and intelligent text extraction, such as information retrieval, RAG systems, and data preparation for large language models, where the structural and media context of HTML is valuable.

## Architecture and Component Relationships

The `semantic_preserving_splitter` module primarily revolves around the `HTMLSemanticPreservingSplitter` class. It interacts with several external libraries and components to achieve its functionality.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "html_semantic_preserving_splitter", "label": "HTMLSemanticPreservingSplitter", "type": "component", "link": null},
        {"id": "beautiful_soup", "label": "BeautifulSoup (External Lib)", "type": "external", "link": null},
        {"id": "nltk", "label": "NLTK (External Lib)", "type": "external", "link": null},
        {"id": "recursive_character_text_splitter", "label": "RecursiveCharacterTextSplitter", "type": "external", "link": "text_splitters_base.md"},
        {"id": "base_document_transformer", "label": "BaseDocumentTransformer", "type": "external", "link": "text_splitters_base.md"}
    ],
    "edges": [
        {"source": "html_semantic_preserving_splitter", "target": "beautiful_soup"},
        {"source": "html_semantic_preserving_splitter", "target": "nltk"},
        {"source": "html_semantic_preserving_splitter", "target": "recursive_character_text_splitter"},
        {"source": "base_document_transformer", "target": "html_semantic_preserving_splitter", "label": "implements"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    html_semantic_preserving_splitter[HTMLSemanticPreservingSplitter]
    beautiful_soup[BeautifulSoup (External Lib)]
    nltk[NLTK (External Lib)]
    recursive_character_text_splitter[RecursiveCharacterTextSplitter]
    base_document_transformer[BaseDocumentTransformer]

    html_semantic_preserving_splitter --> beautiful_soup
    html_semantic_preserving_splitter --> nltk
    html_semantic_preserving_splitter --> recursive_character_text_splitter
    base_document_transformer --> html_semantic_preserving_splitter
```

### Component Breakdown:

-   **HTMLSemanticPreservingSplitter**: This is the main class within the module. It orchestrates the entire HTML splitting process, handling initial parsing, semantic preservation, media conversion, and delegating to `RecursiveCharacterTextSplitter` for further subdivision.
-   **BeautifulSoup**: An external library used for parsing the input HTML content into a navigable tree structure, allowing for easy manipulation and extraction of elements.
-   **NLTK**: An optional external library used for stopword removal if `stopword_removal` is enabled in the splitter's configuration.
-   **RecursiveCharacterTextSplitter**: An external component (likely from the `text_splitters_base` module) that `HTMLSemanticPreservingSplitter` utilizes for breaking down larger chunks that still exceed the maximum size after the initial semantic splitting.
-   **BaseDocumentTransformer**: The base class or interface (from the `text_splitters_base` module) that `HTMLSemanticPreservingSplitter` implements, providing a standardized `transform_documents` method for processing sequences of documents.

## Relationship to the Overall System
The `semantic_preserving_splitter` module is a vital part of the `text_splitters_html` package, which in turn is a sub-module of the broader `text_splitters` category. It extends the core text splitting capabilities by offering specialized handling for HTML documents.

It integrates with the larger system by providing a `BaseDocumentTransformer` interface, making it compatible with any pipeline or framework that expects document transformers. This module is particularly useful for:
-   **Document Loading and Processing**: When HTML documents are loaded, this splitter can be used to prepare them for subsequent processing steps, such as embedding generation or feeding into language models.
-   **Retrieval Augmented Generation (RAG)**: By preserving the semantic structure and converting media, it helps in creating more meaningful and contextually rich document chunks, improving the quality of retrieved information.
-   **Content Analysis**: It enables more nuanced analysis of HTML content by providing structured chunks with relevant metadata, which can be critical for understanding document intent and organization.

It complements other text splitting strategies (e.g., character-based, JSON-based, Spacy-based) by offering a solution specifically tailored for the unique challenges of HTML content.