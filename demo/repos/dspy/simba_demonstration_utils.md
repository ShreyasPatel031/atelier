# simba_demonstration_utils Module Documentation

## Introduction

The `simba_demonstration_utils` module is a vital component within the DSPy framework's SIMBA (Self-Instructed Multimodal Bootstrap Aggregation) teleprompting strategy. Its primary role is to manage and append high-quality demonstration examples to predictors, thereby enhancing their performance through iterative self-improvement.

This module focuses specifically on the logic for adding generated examples (demos) to predictors based on their evaluated scores, ensuring that only effective demonstrations contribute to the learning process.

## Architecture and Core Functionality

### Purpose

The core purpose of `simba_demonstration_utils` is to programmatically inject useful demonstrations into DSPy predictors during the SIMBA optimization process. By selectively adding demos that lead to good scores, the module helps predictors learn from successful execution traces and improve their instruction following and output generation capabilities.

### Core Components

#### `append_a_demo_`

```python
    def append_a_demo_(bucket, system, **kwargs):
        predictor2name, name2predictor = kwargs["predictor2name"], kwargs["name2predictor"]
        batch_10p_score = kwargs["batch_10p_score"]

        good = bucket[0]
        trace = good["trace"]
        name2demo = {}

        if good["score"] <= batch_10p_score:
            logger.info(f"Skipping appending a demo as good score {good['score']} is at or below the 10th percentile.")
            return False

        for step in trace:
            predictor, _inputs, _outputs = step

            for k, v in _inputs.items():
                if demo_input_field_maxlen and len(str(v)) > demo_input_field_maxlen:
                    _inputs[k] = f"{str(v)[:demo_input_field_maxlen]}
		... <TRUNCATED FOR BREVITY>"

            demo = dspy.Example(augmented=True, **_inputs, **_outputs)
            name = predictor2name[id(predictor)]
            name2demo[name] = demo  # keep the last demo for each predictor
        for name, demo in name2demo.items():
            predictor = name2predictor[name]
            predictor.demos.append(demo)

        logger.info(f"Added {len(name2demo)} demos (one each) across all predictors.")
        return True
```

This function is responsible for: 
- **Score-based Filtering**: It checks if a given "good" example's score surpasses a `batch_10p_score` (10th percentile score of the current batch). Demos are only appended if they meet this quality threshold.
- **Trace Processing**: It iterates through the execution `trace` of the successful example, extracting the inputs and outputs for each `predictor` involved.
- **Input Truncation**: It truncates lengthy input fields to a predefined `demo_input_field_maxlen` to prevent demonstrations from becoming excessively long.
- **Demo Creation**: It constructs `dspy.Example` objects, marking them as `augmented=True`.
- **Predictor Association**: It identifies the target predictor for each demo using `predictor2name` and `name2predictor` mappings.
- **Appending Demos**: Finally, it appends the created `dspy.Example` to the `demos` list of the relevant predictor, effectively updating the predictor with a new, high-quality demonstration.

## Module Relationships

The `simba_demonstration_utils` module is an integral part of the larger `dspy_teleprompting_optimizers` system, specifically serving the `simba_optimizer`. It works in conjunction with other SIMBA utilities to refine predictors dynamically.

- **`simba_core`**: This module (`simba_core.md`) contains the main SIMBA optimizer logic. The `append_a_demo_` function is called by the SIMBA optimizer to add demonstrations.
- **`simba_feedback_and_rules`**: This module (`simba_feedback_and_rules.md`) handles other SIMBA-related utilities, such as appending rules and offering feedback, which complement the demonstration management done by this module.
- **`dspy_primitives`**: The `dspy_primitives` module (`dspy_primitives.md`) provides fundamental DSPy building blocks, including the `dspy.Example` class used by `append_a_demo_` to represent demonstrations.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "append_a_demo_", "label": "append_a_demo_", "type": "component", "link": null},
        {"id": "simba_core", "label": "SIMBA Core Optimizer", "type": "external", "link": "simba_core.md"},
        {"id": "simba_feedback_and_rules", "label": "SIMBA Feedback & Rules", "type": "external", "link": "simba_feedback_and_rules.md"},
        {"id": "dspy_primitives", "label": "DSPy Primitives (dspy.Example)", "type": "external", "link": "dspy_primitives.md"}
    ],
    "edges": [
        {"source": "append_a_demo_", "target": "dspy_primitives"},
        {"source": "simba_core", "target": "append_a_demo_"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    append_a_demo_[append_a_demo_]
    simba_core[SIMBA Core Optimizer]
    simba_feedback_and_rules[SIMBA Feedback & Rules]
    dspy_primitives[DSPy Primitives (dspy.Example)]

    append_a_demo_ --> dspy_primitives
    simba_core --> append_a_demo_
```