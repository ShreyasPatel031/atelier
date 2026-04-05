# Passage-Based Metrics

The `passage_based_metrics` module is a vital component within the `dspy.evaluate.metrics` framework, specifically focusing on metrics that assess the relationship between retrieved passages and expected answers. It provides core utilities for determining if a given passage or set of passages contains specific answers, forming the foundation for evaluating the relevance and correctness of retrieval systems. This module is a child of the [traditional_metrics](traditional_metrics.md) module.

## Architecture

The `passage_based_metrics` module is structured around a single sub-module that encapsulates its core functionality.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "passage_evaluation_utilities", "label": "Passage Evaluation Utilities", "type": "module", "link": "passage_evaluation_utilities.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    passage_evaluation_utilities[Passage Evaluation Utilities]
    click passage_evaluation_utilities "passage_evaluation_utilities.md" "View Passage Evaluation Utilities Module"
```

## Sub-modules

### Passage Evaluation Utilities

The `passage_evaluation_utilities` sub-module, documented in [passage_evaluation_utilities.md](passage_evaluation_utilities.md), provides the foundational functions for checking answer presence within passages. It includes utilities like `passage_has_answers` and `answer_passage_match`, which are essential for various passage-based evaluation metrics.