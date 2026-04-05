# ggml_cpu_amx Module Documentation

## Introduction

The `ggml_cpu_amx` module provides highly optimized CPU kernels for the GGML library, specifically leveraging Intel's Advanced Matrix Extensions (AMX) to accelerate matrix multiplication and quantization operations. This module is crucial for achieving high performance on CPUs that support AMX instructions, by optimizing key computational bottlenecks in machine learning models.

## Architecture

The `ggml_cpu_amx` module is designed to provide specialized, low-level optimizations for CPU-based GGML operations. It integrates directly with the GGML backend, offering optimized routines for data preparation (packing) and numerical transformations (quantization). The module is structured into distinct sub-modules, each addressing a specific aspect of AMX-accelerated computation.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "packed_format_conversion", "label": "Packed Format Conversion", "type": "module", "link": "packed_format_conversion.md"},
        {"id": "row_quantization", "label": "Row Quantization", "type": "module", "link": "row_quantization.md"},
        {"id": "ggml_cpu_amx_core", "label": "ggml_cpu_amx (Core Module)", "type": "module"}
    ],
    "edges": [
        {"source": "packed_format_conversion", "target": "row_quantization", "label": "Prepares data for"},
        {"source": "ggml_cpu_amx_core", "target": "packed_format_conversion"},
        {"source": "ggml_cpu_amx_core", "target": "row_quantization"}
    ],
    "groups": []
}
-->

```mermaid
graph TD
    ggml_cpu_amx_core[ggml_cpu_amx (Core Module)]
    packed_format_conversion[Packed Format Conversion]
    row_quantization[Row Quantization]

    ggml_cpu_amx_core --> packed_format_conversion
    ggml_cpu_amx_core --> row_quantization
    packed_format_conversion -- Prepares data for --> row_quantization

    click packed_format_conversion "packed_format_conversion.md" "View Packed Format Conversion Documentation"
    click row_quantization "row_quantization.md" "View Row Quantization Documentation"
```

## Sub-modules

### [Packed Format Conversion](packed_format_conversion.md)
This sub-module is responsible for transforming input data into a memory layout that is optimal for Intel AMX instructions. Specifically, it handles the conversion of matrix 'B' into a packed format, enabling efficient matrix multiplication operations.

### [Row Quantization](row_quantization.md)
This sub-module provides highly optimized routines for quantizing floating-point data rows into an 8-bit integer format (Q8_K) using VNNI (Vector Neural Network Instructions) for further acceleration. This is a critical step for reducing model size and accelerating inference while maintaining accuracy.
