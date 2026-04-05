# mipro_optimizer_v2 Module Documentation

The `mipro_optimizer_v2` module introduces `MIPROv2`, a sophisticated teleprompter designed for optimizing DSPy programs. It leverages Bayesian Optimization to systematically search for the best combination of instructions and few-shot demonstrations, thereby enhancing program performance.

## Purpose and Core Functionality

The primary goal of `MIPROv2` is to automate the tuning of DSPy programs by optimizing their prompt parameters. This includes finding the most effective instructions for each predictor within a program and selecting optimal sets of few-shot examples.

The core functionality is encapsulated within the `MIPROv2` class, which extends the `Teleprompter` base class. Its main method, `compile`, orchestrates a multi-step optimization process:

1.  **Bootstrap Few-Shot Examples**: Generates a pool of high-quality few-shot demonstrations from the training set. These examples serve as candidates for optimizing individual predictors within the program.
2.  **Propose Instruction Candidates**: Generates a variety of instruction candidates for each predictor, drawing insights from the training data, program structure, and few-shot examples.
3.  **Optimize Prompt Parameters**: Utilizes Bayesian Optimization (powered by Optuna) to iteratively evaluate different combinations of instruction candidates and few-shot examples. It aims to maximize a specified metric on a validation set, ultimately identifying the best-performing program configuration.

### `MIPROv2` Class

```python
class MIPROv2(Teleprompter):
    def __init__(...):
        # Initializes the teleprompter with various settings for optimization
    
    def compile(self, student, *, trainset, teacher=None, valset=None, ...):
        # Main method to compile and optimize a DSPy program
        # Steps include bootstrapping demos, proposing instructions, and optimizing parameters
```

**Key Parameters for `MIPROv2`:**

*   `metric`: A callable function used to evaluate the performance of the program.
*   `prompt_model`, `task_model`: Language models used for prompt generation and task execution, respectively.
*   `auto`: A convenience setting ("light", "medium", "heavy") that configures various hyperparameters automatically.
*   `max_bootstrapped_demos`, `max_labeled_demos`: Control the number of demonstrations to use.
*   `num_candidates`: The number of instruction and few-shot candidates to consider.
*   `num_trials`: The number of optimization trials to run.

## Architecture and Component Relationships

The `MIPROv2` module is designed around the central `MIPROv2` class, which coordinates several internal and external components to perform program optimization.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "mipro_optimizer_v2", "label": "MIPROv2 Class", "type": "component", "link": null},
        {"id": "_bootstrap_fewshot_examples", "label": "Bootstrap Few-Shot Examples", "type": "component", "link": null},
        {"id": "_propose_instructions", "label": "Propose Instruction Candidates", "type": "component", "link": null},
        {"id": "_optimize_prompt_parameters", "label": "Optimize Prompt Parameters (Optuna)", "type": "component", "link": null},
        {"id": "_set_hyperparams_from_run_mode", "label": "Set Hyperparameters", "type": "component", "link": null},
        {"id": "_set_and_validate_datasets", "label": "Prepare Datasets", "type": "component", "link": null},
        {"id": "_select_and_insert_instructions_and_demos", "label": "Select & Insert Parameters", "type": "component", "link": null},
        {"id": "_perform_full_evaluation", "label": "Perform Full Evaluation", "type": "component", "link": null},
        {"id": "dspy_evaluation", "label": "dspy_evaluation (Evaluate)", "type": "external", "link": "dspy_evaluation.md"},
        {"id": "dspy_program_proposal", "label": "dspy_program_proposal (GroundedProposer)", "type": "external", "link": "dspy_program_proposal.md"},
        {"id": "dspy_primitives", "label": "dspy_primitives (Signature Mgmt)", "type": "external", "link": "dspy_primitives.md"},
        {"id": "dspy_teleprompting_optimizers_base", "label": "dspy_teleprompting_optimizers (Teleprompter, Utils)", "type": "external", "link": "dspy_teleprompting_optimizers.md"},
        {"id": "optuna", "label": "Optuna (External Library)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "mipro_optimizer_v2", "target": "_set_and_validate_datasets"},
        {"source": "mipro_optimizer_v2", "target": "_set_hyperparams_from_run_mode"},
        {"source": "mipro_optimizer_v2", "target": "_bootstrap_fewshot_examples"},
        {"source": "mipro_optimizer_v2", "target": "_propose_instructions"},
        {"source": "mipro_optimizer_v2", "target": "_optimize_prompt_parameters"},
        {"source": "_bootstrap_fewshot_examples", "target": "dspy_teleprompting_optimizers_base"},
        {"source": "_propose_instructions", "target": "dspy_program_proposal"},
        {"source": "_optimize_prompt_parameters", "target": "dspy_evaluation"},
        {"source": "_optimize_prompt_parameters", "target": "optuna"},
        {"source": "_optimize_prompt_parameters", "target": "_select_and_insert_instructions_and_demos"},
        {"source": "_optimize_prompt_parameters", "target": "_perform_full_evaluation"},
        {"source": "_select_and_insert_instructions_and_demos", "target": "dspy_primitives"},
        {"source": "_perform_full_evaluation", "target": "dspy_evaluation"},
        {"source": "_perform_full_evaluation", "target": "dspy_primitives"},
        {"source": "_perform_full_evaluation", "target": "optuna"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    mipro_optimizer_v2[MIPROv2 Class]
    _bootstrap_fewshot_examples[Bootstrap Few-Shot Examples]
    _propose_instructions[Propose Instruction Candidates]
    _optimize_prompt_parameters[Optimize Prompt Parameters (Optuna)]
    _set_hyperparams_from_run_mode[Set Hyperparameters]
    _set_and_validate_datasets[Prepare Datasets]
    _select_and_insert_instructions_and_demos[Select & Insert Parameters]
    _perform_full_evaluation[Perform Full Evaluation]
    dspy_evaluation[dspy_evaluation (Evaluate)]:::external
    dspy_program_proposal[dspy_program_proposal (GroundedProposer)]:::external
    dspy_primitives[dspy_primitives (Signature Mgmt)]:::external
    dspy_teleprompting_optimizers_base[dspy_teleprompting_optimizers (Teleprompter, Utils)]:::external
    optuna[Optuna (External Library)]:::external

    mipro_optimizer_v2 --> _set_and_validate_datasets
    mipro_optimizer_v2 --> _set_hyperparams_from_run_mode
    mipro_optimizer_v2 --> _bootstrap_fewshot_examples
    mipro_optimizer_v2 --> _propose_instructions
    mipro_optimizer_v2 --> _optimize_prompt_parameters
    _bootstrap_fewshot_examples --> dspy_teleprompting_optimizers_base
    _propose_instructions --> dspy_program_proposal
    _optimize_prompt_parameters --> dspy_evaluation
    _optimize_prompt_parameters --> optuna
    _optimize_prompt_parameters --> _select_and_insert_instructions_and_demos
    _optimize_prompt_parameters --> _perform_full_evaluation
    _select_and_insert_instructions_and_demos --> dspy_primitives
    _perform_full_evaluation --> dspy_evaluation
    _perform_full_evaluation --> dspy_primitives
    _perform_full_evaluation --> optuna

    classDef external fill:#f9f,stroke:#333,stroke-width:2px;
```

### Component Relationships:

*   **`MIPROv2` Class**: The central orchestrator. It initiates the data preparation, bootstrapping, instruction proposal, and the main optimization loop.
*   **Data Preparation (`_set_and_validate_datasets`, `_set_hyperparams_from_run_mode`)**: Ensures the training and validation datasets are correctly set up and adjusts optimization hyperparameters based on the chosen run mode.
*   **Few-Shot Bootstrapping (`_bootstrap_fewshot_examples`)**: Leverages utilities from `dspy_teleprompting_optimizers` to generate diverse sets of few-shot examples.
*   **Instruction Proposal (`_propose_instructions`)**: Relies on the `GroundedProposer` from the `dspy_program_proposal` module to intelligently suggest instructions for predictors.
*   **Optimization Loop (`_optimize_prompt_parameters`)**: This is the core of `MIPROv2`. It interacts with:
    *   **Optuna**: An external library used for Bayesian Optimization to efficiently search the parameter space.
    *   **Evaluation (`dspy_evaluation`)**: Uses the `Evaluate` class to score candidate programs.
    *   **Parameter Selection (`_select_and_insert_instructions_and_demos`)**: Chooses specific instructions and few-shot sets for a trial and updates the program. This involves using signature management utilities from `dspy_primitives`.
    *   **Full Evaluation (`_perform_full_evaluation`)**: Periodically performs comprehensive evaluations of promising candidates on the full validation set.

## How the Module Fits into the Overall System

The `mipro_optimizer_v2` module is a critical component within the `dspy_teleprompting_optimizers` package. It provides an advanced, automated approach to prompt engineering for DSPy programs, significantly reducing the manual effort required to achieve high performance.

By offering both automated "auto" modes and fine-grained control over optimization parameters, `MIPROv2` caters to a wide range of use cases, from rapid prototyping to in-depth program tuning. It integrates seamlessly with other DSPy modules, such as `dspy_evaluation` for performance assessment, `dspy_program_proposal` for instruction generation, and `dspy_primitives` for dynamic program modification. This modular design allows developers to build robust and optimized language model applications with DSPy.
