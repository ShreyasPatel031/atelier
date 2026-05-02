# databricks_integration
The `databricks_integration` module facilitates interaction with Databricks for AI model operations. It includes a provider for deploying finetuned models and a dedicated class for managing Databricks training jobs.

<!-- DIAGRAM_JSON
{
  "nodes": [
    {
      "id": "DatabricksProvider",
      "label": "DatabricksProvider",
      "type": "class"
    },
    {
      "id": "TrainingJobDatabricks",
      "label": "TrainingJobDatabricks",
      "type": "class"
    }
  ],
  "edges": [
    {
      "source": "DatabricksProvider",
      "target": "TrainingJobDatabricks",
      "label": "uses"
    }
  ],
  "groups": [
    {
      "id": "databricks_integration",
      "label": "databricks_integration",
      "nodes": ["DatabricksProvider", "TrainingJobDatabricks"]
    }
  ]
}
-->
```mermaid
flowchart TD
    subgraph databricks_integration
        DatabricksProvider["DatabricksProvider"]
        TrainingJobDatabricks["TrainingJobDatabricks"]
    end

    DatabricksProvider --> TrainingJobDatabricks

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    class DatabricksProvider,TrainingJobDatabricks analytical
```