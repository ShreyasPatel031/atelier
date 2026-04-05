# Standard K-Quantized Vector Dot Products (x86)

## Introduction

The `standard_k_vec_dots` module provides highly optimized implementations for vector dot product operations involving various K-quantized data types (Q2_K, Q3_K, Q4_K, Q5_K, and Q6_K) with Q8_K quantized types. These functions are specifically tailored for x86 architectures, leveraging AVX and AVX2 instruction sets to achieve efficient performance in quantized neural network inference. This module is a core component within the `ggml-cpu.arch.x86.quants` system, contributing to the overall efficiency of CPU-based quantized computations.

## Architecture

The `standard_k_vec_dots` module is structured to categorize dot product operations based on the quantization level of the input vectors. This organization ensures clarity and allows for specialized optimizations for each quantization scheme.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "standard_k_vec_dots", "label": "Standard K-Vec-Dots (x86)", "type": "module"},
        {"id": "q2_q3_dot_products", "label": "Q2 and Q3 Quantized Dot Products", "type": "module", "link": "q2_q3_dot_products.md"},
        {"id": "q4_q5_q6_dot_products", "label": "Q4, Q5, and Q6 Quantized Dot Products", "type": "module", "link": "q4_q5_q6_dot_products.md"}
    ],
    "edges": [
        {"source": "standard_k_vec_dots", "target": "q2_q3_dot_products"},
        {"source": "standard_k_vec_dots", "target": "q4_q5_q6_dot_products"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    standard_k_vec_dots[Standard K-Vec-Dots (x86)]
    q2_q3_dot_products[Q2 and Q3 Quantized Dot Products]
    q4_q5_q6_dot_products[Q4, Q5, and Q6 Quantized Dot Products]

    standard_k_vec_dots --> q2_q3_dot_products
    standard_k_vec_dots --> q4_q5_q6_dot_products

    click q2_q3_dot_products "q2_q3_dot_products.md" "View Q2 and Q3 Quantized Dot Products Documentation"
    click q4_q5_q6_dot_products "q4_q5_q6_dot_products.md" "View Q4, Q5, and Q6 Quantized Dot Products Documentation"
```

## Sub-modules

This module comprises the following sub-modules, each focusing on specific K-quantization levels:

### [Q2 and Q3 Quantized Dot Products](q2_q3_dot_products.md)
This sub-module (`q2_q3_dot_products`) contains implementations for vector dot products involving Q2_K and Q3_K quantized types with Q8_K. These functions are highly optimized for x86 architectures, utilizing AVX/AVX2 intrinsics for maximum efficiency in low-bit quantized operations.

### [Q4, Q5, and Q6 Quantized Dot Products](q4_q5_q6_dot_products.md)
The `q4_q5_q6_dot_products` sub-module provides specialized vector dot product functions for Q4_K, Q5_K, and Q6_K quantized types against Q8_K. Like its counterparts, these implementations are engineered to leverage x86 AVX/AVX2 instruction sets, delivering optimized performance for higher-bit quantized computations.