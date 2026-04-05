# random_bug_detection

The `random_bug_detection` module is a specialized component within the broader [bug_reducer_tools](bug_reducer_tools.md) suite. Its primary purpose is to assist in discovering optimization pass sequences that lead to bugs or crashes in the Swift compiler's SIL (Swift Intermediate Language) pipeline. It achieves this by randomly perturbing the order of SIL passes and invoking the `sil-opt` tool. Upon detecting a crash, it leverages the [pass_reduction_tool](pass_reduction_tool.md) to minimize the crashing pass list, thereby simplifying the reproduction and debugging process.

## Core Functionality

### `random_bug_finder`

```python
def random_bug_finder(args):
    """Given a path to a sib file with canonical sil, attempt to find a perturbed
list of passes that the perf pipeline"""
    # ... (code as provided)
```

The `random_bug_finder` function is the core entry point for this module. It takes `args` which are expected to contain:
- `swift_build_dir`: Path to the Swift build directory, used to locate compiler tools.
- `input_file`: Path to the `.sib` file containing canonical SIL.
- `extra_args`: Optional additional arguments to pass to `sil-opt`.
- `max_count`: The maximum number of random pass permutations to attempt.

**Process:**
1.  **Tool Initialization**: It initializes `swift_tools.SwiftTools` and `swift_tools.SILToolInvokerConfig` using the provided `swift_build_dir` and `args`. These utilities are crucial for interacting with Swift compiler tools like `sil-passpipeline-dumper` and `sil-opt`.
2.  **Pass List Retrieval**: It queries `sil-passpipeline-dumper` to obtain a complete list of available performance-related SIL passes. Each pass name is prefixed with a hyphen (`-`) to make it suitable for `sil-opt` command-line invocation.
3.  **SILOpt Invoker Setup**: A `swift_tools.SILOptInvoker` instance is created, configured with the input `.sib` file and any extra arguments.
4.  **Randomized Pass Execution**: The function enters a loop for `max_count` iterations. In each iteration:
    *   The list of SIL passes is randomly shuffled.
    *   `sil-opt` is invoked with the shuffled pass list on the input `.sib` file.
    *   If `sil-opt` exits with a non-zero status code (indicating a crash or error), the current pass list and the output file are reported.
    *   **Bug Reduction**: In case of a crash, the function calls `opt_bug_reducer.pass_bug_reducer` from the [pass_reduction_tool](pass_reduction_tool.md) module to minimize the crashing pass sequence. This helps in isolating the problematic passes.
    *   If the reduction process fails, the program exits.
5.  **Success Reporting**: If `sil-opt` exits successfully (exit code 0), the successful pass list is printed, and the loop continues to the next random permutation.

## Architecture Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "random_bug_finder", "label": "random_bug_finder()", "type": "component", "link": null},
        {"id": "pass_reduction_tool", "label": "pass_reduction_tool", "type": "external", "link": "pass_reduction_tool.md"},
        {"id": "swift_tools", "label": "Swift Tools (Implicit)", "type": "external", "link": null}
    ],
    "edges": [
        {"source": "random_bug_finder", "target": "pass_reduction_tool"},
        {"source": "random_bug_finder", "target": "swift_tools"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    %% Main component of this module
    random_bug_finder[random_bug_finder()]

    %% External dependencies
    pass_reduction_tool[pass_reduction_tool]
    swift_tools[Swift Tools (Implicit)]

    %% Relationships
    random_bug_finder --> pass_reduction_tool
    random_bug_finder --> swift_tools
```

## How It Fits into the System

The `random_bug_detection` module serves as a proactive bug-finding utility within the `bug_reducer_tools` ecosystem. It acts as an initial discovery mechanism, identifying problematic pass interactions that might not be caught by deterministic testing. Once a bug is found, it seamlessly integrates with the [pass_reduction_tool](pass_reduction_tool.md) to simplify the debugging effort by pinpointing the minimal set of passes required to reproduce the issue. This allows developers to quickly narrow down the source of compiler bugs related to optimization passes. It depends on `swift_tools` for interacting with the Swift compiler's `sil-opt` and `sil-passpipeline-dumper` utilities.