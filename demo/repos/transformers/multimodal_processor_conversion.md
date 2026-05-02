# multimodal_processor_conversion
Converts a pre-trained Ernie 4.5 VL MoE processor, including its tokenizer, image processor, and video processor, to the Hugging Face format, saving all components to a specified directory.

<!-- DIAGRAM_JSON
{
  "nodes": [
    {"id": "multimodal_processor_conversion", "label": "multimodal_processor_conversion", "type": "module"},
    {"id": "convert_processor", "label": "convert_processor", "type": "function"},
    {"id": "convert_tokenizer", "label": "convert_tokenizer", "type": "function_call"},
    {"id": "AutoTokenizer_from_pretrained", "label": "AutoTokenizer.from_pretrained", "type": "function_call"},
    {"id": "hf_hub_download", "label": "hf_hub_download", "type": "function_call"},
    {"id": "copyfile", "label": "copyfile", "type": "function_call"},
    {"id": "Ernie4_5_VLMoeImageProcessorFast", "label": "Ernie4_5_VLMoeImageProcessorFast", "type": "class_instantiation"},
    {"id": "Ernie4_5_VLMoeVideoProcessor", "label": "Ernie4_5_VLMoeVideoProcessor", "type": "class_instantiation"},
    {"id": "Ernie4_5_VLMoeProcessor", "label": "Ernie4_5_VLMoeProcessor", "type": "class_instantiation"},
    {"id": "processor_save_pretrained", "label": "processor.save_pretrained", "type": "method_call"}
  ],
  "edges": [
    {"source": "multimodal_processor_conversion", "target": "convert_processor", "type": "contains"},
    {"source": "convert_processor", "target": "convert_tokenizer", "type": "calls"},
    {"source": "convert_processor", "target": "AutoTokenizer_from_pretrained", "type": "calls"},
    {"source": "convert_processor", "target": "hf_hub_download", "type": "calls"},
    {"source": "convert_processor", "target": "copyfile", "type": "calls"},
    {"source": "convert_processor", "target": "Ernie4_5_VLMoeImageProcessorFast", "type": "calls"},
    {"source": "convert_processor", "target": "Ernie4_5_VLMoeVideoProcessor", "type": "calls"},
    {"source": "convert_processor", "target": "Ernie4_5_VLMoeProcessor", "type": "calls"},
    {"source": "convert_processor", "target": "processor_save_pretrained", "type": "calls"}
  ],
  "groups": [
    {"id": "multimodal_processor_conversion_group", "label": "multimodal_processor_conversion", "nodes": ["convert_processor"]}
  ]
}
-->
```mermaid
flowchart TD
    subgraph multimodal_processor_conversion [multimodal_processor_conversion]
        convert_processor(convert_processor)
    end

    convert_processor --> convert_tokenizer(convert_tokenizer)
    convert_processor --> AutoTokenizer_from_pretrained(AutoTokenizer.from_pretrained)
    convert_processor --> hf_hub_download(hf_hub_download)
    convert_processor --> copyfile(copyfile)
    convert_processor --> Ernie4_5_VLMoeImageProcessorFast(Ernie4_5_VLMoeImageProcessorFast)
    convert_processor --> Ernie4_5_VLMoeVideoProcessor(Ernie4_5_VLMoeVideoProcessor)
    convert_processor --> Ernie4_5_VLMoeProcessor(Ernie4_5_VLMoeProcessor)
    convert_processor --> processor_save_pretrained(processor.save_pretrained)
```