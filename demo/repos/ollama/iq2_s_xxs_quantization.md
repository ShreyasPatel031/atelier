# iq2_s_xxs_quantization Module Documentation

## Introduction

The `iq2_s_xxs_quantization` module provides highly optimized vector dot product implementations specifically tailored for IQ2_S and IQ2_XXS quantization schemes on ARM NEON architectures. These kernels are crucial for enabling efficient and performant inference of quantized machine learning models on ARM-based devices by accelerating the core mathematical operations involved in neural network computations.

## Architecture

The `iq2_s_xxs_quantization` module contains a single primary sub-module that encapsulates the ARM-specific optimized vector dot product kernels.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "arm_iq2_vector_dots", "label": "ARM IQ2 Vector Dot Products", "type": "module", "link": "arm_iq2_vector_dots.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    arm_iq2_vector_dots[ARM IQ2 Vector Dot Products]

    click arm_iq2_vector_dots "arm_iq2_vector_dots.md" "View ARM IQ2 Vector Dot Products Module"
```

## Module Functionality

The core functionality of this module is provided by the `arm_iq2_vector_dots` sub-module:

*   **[ARM IQ2 Vector Dot Products](arm_iq2_vector_dots.md)**: This sub-module contains the optimized `ggml_vec_dot_iq2_s_q8_K` and `ggml_vec_dot_iq2_xxs_q8_K` functions. These functions perform vector dot products between IQ2_S/IQ2_XXS quantized inputs and Q8_K quantized weights, leveraging ARM NEON intrinsics for maximum performance. They are fundamental for the efficient execution of quantized models.
