# content_processing_middleware
This module offers various agent middleware components for content processing, including PII detection, context editing, file search, summarization, human approval, and todo list management.

<!-- DIAGRAM_JSON
{
  "nodes": [
    {"id": "PIIMiddleware", "label": "PIIMiddleware", "type": "class"},
    {"id": "detect_credit_card", "label": "detect_credit_card", "type": "function"},
    {"id": "PIIMatch", "label": "PIIMatch", "type": "data_structure"},
    {"id": "ContextEditingMiddleware", "label": "ContextEditingMiddleware", "type": "class"},
    {"id": "ContextEdit", "label": "ContextEdit", "type": "base_class"},
    {"id": "FilesystemFileSearchMiddleware", "label": "FilesystemFileSearchMiddleware", "type": "class"},
    {"id": "SummarizationMiddleware", "label": "SummarizationMiddleware", "type": "class"},
    {"id": "HumanInTheLoopMiddleware", "label": "HumanInTheLoopMiddleware", "type": "class"},
    {"id": "TodoListMiddleware", "label": "TodoListMiddleware", "type": "class"},
    {"id": "write_todos", "label": "write_todos", "type": "function"},
    {"id": "_awrite_todos", "label": "_awrite_todos", "type": "function"}
  ],
  "edges": [
    {"source": "PIIMiddleware", "target": "detect_credit_card", "label": "uses"},
    {"source": "detect_credit_card", "target": "PIIMatch", "label": "creates"},
    {"source": "ContextEditingMiddleware", "target": "ContextEdit", "label": "uses"},
    {"source": "TodoListMiddleware", "target": "write_todos", "label": "provides tool"},
    {"source": "TodoListMiddleware", "target": "_awrite_todos", "label": "provides tool"},
    {"source": "_awrite_todos", "target": "write_todos", "label": "calls"}
  ],
  "groups": []
}
-->
```mermaid
flowchart TD
    PIIMiddleware[PIIMiddleware]
    detect_credit_card["detect_credit_card()"]
    PIIMatch[PIIMatch]
    ContextEditingMiddleware[ContextEditingMiddleware]
    ContextEdit[ContextEdit]
    FilesystemFileSearchMiddleware[FilesystemFileSearchMiddleware]
    SummarizationMiddleware[SummarizationMiddleware]
    HumanInTheLoopMiddleware[HumanInTheLoopMiddleware]
    TodoListMiddleware[TodoListMiddleware]
    write_todos["write_todos()"]
    _awrite_todos["_awrite_todos()"]

    PIIMiddleware -->|"uses"| detect_credit_card
    detect_credit_card -->|"creates"| PIIMatch
    ContextEditingMiddleware -->|"uses"| ContextEdit
    TodoListMiddleware -->|"provides tool"| write_todos
    TodoListMiddleware -->|"provides tool"| _awrite_todos
    _awrite_todos -->|"calls"| write_todos
```