# part_3
The `part_3` module defines `SeamlessM4TForTextToSpeech` and `SeamlessM4TForTextToText` models. These classes provide capabilities for text-to-speech generation and text-to-text translation within the SeamlessM4T framework, sharing core encoder-decoder components.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {
            "id": "part_3",
            "label": "Part 3",
            "type": "module"
        },
        {
            "id": "c0",
            "label": "main",
            "type": "component"
        },
        {
            "id": "c1",
            "label": "convert_maskformer_checkpoint",
            "type": "component"
        },
        {
            "id": "c2",
            "label": "convert_maskformer_checkpoint",
            "type": "component"
        },
        {
            "id": "c3",
            "label": "convert_checkpoint",
            "type": "component"
        },
        {
            "id": "c4",
            "label": "main",
            "type": "component"
        },
        {
            "id": "more",
            "label": "+13 more",
            "type": "component"
        }
    ],
    "edges": [
        {
            "source": "part_3",
            "target": "c0"
        },
        {
            "source": "part_3",
            "target": "c1"
        },
        {
            "source": "part_3",
            "target": "c2"
        },
        {
            "source": "part_3",
            "target": "c3"
        },
        {
            "source": "part_3",
            "target": "c4"
        },
        {
            "source": "part_3",
            "target": "more"
        }
    ],
    "groups": [],
    "_auto_generated": true
}
-->
```mermaid
flowchart TD
    subgraph part_3
        A[SeamlessM4TForTextToSpeech]
        B[SeamlessM4TForTextToText]
    end

    subgraph Shared Components
        C[SeamlessM4TEncoder]
        D[SeamlessM4TDecoder]
        I[nn.Embedding]
        J[nn.Linear]
    end

    subgraph TTS Specific
        E[SeamlessM4TTextToUnitForConditionalGeneration]
        F[SeamlessM4TCodeHifiGan]
    end

    subgraph Base Classes/Mixins
        G[SeamlessM4TPreTrainedModel]
        H[GenerationMixin]
    end

    A -- inherits --> G
    A -- inherits --> H
    A -- uses --> C
    A -- uses --> D
    A -- uses --> E
    A -- uses --> F
    A -- uses --> I
    A -- uses --> J

    B -- inherits --> G
    B -- inherits --> H
    B -- uses --> C
    B -- uses --> D
    B -- uses --> I
    B -- uses --> J
```