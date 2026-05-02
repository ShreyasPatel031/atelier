# Core ML Transform Benchmarking
This module benchmarks core machine learning token transformation functions like temperature scaling, softmax, top-k, top-p, and min-p sampling, crucial for evaluating the performance of inference post-processing.
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "benchmark_runner", "label": "Benchmark Transforms (Go)", "type": "component", "link": null},
        {"id": "input_tokens", "label": "Random Input Tokens", "type": "data", "link": null},
        {"id": "temperature", "label": "Apply Temperature", "type": "component", "link": null},
        {"id": "softmax", "label": "Apply Softmax", "type": "component", "link": null},
        {"id": "topk", "label": "Apply Top-K", "type": "component", "link": null},
        {"id": "topp", "label": "Apply Top-P", "type": "component", "link": null},
        {"id": "minp", "label": "Apply Min-P", "type": "component", "link": null},
        {"id": "sort_tokens", "label": "Sort Tokens", "type": "component", "link": null}
    ],
    "edges": [
        {"source": "benchmark_runner", "target": "input_tokens", "label": "generates"},
        {"source": "input_tokens", "target": "temperature", "label": "benchmarks with"},
        {"source": "input_tokens", "target": "softmax", "label": "benchmarks with"},
        {"source": "input_tokens", "target": "topk", "label": "benchmarks with"},
        {"source": "input_tokens", "target": "topp", "label": "benchmarks with"},
        {"source": "input_tokens", "target": "minp", "label": "benchmarks with"},
        {"source": "input_tokens", "target": "sort_tokens", "label": "benchmarks with"}
    ],
    "groups": [
        {"id": "ml_transforms", "label": "Token Transformations", "role": "analytical", "nodes": ["temperature", "softmax", "topk", "topp", "minp", "sort_tokens"]}
    ]
}
-->
```mermaid
flowchart TD
    benchmark_runner["Benchmark Transforms (Go)"]
    input_tokens[("Random Input Tokens")]

    subgraph ml_transforms["Token Transformations"]
        temperature["Apply Temperature"]
        softmax["Apply Softmax"]
        topk["Apply Top-K"]
        topp["Apply Top-P"]
        minp["Apply Min-P"]
        sort_tokens["Sort Tokens"]
    end

    benchmark_runner -->|"generates"| input_tokens
    input_tokens -->|"benchmarks with"| temperature
    input_tokens -->|"benchmarks with"| softmax
    input_tokens -->|"benchmarks with"| topk
    input_tokens -->|"benchmarks with"| topp
    input_tokens -->|"benchmarks with"| minp
    input_tokens -->|"benchmarks with"| sort_tokens

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class benchmark_runner analytical
    class input_tokens data
    class temperature,softmax,topk,topp,minp,sort_tokens analytical
```