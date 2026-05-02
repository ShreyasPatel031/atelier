# Switch Transformers Module Overview

This module provides the Switch Transformers model, implementing both a full sequence-to-sequence architecture and an encoder-only variant, utilizing a modular Mixture-of-Experts (MoE) stack and shared input embeddings.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "input_encoder", "label": "Encoder Input (token_ids, mask)", "type": "data", "link": null},
        {"id": "input_decoder", "label": "Decoder Input (token_ids, mask)", "type": "data", "link": null},
        {"id": "shared_embed", "label": "Shared Token Embeddings", "type": "component", "link": null},
        {"id": "encoder_stack", "label": "SwitchTransformersStack (Encoder)", "type": "component", "link": null},
        {"id": "decoder_stack", "label": "SwitchTransformersStack (Decoder)", "type": "component", "link": null},
        {"id": "switch_model", "label": "SwitchTransformersModel (Seq2Seq)", "type": "component", "link": null},
        {"id": "encoder_model", "label": "SwitchTransformersEncoderModel (Encoder-Only)", "type": "component", "link": null},
        {"id": "output_seq2seq", "label": "Seq2SeqMoEModelOutput", "type": "data", "link": null},
        {"id": "output_encoder", "label": "MoEModelOutput (Encoder-Only)", "type": "data", "link": null}
    ],
    "edges": [
        {"source": "input_encoder", "target": "shared_embed", "label": "token IDs"},
        {"source": "input_decoder", "target": "shared_embed", "label": "token IDs"},
        {"source": "shared_embed", "target": "encoder_stack", "label": "input embeddings"},
        {"source": "shared_embed", "target": "decoder_stack", "label": "decoder input embeddings"},
        {"source": "encoder_stack", "target": "decoder_stack", "label": "encoder hidden states"},
        {"source": "switch_model", "target": "encoder_stack", "label": "orchestrates"},
        {"source": "switch_model", "target": "decoder_stack", "label": "orchestrates"},
        {"source": "encoder_model", "target": "encoder_stack", "label": "orchestrates"},
        {"source": "switch_model", "target": "output_seq2seq", "label": "produces"},
        {"source": "encoder_model", "target": "output_encoder", "label": "produces"}
    ],
    "groups": [
        {"id": "model_implementations", "label": "Switch Transformers Models", "role": "generative", "nodes": ["switch_model", "encoder_model"]},
        {"id": "core_mechanisms", "label": "Core MoE & Embedding Mechanisms", "role": "analytical", "nodes": ["shared_embed", "encoder_stack", "decoder_stack"]},
        {"id": "data_io", "label": "Data Input and Output", "role": "data", "nodes": ["input_encoder", "input_decoder", "output_seq2seq", "output_encoder"]}
    ]
}
-->

```mermaid
flowchart TD
    subgraph data_io["Data Input and Output"]
        input_encoder[("Encoder Input (token_ids, mask)")]
        input_decoder[("Decoder Input (token_ids, mask)")]
        output_seq2seq[("Seq2SeqMoEModelOutput")]
        output_encoder[("MoEModelOutput (Encoder-Only)")]
    end

    subgraph core_mechanisms["Core MoE & Embedding Mechanisms"]
        shared_embed["Shared Token Embeddings"]
        encoder_stack["SwitchTransformersStack (Encoder)"]
        decoder_stack["SwitchTransformersStack (Decoder)"]
    end

    subgraph model_implementations["Switch Transformers Models"]
        switch_model["SwitchTransformersModel (Seq2Seq)"]
        encoder_model["SwitchTransformersEncoderModel (Encoder-Only)"]
    end

    input_encoder -->|"token IDs"| shared_embed
    input_decoder -->|"token IDs"| shared_embed
    shared_embed -->|"input embeddings"| encoder_stack
    shared_embed -->|"decoder input embeddings"| decoder_stack
    encoder_stack -->|"encoder hidden states"| decoder_stack

    switch_model -.->|"orchestrates"| encoder_stack
    switch_model -.->|"orchestrates"| decoder_stack
    encoder_model -.->|"orchestrates"| encoder_stack

    switch_model ==>|"produces"| output_seq2seq
    encoder_model ==>|"produces"| output_encoder

    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef component fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12

    class input_encoder,input_decoder,output_seq2seq,output_encoder data
    class shared_embed,encoder_stack,decoder_stack analytical
    class switch_model,encoder_model generative
