# specialized_execution_engines
This module provides a suite of specialized execution engines, including a general command runner, an interactive model launcher, a dedicated image generation engine, and a code generator for MLX-related functionalities.

<!-- DIAGRAM_JSON
{
  "nodes": [
    {
      "id": "A",
      "label": "cmd.runner.main"
    },
    {
      "id": "B",
      "label": "cmd.cmd.launchInteractiveModel"
    },
    {
      "id": "C",
      "label": "x.imagegen.cmd.engine.main"
    },
    {
      "id": "D",
      "label": "x.mlxrunner.mlx.generator.main"
    }
  ],
  "edges": [
    {
      "source": "A",
      "target": "B",
      "label": "orchestrates"
    }
  ],
  "groups": [
    {
      "id": "CLI_Core",
      "label": "CLI Core & Interactive Models",
      "nodes": ["A", "B"]
    },
    {
      "id": "Image_Engine",
      "label": "Image Generation Engine",
      "nodes": ["C"]
    },
    {
      "id": "MLX_Generator",
      "label": "MLX Code Generator",
      "nodes": ["D"]
    }
  ]
}
-->
```mermaid
flowchart TD
    subgraph CLI_Core ["CLI Core & Interactive Models"]
        A[cmd.runner.main]
        B[cmd.cmd.launchInteractiveModel]
    end

    subgraph Image_Engine ["Image Generation Engine"]
        C[x.imagegen.cmd.engine.main]
    end

    subgraph MLX_Generator ["MLX Code Generator"]
        D[x.mlxrunner.mlx.generator.main]
    end

    A -- orchestrates --> B
```