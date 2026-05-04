# Multimodal Processors
This module provides specialized processors for multimodal data. It includes `ColModernVBertProcessor` for integrated image and query processing with retrieval scoring, and `GotOcr2Processor` for advanced OCR capabilities on diverse document types.
<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "input_data",
            "label": "Multimodal Input (Images, Text)",
            "type": "data",
            "link": null
        },
        {
            "id": "colmodernvbert_proc",
            "label": "ColModernVBert Processor",
            "type": "component",
            "link": null
        },
        {
            "id": "got_ocr2_proc",
            "label": "GotOcr2 Processor",
            "type": "component",
            "link": null
        },
        {
            "id": "img_proc",
            "label": "Image Processors",
            "type": "external",
            "link": "image_processors.md"
        },
        {
            "id": "tokenizer_mod",
            "label": "Tokenizers",
            "type": "external",
            "link": "tokenizers.md"
        },
        {
            "id": "retrieval_scores_out",
            "label": "Retrieval Scores",
            "type": "data",
            "link": null
        },
        {
            "id": "ocr_output_out",
            "label": "OCR Processed Data",
            "type": "data",
            "link": null
        },
        {
            "id": "processed_multimodal_out",
            "label": "Processed Multimodal Data",
            "type": "data",
            "link": null
        }
    ],
    "edges": [
        {
            "source": "input_data",
            "target": "colmodernvbert_proc",
            "label": "raw data"
        },
        {
            "source": "input_data",
            "target": "got_ocr2_proc",
            "label": "raw data"
        },
        {
            "source": "colmodernvbert_proc",
            "target": "img_proc",
            "label": "uses"
        },
        {
            "source": "colmodernvbert_proc",
            "target": "tokenizer_mod",
            "label": "uses"
        },
        {
            "source": "got_ocr2_proc",
            "target": "img_proc",
            "label": "uses"
        },
        {
            "source": "got_ocr2_proc",
            "target": "tokenizer_mod",
            "label": "uses"
        },
        {
            "source": "colmodernvbert_proc",
            "target": "processed_multimodal_out",
            "label": "processed input"
        },
        {
            "source": "colmodernvbert_proc",
            "target": "retrieval_scores_out",
            "label": "computed scores"
        },
        {
            "source": "got_ocr2_proc",
            "target": "ocr_output_out",
            "label": "OCR results"
        }
    ],
    "groups": [
        {
            "id": "processors_group",
            "label": "Multimodal Processing Logic",
            "role": "analytical",
            "nodes": [
                "colmodernvbert_proc",
                "got_ocr2_proc"
            ]
        },
        {
            "id": "external_deps",
            "label": "External Dependencies",
            "role": "surface",
            "nodes": [
                "img_proc",
                "tokenizer_mod"
            ]
        },
        {
            "id": "data_flow_group",
            "label": "Data Flow",
            "role": "data",
            "nodes": [
                "input_data",
                "retrieval_scores_out",
                "ocr_output_out",
                "processed_multimodal_out"
            ]
        }
    ]
}
-->
```mermaid
flowchart TD
    subgraph data_flow_group["Data Flow"]
        input_data[("Multimodal Input (Images, Text)")]
        retrieval_scores_out[("Retrieval Scores")]
        ocr_output_out[("OCR Processed Data")]
        processed_multimodal_out[("Processed Multimodal Data")]
    end

    subgraph processors_group["Multimodal Processing Logic"]
        colmodernvbert_proc["ColModernVBert Processor"]
        got_ocr2_proc["GotOcr2 Processor"]
    end

    subgraph external_deps["External Dependencies"]
        img_proc["Image Processors"]
        tokenizer_mod["Tokenizers"]
    end

    input_data -->|'''raw data'''| colmodernvbert_proc
    input_data -->|'''raw data'''| got_ocr2_proc

    colmodernvbert_proc -.->|'''uses'''| img_proc
    colmodernvbert_proc -.->|'''uses'''| tokenizer_mod
    got_ocr2_proc -.->|'''uses'''| img_proc
    got_ocr2_proc -.->|'''uses'''| tokenizer_mod

    colmodernvbert_proc -->|'''processed input'''| processed_multimodal_out
    colmodernvbert_proc -->|'''computed scores'''| retrieval_scores_out
    got_ocr2_proc -->|'''OCR results'''| ocr_output_out

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class colmodernvbert_proc,got_ocr2_proc analytical
    class img_proc,tokenizer_mod surface
    class input_data,retrieval_scores_out,ocr_output_out,processed_multimodal_out data

    click img_proc "image_processors.md" "View Image Processors Module"
    click tokenizer_mod "tokenizers.md" "View Tokenizers Module"
```