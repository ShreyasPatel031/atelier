# `better_together` Module Documentation

## Introduction

The `better_together` module introduces `BetterTogether`, a meta-optimizer for DSPy programs. It is designed to combine prompt optimization and weight optimization (fine-tuning) in configurable sequences. This approach, proposed in the paper "[Fine-Tuning and Prompt Optimization: Two Great Steps that Work Better Together](https://arxiv.org/abs/2407.10930)", allows for iterative improvement of both prompts and underlying model parameters, often outperforming either strategy alone.

`BetterTogether` acts as an orchestrator, enabling developers to define a sequence of existing DSPy teleprompters (optimizers) to apply to a student program. This flexibility allows for advanced optimization strategies, such as applying prompt optimization, followed by weight optimization, and then another round of prompt optimization.

## Core Functionality

The primary component of this module is the `BetterTogether` class.

### `BetterTogether` Class

```python
class BetterTogether(Teleprompter):
    # ... (code snippet in original request)
```

The `BetterTogether` class is a `Teleprompter` itself, acting as a meta-optimizer. It allows chaining different prompt and weight optimizers to collectively improve a DSPy program's performance.

#### Initialization (`__init__`)

When initializing `BetterTogether`, you provide an evaluation `metric` and can optionally supply custom optimizers as keyword arguments. If no optimizers are provided, it defaults to using `BootstrapFewShotWithRandomSearch` for prompt optimization (`p`) and `BootstrapFinetune` for weight optimization (`w`).

**Arguments:**
- `metric`: A callable function used to score programs. It should accept `(example, prediction, trace=None)` and return a numeric score (higher is better).
- `**optimizers`: Keyword arguments where the key is the name of the optimizer (e.g., `p`, `w`, `gepa`, `mipro`) and the value is an instance of a `Teleprompter` (e.g., `GEPA(...)`, `BootstrapFinetune(...)`). These keys are then used in the `strategy` string during compilation.

**Example:**
```python
from dspy.teleprompt import GEPA, BootstrapFinetune

optimizer = BetterTogether(
    metric=metric,
    p=GEPA(metric=metric, auto="medium"),
    w=BootstrapFinetune(metric=metric)
)
```

#### Compilation (`compile`)

The `compile` method is the core of `BetterTogether`, executing the defined sequence of optimizers.

**Arguments:**
- `student`: The DSPy program to be optimized. It's crucial that all predictors within the student program have language models assigned.
- `trainset`: A list of training examples used by the optimizers.
- `teacher` (optional): An optional teacher module or list of modules for bootstrapping.
- `valset` (optional): A validation set for evaluating intermediate optimization steps. If not provided, a portion of the `trainset` is held out based on `valset_ratio`.
- `num_threads`, `max_errors`, `provide_traceback`, `seed`: Standard evaluation parameters.
- `valset_ratio`: Fraction of the `trainset` to use as a validation set if `valset` is not explicitly provided (default: 0.1).
- `shuffle_trainset_between_steps`: If `True`, the `trainset` is shuffled before each optimization step (default: `True`).
- `strategy`: A string defining the sequence of optimizers to apply, separated by `" -> "`. For example, `"p -> w -> p"`.
- `optimizer_compile_args` (optional): A dictionary allowing specific `compile()` arguments to be passed to individual optimizers within the sequence. For example, `{"p": {"num_trials": 10}}`.

**Returns:**
An optimized student program with two additional attributes:
- `candidate_programs`: A list of dictionaries, each containing the `program`, its `score`, and the `strategy` applied to achieve it, sorted by descending score.
- `flag_compilation_error_occurred`: A boolean indicating if any step in the optimization sequence encountered an error.

**Example:**
```python
# Assuming `student`, `lm`, `trainset`, `valset`, and `metric` are defined
student.set_lm(lm)
compiled = optimizer.compile(
    student,
    trainset=trainset,
    valset=valset,
    strategy="p -> w",
    optimizer_compile_args={
        "p": {"num_trials": 10, "max_bootstrapped_demos": 8},
    }
)
print(f"Best score: {compiled.candidate_programs[0]['score']}")
```

## Architecture and Component Relationships

The `BetterTogether` module acts as a meta-orchestrator, coordinating the execution of various DSPy `Teleprompter` instances. It manages the lifecycle of the student program, the training and validation datasets, and the flow of optimization steps defined by the `strategy`.

It interacts with several internal helper methods for preparation and evaluation:
- `_prepare_student_and_teacher`: Ensures student and teacher programs are correctly set up and LMs are assigned.
- `_prepare_trainset_and_valset`: Manages the split or usage of training and validation datasets.
- `_prepare_strategy`: Parses the strategy string and validates optimizer keys.
- `_prepare_optimizer_compile_args` and `_validate_compile_args`: Handles and validates custom arguments passed to individual optimizers.
- `_run_strategies`: The central loop that iterates through the defined optimization steps.
- `_run_and_evaluate_step`: Executes a single optimizer, evaluates its outcome, and records the results.
- `_models_changed`: Detects if underlying models have been updated (e.g., after fine-tuning) to manage LM lifecycle.
- `_add_candidate`: Stores the results of each optimization step.
- `_evaluate_on_valset`: Utilizes the `dspy.evaluate.Evaluate` class to score programs.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "better_together_class", "label": "BetterTogether Class", "type": "component", "link": null},
        {"id": "init_method", "label": "__init__", "type": "component", "link": null},
        {"id": "compile_method", "label": "compile", "type": "component", "link": null},
        {"id": "prep_student_teacher", "label": "_prepare_student_and_teacher", "type": "component", "link": null},
        {"id": "prep_train_val", "label": "_prepare_trainset_and_valset", "type": "component", "link": null},
        {"id": "prep_strategy", "label": "_prepare_strategy", "type": "component", "link": null},
        {"id": "prep_optimizer_args", "label": "_prepare_optimizer_compile_args", "type": "component", "link": null},
        {"id": "validate_args", "label": "_validate_compile_args", "type": "component", "link": null},
        {"id": "run_strategies", "label": "_run_strategies", "type": "component", "link": null},
        {"id": "run_eval_step", "label": "_run_and_evaluate_step", "type": "component", "link": null},
        {"id": "models_changed", "label": "_models_changed", "type": "component", "link": null},
        {"id": "add_candidate", "label": "_add_candidate", "type": "component", "link": null},
        {"id": "eval_valset", "label": "_evaluate_on_valset", "type": "component", "link": null},

        {"id": "dspy_module", "label": "Module", "type": "external", "link": "dspy_primitives.md"},
        {"id": "dspy_example", "label": "Example", "type": "external", "link": "dspy_datasets.md"},
        {"id": "dspy_teleprompter_base", "label": "Teleprompter Base Class", "type": "external", "link": "dspy_teleprompting_optimizers.md"},
        {"id": "dspy_evaluate", "label": "Evaluate", "type": "external", "link": "dspy_evaluation.md"},
        {"id": "gepa", "label": "GEPA Optimizer", "type": "external", "link": "gepa_optimizer.md"},
        {"id": "mipro_v2", "label": "MIPROv2 Optimizer", "type": "external", "link": "mipro_optimizer_v2.md"},
        {"id": "teleprompt_utils", "label": "Teleprompt Utils", "type": "external", "link": "teleprompt_utils.md"}
    ],
    "edges": [
        {"source": "better_together_class", "target": "init_method"},
        {"source": "better_together_class", "target": "compile_method"},
        {"source": "init_method", "target": "dspy_teleprompter_base"},
        {"source": "compile_method", "target": "prep_student_teacher"},
        {"source": "compile_method", "target": "prep_train_val"},
        {"source": "compile_method", "target": "prep_strategy"},
        {"source": "compile_method", "target": "prep_optimizer_args"},
        {"source": "compile_method", "target": "run_strategies"},

        {"source": "prep_student_teacher", "target": "dspy_module"},
        {"source": "prep_train_val", "target": "dspy_example"},
        {"source": "prep_optimizer_args", "target": "validate_args"},
        {"source": "prep_optimizer_args", "target": "gepa"},
        {"source": "validate_args", "target": "dspy_teleprompter_base"},

        {"source": "run_strategies", "target": "run_eval_step"},
        {"source": "run_strategies", "target": "eval_valset"},
        {"source": "run_strategies", "target": "add_candidate"},
        {"source": "run_strategies", "target": "teleprompt_utils"},

        {"source": "run_eval_step", "target": "dspy_module"},
        {"source": "run_eval_step", "target": "dspy_example"},
        {"source": "run_eval_step", "target": "dspy_teleprompter_base"},
        {"source": "run_eval_step", "target": "gepa"},
        {"source": "run_eval_step", "target": "mipro_v2"},
        {"source": "run_eval_step", "target": "models_changed"},
        {"source": "run_eval_step", "target": "eval_valset"},
        {"source": "run_eval_step", "target": "add_candidate"},

        {"source": "models_changed", "target": "teleprompt_utils"},

        {"source": "eval_valset", "target": "dspy_evaluate"},
        {"source": "eval_valset", "target": "dspy_example"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    better_together_class[BetterTogether Class]
    init_method[__init__]
    compile_method[compile]
    prep_student_teacher[_prepare_student_and_teacher]
    prep_train_val[_prepare_trainset_and_valset]
    prep_strategy[_prepare_strategy]
    prep_optimizer_args[_prepare_optimizer_compile_args]
    validate_args[_validate_compile_args]
    run_strategies[_run_strategies]
    run_eval_step[_run_and_evaluate_step]
    models_changed[_models_changed]
    add_candidate[_add_candidate]
    eval_valset[_evaluate_on_valset]

    dspy_module[Module]::external
    dspy_example[Example]::external
    dspy_teleprompter_base[Teleprompter Base Class]::external
    dspy_evaluate[Evaluate]::external
    gepa[GEPA Optimizer]::external
    mipro_v2[MIPROv2 Optimizer]::external
    teleprompt_utils[Teleprompt Utils]::external

    better_together_class --> init_method
    better_together_class --> compile_method
    init_method --> dspy_teleprompter_base
    compile_method --> prep_student_teacher
    compile_method --> prep_train_val
    compile_method --> prep_strategy
    compile_method --> prep_optimizer_args
    compile_method --> run_strategies

    prep_student_teacher --> dspy_module
    prep_train_val --> dspy_example
    prep_optimizer_args --> validate_args
    prep_optimizer_args --> gepa
    validate_args --> dspy_teleprompter_base

    run_strategies --> run_eval_step
    run_strategies --> eval_valset
    run_strategies --> add_candidate
    run_strategies --> teleprompt_utils

    run_eval_step --> dspy_module
    run_eval_step --> dspy_example
    run_eval_step --> dspy_teleprompter_base
    run_eval_step --> gepa
    run_eval_step --> mipro_v2
    run_eval_step --> models_changed
    run_eval_step --> eval_valset
    run_eval_step --> add_candidate

    models_changed --> teleprompt_utils

    eval_valset --> dspy_evaluate
    eval_valset --> dspy_example

    click dspy_module "dspy_primitives.md"
    click dspy_example "dspy_datasets.md"
    click dspy_teleprompter_base "dspy_teleprompting_optimizers.md"
    click dspy_evaluate "dspy_evaluation.md"
    click gepa "gepa_optimizer.md"
    click mipro_v2 "mipro_optimizer_v2.md"
    click teleprompt_utils "teleprompt_utils.md"
```

## How it Fits into the Overall System

The `better_together` module is a crucial part of the `dspy_teleprompting_optimizers` package, offering a high-level orchestration mechanism for advanced program optimization. It sits atop individual `Teleprompter` implementations (like GEPA, MIPROv2, BootstrapFinetune) and provides a flexible framework to combine their strengths.

Its primary role is to facilitate sophisticated optimization workflows that leverage both prompt engineering and model fine-tuning in a synergistic manner. By abstracting the sequential application and evaluation of different optimizers, `BetterTogether` allows developers to explore complex optimization strategies with ease, ultimately leading to more robust and performant DSPy programs. It relies on core DSPy components like [Module](dspy_primitives.md) for program representation, [Example](dspy_datasets.md) for data handling, and [Evaluate](dspy_evaluation.md) for performance assessment. Additionally, it interacts with [Teleprompt Utilities](teleprompt_utils.md) for managing language model lifecycles during the optimization process, especially important for local models.
