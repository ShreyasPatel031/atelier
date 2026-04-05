# `text_splitters_spacy` Module Documentation

## Introduction

The `text_splitters_spacy` module provides a text splitting implementation that leverages the SpaCy natural language processing library. It is designed to segment large texts into smaller, manageable chunks based on SpaCy's sentence detection capabilities, which can be useful for various downstream NLP tasks such as summarization, question answering, or embedding generation.

## Purpose and Core Functionality

The primary purpose of this module is to offer a robust and customizable text splitting mechanism using SpaCy. The core functionality is encapsulated within the `SpacyTextSplitter` class, which extends the base `TextSplitter` interface provided by the `text_splitters_base` module. This class allows users to:

*   **Split text into sentences:** Utilize SpaCy's highly accurate sentence boundary detection to segment text.
*   **Configure SpaCy pipeline:** Specify the SpaCy model to use (e.g., `en_core_web_sm` or a faster `sentencizer` pipeline).
*   **Handle maximum length:** Accommodate very large documents by adjusting the `max_length` parameter for the SpaCy model.
*   **Control whitespace:** Choose whether to preserve or strip whitespace around the split text segments.
*   **Define separators:** Specify the string used to merge splits, which is particularly relevant when rejoining chunks.

This module is ideal for applications requiring high-quality, linguistically informed text segmentation.

## Architecture and Component Relationships

The `text_splitters_spacy` module contains the `SpacyTextSplitter` class as its main component. This class relies on an internal tokenizer initialized with a SpaCy pipeline, which is configured using the `_make_spacy_pipeline_for_splitting` utility function. It inherits its foundational splitting interface from the `TextSplitter` class in the `text_splitters_base` module, ensuring consistency with other text splitting strategies.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "spacy_text_splitter", "label": "SpacyTextSplitter", "type": "component", "link": null},
        {"id": "make_pipeline", "label": "_make_spacy_pipeline_for_splitting", "type": "component", "link": null},
        {"id": "text_splitter_base", "label": "TextSplitter (from text_splitters_base)", "type": "external", "link": "text_splitters_base.md"},
        {"id": "spacy_lib", "label": "SpaCy Library", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "spacy_text_splitter", "target": "text_splitter_base", "label": "inherits"},
        {"source": "spacy_text_splitter", "target": "make_pipeline", "label": "uses"},
        {"source": "make_pipeline", "target": "spacy_lib", "label": "uses"},
        {"source": "spacy_text_splitter", "target": "spacy_lib", "label": "uses"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    spacy_text_splitter[SpacyTextSplitter]
    make_pipeline[_make_spacy_pipeline_for_splitting]
    text_splitter_base(TextSplitter (from text_splitters_base))
    spacy_lib(SpaCy Library)

    spacy_text_splitter -- inherits --> text_splitter_base
    spacy_text_splitter -- uses --> make_pipeline
    make_pipeline -- uses --> spacy_lib
    spacy_text_splitter -- uses --> spacy_lib
```

### Core Components

#### `SpacyTextSplitter`

```python
class SpacyTextSplitter(TextSplitter):
    """Splitting text using Spacy package.

    Per default, Spacy's `en_core_web_sm` model is used and
    its default max_length is 1000000 (it is the length of maximum character
    this model takes which can be increased for large files). For a faster, but
    potentially less accurate splitting, you can use `pipeline='sentencizer'`.
    """

    def __init__(
        self,
        separator: str = "

",
        pipeline: str = "en_core_web_sm",
        max_length: int = 1_000_000,
        *,
        strip_whitespace: bool = True,
        **kwargs: Any,
    ) -> None:
        """Initialize the spacy text splitter."""
        super().__init__(**kwargs)
        self._tokenizer = _make_spacy_pipeline_for_splitting(
            pipeline, max_length=max_length
        )
        self._separator = separator
        self._strip_whitespace = strip_whitespace

    @override
    def split_text(self, text: str) -> list[str]:
        splits = (
            s.text if self._strip_whitespace else s.text_with_ws
            for s in self._tokenizer(text).sents
        )
        return self._merge_splits(splits, self._separator)
```

*   **Purpose:** This is the main class for splitting text using SpaCy.
*   **Initialization (`__init__`):**
    *   `separator`: The string used to join the splits later (defaults to `

`).
    *   `pipeline`: The name of the SpaCy pipeline to load (defaults to `en_core_web_sm`). Can be set to `sentencizer` for a faster, rule-based approach.
    *   `max_length`: The maximum character length the SpaCy model can handle. This can be increased for very large documents.
    *   `strip_whitespace`: A boolean indicating whether leading/trailing whitespace should be stripped from the split segments (defaults to `True`).
    *   Initializes an internal `_tokenizer` by calling `_make_spacy_pipeline_for_splitting` with the specified `pipeline` and `max_length`.
*   **`split_text` method:**
    *   Takes a `text` string as input.
    *   Processes the text using the initialized SpaCy tokenizer to extract sentences (`.sents`).
    *   Iterates through the sentences, optionally stripping whitespace based on `_strip_whitespace`.
    *   Uses the inherited `_merge_splits` method (from `TextSplitter`) to combine the generated splits with the configured `_separator`.

## How it Fits into the Overall System

The `text_splitters_spacy` module is a specialized text splitting utility within the broader text processing ecosystem. It integrates seamlessly with systems that require document preprocessing before feeding text to language models, vector stores, or other NLP components. By implementing the `TextSplitter` interface, `SpacyTextSplitter` can be used interchangeably with other text splitters (e.g., [text_splitters_html.md](text_splitters_html.md) or [text_splitters_json.md](text_splitters_json.md)), allowing developers to easily swap splitting strategies based on the specific requirements of their application and the nature of the text data.

Its dependency on the SpaCy library makes it suitable for scenarios where linguistic accuracy in sentence segmentation is critical, or where advanced tokenization capabilities of SpaCy are already being utilized in other parts of the system. This module ensures that large bodies of text can be efficiently broken down into coherent, semantically meaningful units, which is crucial for maintaining context and performance in many AI applications.