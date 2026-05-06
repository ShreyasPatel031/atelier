# file_compression_utility
The `file_compression_utility` module provides a `FileCompressorTool` for archiving files and directories into various compressed formats like ZIP and TAR. It simplifies the process of creating backups or packaging data.

<!-- DIAGRAM_JSON
{
  "nodes": [
    {"id": "FileCompressorTool", "label": "FileCompressorTool", "type": "class"}
  ],
  "edges": [],
  "groups": [
    {"id": "file_compression_utility", "label": "file_compression_utility", "type": "module", "nodes": ["FileCompressorTool"]}
  ]
}
-->
```mermaid
flowchart TD
    subgraph file_compression_utility["File Compression Utility"]
        FileCompressorTool["FileCompressorTool"]
    end
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    class FileCompressorTool analytical
```