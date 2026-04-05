# `optimizer_core`

## Introduction

The `optimizer_core` module, part of the `dspy_teleprompting_optimizers` family, provides the core `AvatarOptimizer` class. This optimizer is a sophisticated `Teleprompter` designed to iteratively refine a DSPy program's instructions based on performance feedback. It employs a feedback loop involving positive and negative examples to guide the generation of improved instructions, ultimately enhancing the program's effectiveness.

## Architecture and Component Relationships

The `AvatarOptimizer` orchestrates a feedback-driven optimization process. It relies on a `Comparator` to analyze the performance of a given program on a dataset, identifying examples where the program performs well (positive) and poorly (negative). This analysis then informs the `FeedbackBasedInstruction` component, which generates a refined set of instructions for the program. The optimizer iteratively applies these refinements, aiming to converge on an optimal instruction set.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "avatar_optimizer_core", "label": "AvatarOptimizer Core", "type": "component", "link": null},
        {"id": "comparator", "label": "Comparator", "type": "external", "link": "performance_comparator.md"},
        {"id": "feedback_instruction", "label": "FeedbackBasedInstruction", "type": "external", "link": "instruction_refiner.md"},
        {"id": "dspy_module", "label": "DSPy Program (dspy.Module)", "type": "external", "link": null},
        {"id": "dspy_example", "label": "DSPy Example (dspy.Example)", "type": "external", "link": null},
        {"id": "metric_func", "label": "Metric Function", "type": "component", "link": null},
        {"id": "train_set", "label": "Training Dataset", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "avatar_optimizer_core", "target": "metric_func"},
        {"source": "avatar_optimizer_core", "target": "train_set"},
        {"source": "avatar_optimizer_core", "target": "comparator"},
        {"source": "avatar_optimizer_core", "target": "feedback_instruction"},
        {"source": "avatar_optimizer_core", "target": "dspy_module"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    avatar_optimizer_core[AvatarOptimizer Core]
    comparator[Comparator]
    feedback_instruction[FeedbackBasedInstruction]
    dspy_module[DSPy Program (dspy.Module)]
    dspy_example[DSPy Example (dspy.Example)]
    metric_func[Metric Function]
    train_set[Training Dataset]

    avatar_optimizer_core --> metric_func
    avatar_optimizer_core --> train_set
    avatar_optimizer_core --> comparator
    avatar_optimizer_core --> feedback_instruction
    avatar_optimizer_core --> dspy_module
```

### `dspy.teleprompt.avatar_optimizer.AvatarOptimizer`

The `AvatarOptimizer` is the central component of this module. It implements a teleprompting strategy to improve the performance of a DSPy program (referred to as an "actor").

**Core Functionality:**

*   **Initialization**: Configured with a `metric` function for evaluation, `max_iters` for the optimization loop, `lower_bound` and `upper_bound` for classifying positive and negative examples, and limits on the number of `max_positive_inputs` and `max_negative_inputs` to sample. It instantiates `Comparator` and `FeedbackBasedInstruction` as DSPy predictors for its internal feedback mechanism.
*   **Example Processing (`process_example`)**: Executes the actor with a given example and computes its score using the provided `metric` function.
*   **Thread-Safe Evaluation (`thread_safe_evaluator`)**: Efficiently evaluates the actor across a `devset` in a thread-safe manner, calculating the average score and collecting individual example results.
*   **Positive/Negative Example Collection (`_get_pos_neg_results`)**: Analyzes the evaluation results to categorize examples into "positive" (score >= `upper_bound`) and "negative" (score <= `lower_bound`) sets. These sets are crucial for generating targeted feedback.
*   **Compilation (`compile`)**: The main optimization loop:
    1.  Evaluates the current `best_actor` on the `trainset` to gather positive and negative examples.
    2.  Samples a subset of these positive and negative examples.
    3.  Generates `feedback` using the `Comparator` based on the current program's instructions, tools, and the sampled positive/negative examples.
    4.  Generates a `new_instruction` for the program using `FeedbackBasedInstruction`, informed by the previous instruction and the generated feedback.
    5.  If the `new_instruction` leads to a better performance (based on the `optimize_for` setting), the `best_actor`'s signature is updated with this new instruction, and the process continues for `max_iters`.

## How it Fits into the Overall System

The `optimizer_core` module, specifically the `AvatarOptimizer`, plays a critical role within the larger `dspy_teleprompting_optimizers` system. It provides an advanced optimization strategy for automatically improving the performance of DSPy programs by iteratively refining their prompting instructions.

It depends on the `feedback_mechanism` module for its `Comparator` and `FeedbackBasedInstruction` components. The `AvatarOptimizer` serves as a high-level orchestration mechanism that leverages these specialized feedback components to drive the teleprompting process. This modular design allows for clear separation of concerns, where `optimizer_core` focuses on the optimization loop, while `feedback_mechanism` handles the generation and interpretation of feedback.

For more details on the feedback generation and instruction refinement, refer to the documentation for:

*   [performance_comparator.md](performance_comparator.md)
*   [instruction_refiner.md](instruction_refiner.md)
