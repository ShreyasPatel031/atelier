# Batch Dimensions Module

The `batch_dimensions` module is a crucial component within the `clip_image_batch_utils` module, specifically designed to extract dimensional information from batched image data. It provides utility functions to query the width (nx) and height (ny) of individual images stored within a `clip_image_f32_batch` structure.

## Architecture Overview

The `batch_dimensions` module primarily interacts with batched image data structures, providing a direct interface to access specific image dimensions. Its design is minimalistic, focusing solely on the retrieval of width and height for indexed images within a batch.

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "image_batch_dimensions", "label": "Image Batch Dimensions", "type": "module", "link": "image_batch_dimensions.md"}
    ],
    "edges": [],
    "groups": []
}
-->
```mermaid
graph TD
    image_batch_dimensions[Image Batch Dimensions]

    click image_batch_dimensions "image_batch_dimensions.md" "View Image Batch Dimensions Module"
```

## Sub-modules

### [Image Batch Dimensions](image_batch_dimensions.md)
This sub-module contains the core logic for retrieving the width and height of images within a batch. It ensures safe access by validating image indices before returning the dimensions.