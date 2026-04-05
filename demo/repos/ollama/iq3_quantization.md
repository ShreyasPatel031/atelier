# IQ3 Quantization Module

This module, `iq3_quantization`, provides reference implementations for IQ3 quantization within the `ggml_quants_reference` module. IQ3 quantization is a technique used in machine learning models to reduce memory footprint and improve computational efficiency by representing model weights and activations using 3-bit integers. These reference implementations serve as a baseline for correctness and are primarily used for testing and validation against optimized kernel implementations.

## Architecture

The `iq3_quantization` module is straightforward, encapsulating the core reference kernels for IQ3 quantization. It currently contains one sub-module:

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "iq3_reference_kernels", "label": "IQ3 Reference Kernels", "type": "module", "link": "iq3_reference_kernels.md"}
    ],
    "edges": [],
    "groups": []
}
-->

```mermaid
graph TD
    iq3_reference_kernels[IQ3 Reference Kernels]

    click iq3_reference_kernels "iq3_reference_kernels.md" "View IQ3 Reference Kernels Documentation"
```

## Sub-modules

### [IQ3 Reference Kernels](iq3_reference_kernels.md)
This sub-module contains the reference C functions for performing IQ3 quantization, specifically `quantize_row_iq3_s_ref` and `quantize_row_iq3_xxs_ref`. These functions provide a direct, unoptimized implementation of the IQ3 quantization logic, essential for verifying the correctness of more highly optimized assembly or intrinsic-based kernels. They handle the conversion of floating-point numbers to their 3-bit quantized representation.