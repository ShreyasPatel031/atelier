# `math_dataset`

## Introduction
The `math_dataset` module provides the `MATH` class, a utility for loading and managing the MATH dataset for use within DSPy applications. This module facilitates the preparation of mathematical reasoning problems, their solutions, and corresponding answers, which are crucial for training and evaluating language models on complex arithmetic and reasoning tasks. It includes functionalities for splitting the dataset into training, development, and testing sets, and a metric for evaluating solution equivalence.

## Architecture and Component Relationships

The `math_dataset` module centers around the `MATH` class, which handles data loading, preprocessing, and evaluation. It interacts with external libraries for dataset retrieval and mathematical equivalence checking, and leverages DSPy's `Example` primitive for data representation.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "MATH", "label": "MATH Class", "type": "component", "link": null},
        {"id": "extract_answer", "label": "extract_answer (Implicit Utility)", "type": "component", "link": null},
        {"id": "datasets_lib", "label": "datasets (External Library)", "type": "external", "link": null},
        {"id": "dspy_example", "label": "dspy.Example", "type": "external", "link": "dataset_base_components.md"},
        {"id": "math_equivalence_lib", "label": "math_equivalence (External Library)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "MATH", "target": "datasets_lib", "label": "loads data"},
        {"source": "MATH", "target": "extract_answer", "label": "uses"},
        {"source": "MATH", "target": "dspy_example", "label": "creates instances of"},
        {"source": "MATH", "target": "math_equivalence_lib", "label": "uses for metric"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    MATH[MATH Class]
    extract_answer[extract_answer (Implicit Utility)]
    datasets_lib[datasets (External Library)]
    dspy_example[dspy.Example]:::external
    math_equivalence_lib[math_equivalence (External Library)]

    MATH -- loads data --> datasets_lib
    MATH -- uses --> extract_answer
    MATH -- creates instances of --> dspy_example
    MATH -- uses for metric --> math_equivalence_lib

    linkStyle 3 stroke-dasharray: 5 5
    click dspy_example "dataset_base_components.md"
```

## Core Functionality

The `MATH` class provides the following core functionalities:

### `MATH` Class
- **Purpose**: Manages the loading, splitting, and evaluation of the MATH dataset.
- **`__init__(self, subset)`**:
    - Initializes the `MATH` class by loading a specified `subset` of the "DigitalLearningGmbH/MATH-lighteval" dataset.
    - The loaded dataset's "test" split is further divided into `train`, `dev`, and `test` sets for model training and evaluation.
    - Each example from the dataset is converted into a `dspy.Example` object, containing the `question`, `reasoning` (solution), and `answer`. The `answer` is extracted from the `solution` using an implicit `extract_answer` utility.
- **`metric(self, example, pred, trace=None)`**:
    - Computes the equivalence between the true answer (`example.answer`) and the predicted answer (`pred.answer`) using the `math_equivalence.is_equiv` function.
    - This method requires the `math_equivalence` library to be installed.

## Integration with the Overall System

The `math_dataset` module, specifically the `MATH` class, plays a vital role in the `dspy_datasets` ecosystem by providing a standardized way to access and utilize the MATH dataset for developing and evaluating DSPy programs. It directly depends on the foundational `dspy.Example` component, which is managed within the `dataset_base_components` module, ensuring consistent data representation across various datasets.

### Dependencies:
- **`dspy_datasets.dataset_base_components`**: This module provides the `dspy.Example` primitive, which the `MATH` class uses to structure its dataset examples. The `MATH` class extends the functionality of DSPy by providing a concrete implementation for a specific, complex dataset.
- **External Libraries**: `datasets` (for loading the dataset) and `math_equivalence` (for evaluating answer equivalence) are external dependencies essential for the `MATH` class's operation.

By encapsulating the complexities of loading and preparing the MATH dataset, `math_dataset` allows other DSPy modules and programs to easily incorporate this challenging mathematical reasoning benchmark into their workflows, fostering robust development and evaluation of language models.
