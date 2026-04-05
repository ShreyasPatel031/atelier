# DSPy Evaluation Module

## Introduction
The `dspy_evaluation` module provides a comprehensive suite of tools and metrics for evaluating the performance of DSPy programs and language models. It includes both automated, LLM-based semantic evaluation metrics and traditional, rule-based metrics to assess various aspects of response quality, such as completeness, groundedness, and exact match.

## Architecture Overview
The `dspy_evaluation` module is structured into two primary sub-modules: `auto_metrics` for LLM-driven evaluations and `traditional_metrics` for standard rule-based assessments. This separation allows for flexible and targeted evaluation strategies, supporting both advanced semantic analysis and foundational accuracy checks.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "auto_metrics", "label": "Automated LLM Metrics", "type": "module", "link": "auto_metrics.md"},
        {"id": "traditional_metrics", "label": "Traditional Evaluation Metrics", "type": "module", "link": "traditional_metrics.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    auto_metrics[Automated LLM Metrics]
    traditional_metrics[Traditional Evaluation Metrics]

    click auto_metrics "auto_metrics.md" "View Automated LLM Metrics Documentation"
    click traditional_metrics "traditional_metrics.md" "View Traditional Evaluation Metrics Documentation"
```

## Sub-modules:

*   **[Automated LLM Metrics](auto_metrics.md)**: This sub-module focuses on leveraging language models to semantically evaluate responses. It includes metrics for assessing the F1 score, completeness, groundedness, recall, and precision of system-generated answers against ground truth and retrieved contexts.

*   **[Traditional Evaluation Metrics](traditional_metrics.md)**: This sub-module provides conventional metrics for evaluating system responses. It offers functions for checking exact matches, determining if passages contain answers, calculating precision scores, and computing HotPotQA-style F1 scores.
