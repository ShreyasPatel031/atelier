# data_loaders
The `data_loaders` module provides a collection of classes for loading and processing diverse data sources, including files, web content, and databases, along with text chunking capabilities.

<!-- DIAGRAM_JSON
{
  "nodes": [
    {"id": "BaseLoader", "label": "BaseLoader"},
    {"id": "BaseChunker", "label": "BaseChunker"},
    {"id": "CSVLoader", "label": "CSVLoader"},
    {"id": "DirectoryLoader", "label": "DirectoryLoader"},
    {"id": "DocsSiteLoader", "label": "DocsSiteLoader"},
    {"id": "DOCXLoader", "label": "DOCXLoader"},
    {"id": "GithubLoader", "label": "GithubLoader"},
    {"id": "JSONLoader", "label": "JSONLoader"},
    {"id": "MDXLoader", "label": "MDXLoader"},
    {"id": "MySQLLoader", "label": "MySQLLoader"}
  ],
  "edges": [
    {"source": "CSVLoader", "target": "BaseLoader", "label": "inherits"},
    {"source": "DirectoryLoader", "target": "BaseLoader", "label": "inherits"},
    {"source": "DocsSiteLoader", "target": "BaseLoader", "label": "inherits"},
    {"source": "DOCXLoader", "target": "BaseLoader", "label": "inherits"},
    {"source": "GithubLoader", "target": "BaseLoader", "label": "inherits"},
    {"source": "JSONLoader", "target": "BaseLoader", "label": "inherits"},
    {"source": "MDXLoader", "target": "BaseLoader", "label": "inherits"},
    {"source": "MySQLLoader", "target": "BaseLoader", "label": "inherits"}
  ],
  "groups": [
    {"id": "Loaders", "label": "Loaders", "nodes": ["BaseLoader", "CSVLoader", "DirectoryLoader", "DocsSiteLoader", "DOCXLoader", "GithubLoader", "JSONLoader", "MDXLoader", "MySQLLoader"]},
    {"id": "Chunkers", "label": "Chunkers", "nodes": ["BaseChunker"]}
  ]
}
-->
```mermaid
flowchart TD
    subgraph Loaders
        BaseLoader
        CSVLoader
        DirectoryLoader
        DocsSiteLoader
        DOCXLoader
        GithubLoader
        JSONLoader
        MDXLoader
        MySQLLoader
    end

    subgraph Chunkers
        BaseChunker
    end

    CSVLoader --> BaseLoader
    DirectoryLoader --> BaseLoader
    DocsSiteLoader --> BaseLoader
    DOCXLoader --> BaseLoader
    GithubLoader --> BaseLoader
    JSONLoader --> BaseLoader
    MDXLoader --> BaseLoader
    MySQLLoader --> BaseLoader
```