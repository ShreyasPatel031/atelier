# image_text_pipelines

The `image_text_pipelines` module provides the `ImageTextToTextPipeline` class, a specialized pipeline for generating text based on image and text inputs. This module is a core component of the larger [pipelines](pipelines.md) system, designed to handle multimodal tasks involving both visual and textual data.

## ImageTextToTextPipeline

The `ImageTextToTextPipeline` extends the base [Pipeline](pipelines.md) class to offer an end-to-end solution for image-text-to-text generation. It is particularly adept at handling conversational models, allowing users to engage in chat-based interactions where image and text inputs contribute to the ongoing conversation.

### Core Functionality

This pipeline is capable of:
*   Generating descriptive text for a given image.
*   Continuing a conversation with a multimodal model, incorporating both image and text inputs from the chat history.
*   Supporting various input formats for images (HTTP/local paths, PIL Image objects) and text (strings, lists of strings, or chat-formatted lists of dictionaries).

### Usage

The `ImageTextToTextPipeline` can be initialized using the `pipeline` function with the task identifier `"image-text-to-text"`.

Example for image captioning:

```python
from transformers import pipeline

pipe = pipeline(task="image-text-to-text", model="Salesforce/blip-image-captioning-base")
pipe("https://huggingface.co/datasets/Narsil/image_dummy/raw/main/parrots.png", text="A photo of")
# Expected output: [{'generated_text': 'a photo of two birds'}]
```

Example for conversational image-text generation:

```python
from transformers import pipeline

pipe = pipeline("image-text-to-text", model="llava-hf/llava-interleave-qwen-0.5b-hf")
messages = [
    {
        "role": "user",
        "content": [
            {
                "type": "image",
                "url": "https://qianwen-res.oss-cn-beijing.aliyuncs.com/Qwen-VL/assets/demo.jpeg",
            },
            {"type": "text", "text": "Describe this image."},
        ],
    },
    {
        "role": "assistant",
        "content": [
            {"type": "text", "text": "There is a dog and"},
        ],
    },
]
pipe(text=messages, max_new_tokens=20, return_full_text=False)
# Expected output: [{'input_text': [...], 'generated_text': ' a person in the image. The dog is sitting on the sand, and the person is sitting on'}]
```

### Parameters and Arguments

The `__call__` method of the `ImageTextToTextPipeline` accepts various arguments to control the generation process:

*   `images` (`str`, `list[str]`, `PIL.Image`, `list[PIL.Image]`, `list[dict]`): Input image(s) as URLs, file paths, or PIL Image objects. Also supports chat format where images are embedded within the `content`.
*   `text` (`str`, `list[str]`, `list[dict]`): Input text for generation. Can be a single string, a list of strings (matching the number of images), or a chat-formatted list of dictionaries.
*   `return_tensors` (`bool`, *optional*, defaults to `False`): If `True`, returns token ID tensors instead of decoded text.
*   `return_full_text` (`bool`, *optional*, defaults to `True`): If `False`, only the newly generated text is returned; otherwise, the full text (input + generated) is returned.
*   `clean_up_tokenization_spaces` (`bool`, *optional*, defaults to `True`): Cleans up extra spaces in the output text.
*   `continue_final_message` (`bool`, *optional*): When in chat mode, `True` continues the last assistant message (prefill), `False` starts a new assistant message.

### Internal Components

The pipeline's workflow is divided into three main stages:

1.  **`preprocess`**: Handles input validation, loads images, and prepares the text and image inputs into a format suitable for the model. It also manages chat templating for conversational inputs.
2.  **`_forward`**: Passes the processed inputs to the underlying `AutoModelForImageTextToText` to generate sequences. It utilizes [GenerationConfig](generation_mixins.md) to control generation parameters.
3.  **`postprocess`**: Decodes the generated sequences back into human-readable text, applying cleaning and formatting rules. It also handles the integration of generated text into chat history if `continue_final_message` is enabled.

## Architecture Diagram

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "image_text_to_text_pipeline", "label": "ImageTextToTextPipeline", "type": "component", "link": null},
        {"id": "preprocess_method", "label": "preprocess()", "type": "component", "link": null},
        {"id": "_forward_method", "label": "_forward()", "type": "component", "link": null},
        {"id": "postprocess_method", "label": "postprocess()", "type": "component", "link": null},
        {"id": "pipeline_base", "label": "Pipeline (Base)", "type": "external", "link": "pipelines.md"},
        {"id": "image_text_to_text_model", "label": "ImageTextToText Model", "type": "external", "link": null},
        {"id": "processor", "label": "Processor (ImageProcessor/Tokenizer)", "type": "external", "link": null},
        {"id": "generation_config", "label": "GenerationConfig", "type": "external", "link": "generation_mixins.md"}
    ],
    "edges": [
        {"source": "image_text_to_text_pipeline", "target": "pipeline_base", "label": "inherits"},
        {"source": "image_text_to_text_pipeline", "target": "preprocess_method", "label": "uses"},
        {"source": "image_text_to_text_pipeline", "target": "_forward_method", "label": "uses"},
        {"source": "image_text_to_text_pipeline", "target": "postprocess_method", "label": "uses"},
        {"source": "preprocess_method", "target": "processor", "label": "uses"},
        {"source": "_forward_method", "target": "image_text_to_text_model", "label": "uses"},
        {"source": "_forward_method", "target": "generation_config", "label": "uses"},
        {"source": "postprocess_method", "target": "processor", "label": "uses"}
    ],
    "groups": []
}
-->
```mermaid
graph TD
    image_text_to_text_pipeline[ImageTextToTextPipeline]
    preprocess_method[preprocess()]
    _forward_method[_forward()]
    postprocess_method[postprocess()]
    pipeline_base[Pipeline (Base)]
    image_text_to_text_model[ImageTextToText Model]
    processor[Processor (ImageProcessor/Tokenizer)]
    generation_config[GenerationConfig]

    image_text_to_text_pipeline -- inherits --> pipeline_base
    image_text_to_text_pipeline --> preprocess_method
    image_text_to_text_pipeline --> _forward_method
    image_text_to_text_pipeline --> postprocess_method

    preprocess_method --> processor
    _forward_method --> image_text_to_text_model
    _forward_method --> generation_config
    postprocess_method --> processor
```

### Relationship with other modules

The `image_text_pipelines` module is a sub-module of the main [pipelines](pipelines.md) module, inheriting fundamental functionalities from the base `Pipeline` class. It leverages an `AutoModelForImageTextToText` (an abstract representation of multimodal models) and a `Processor` (which encapsulates an image processor, feature extractor, and tokenizer) to perform its task. The generation process is configured using `GenerationConfig`, which is part of the [generation_mixins](generation_mixins.md) utilities.
