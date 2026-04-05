# BigBird-Pegasus Modeling Module

The `bigbird_pegasus_modeling` module provides the core model implementations for the BigBird-Pegasus architecture, a long-sequence attentional encoder-decoder model.

## Architecture Overview

This module's architecture is centered around its modeling capabilities, as depicted below:

<!-- DIAGRAM_JSON
{
    "direction": "TD",
    "nodes": [
        {"id": "modeling", "label": "BigBird-Pegasus Modeling", "type": "module", "link": "modeling.md"}
    ],
    "edges": []
}
-->

```mermaid
graph TD
    modeling[BigBird-Pegasus Modeling]

    click modeling "modeling.md" "View BigBird-Pegasus Modeling Sub-module"
```

## Sub-modules

### [BigBird-Pegasus Modeling](modeling.md)
This sub-module contains the primary modeling classes for BigBird-Pegasus, including implementations for sequence classification and question answering. It defines how the BigBird-Pegasus model is constructed and used for various downstream tasks.
