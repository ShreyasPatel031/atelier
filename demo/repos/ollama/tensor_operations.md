# Tensor Operations
This module provides fundamental tensor manipulation functions such as permutation, slicing, chunking, splitting, matrix multiplication, and shape inference, crucial for numerical computations within the GGML backend.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "permute_op",
            "label": "Permute Tensor Dimensions",
            "type": "component",
            "link": null
        },
        {
            "id": "slice_op",
            "label": "Slice Tensor",
            "type": "component",
            "link": null
        },
        {
            "id": "chunk_op",
            "label": "Chunk Tensor",
            "type": "component",
            "link": null
        },
        {
            "id": "split_sections_op",
            "label": "Split Tensor Sections",
            "type": "component",
            "link": null
        },
        {
            "id": "mulmat_op",
            "label": "Matrix Multiplication",
            "type": "component",
            "link": null
        },
        {
            "id": "infer_shape_op",
            "label": "Infer Tensor Shape",
            "type": "component",
            "link": null
        },
        {
            "id": "ml_backend",
            "label": "ML Backends and Ops",
            "type": "external",
            "link": "ml_backends_and_ops.md"
        }
    ],
    "edges": [
        {
            "source": "ml_backend",
            "target": "permute_op",
            "label": "provides context and tensors"
        },
        {
            "source": "ml_backend",
            "target": "slice_op",
            "label": "provides context and tensors"
        },
        {
            "source": "ml_backend",
            "target": "chunk_op",
            "label": "provides context and tensors"
        },
        {
            "source": "ml_backend",
            "target": "split_sections_op",
            "label": "provides context and tensors"
        },
        {
            "source": "ml_backend",
            "target": "mulmat_op",
            "label": "provides context and tensors"
        },
        {
            "source": "ml_backend",
            "target": "infer_shape_op",
            "label": "provides context and tensors"
        }
    ],
    "groups": [
        {
            "id": "tensor_ops_group",
            "label": "Core Tensor Operations",
            "role": "analytical",
            "nodes": [
                "permute_op",
                "slice_op",
                "chunk_op",
                "split_sections_op",
                "mulmat_op",
                "infer_shape_op"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    ml_backend["ML Backends and Ops"]

    subgraph tensor_ops_group["Core Tensor Operations"]
        permute_op["Permute Tensor Dimensions"]
        slice_op["Slice Tensor"]
        chunk_op["Chunk Tensor"]
        split_sections_op["Split Tensor Sections"]
        mulmat_op["Matrix Multiplication"]
        infer_shape_op["Infer Tensor Shape"]
    end

    ml_backend -.->|"provides context and tensors"| permute_op
    ml_backend -.->|"provides context and tensors"| slice_op
    ml_backend -.->|"provides context and tensors"| chunk_op
    ml_backend -.->|"provides context and tensors"| split_sections_op
    ml_backend -.->|"provides context and tensors"| mulmat_op
    ml_backend -.->|"provides context and tensors"| infer_shape_op

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    class ml_backend,permute_op,slice_op,chunk_op,split_sections_op,mulmat_op,infer_shape_op analytical

    click ml_backend "ml_backends_and_ops.md" "View ML Backends and Ops module"
```