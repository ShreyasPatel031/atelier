# iq1_k_vec_dots Module Documentation

## Introduction

The `iq1_k_vec_dots` module provides highly optimized implementations for vector dot products specifically tailored for IQ1 quantization schemes. These routines leverage x86 CPU architectural extensions like AVX2 and AVX to achieve significant performance gains in quantized operations, which are critical for efficient neural network inference on CPU.

## Architecture Overview

The `iq1_k_vec_dots` module is primarily composed of a single sub-module that encapsulates the core vector dot product functions. These functions are designed to interact with quantized data formats (IQ1 and Q8_K) and perform the necessary computations efficiently.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "iq1_vector_dot_products", "label": "IQ1 Vector Dot Products", "type": "module", "link": "iq1_vector_dot_products.md"}
    ],
    "edges": [],
    "groups": []
}
-->
```mermaid
graph TD
    iq1_vector_dot_products[IQ1 Vector Dot Products]
    click iq1_vector_dot_products "iq1_vector_dot_products.md" "View IQ1 Vector Dot Products Module"
```

## Sub-modules

The `iq1_k_vec_dots` module contains the following sub-module:

- **[iq1_vector_dot_products](iq1_vector_dot_products.md)**: This sub-module contains the core implementations for performing vector dot products on IQ1 quantized data. It includes specialized functions (`ggml_vec_dot_iq1_s_q8_K`, `ggml_vec_dot_iq1_m_q8_K`) that utilize AVX2 and AVX instructions for accelerated computation.
