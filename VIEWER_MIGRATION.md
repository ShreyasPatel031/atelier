# Viewer Migration: New Data Structure

## Data Location

**All repos with new format:**
```
/Users/shreyaspatel/atelier/demo/repos/
├── KubeElasti/module_tree.json
├── typer/module_tree.json
├── httpx/module_tree.json
├── rich/module_tree.json
├── fastapi/module_tree.json
└── flask/module_tree.json (old format)
```

## New Fields in module_tree.json

```json
{
  "module_name": {
    "title": "Short Title",
    "description": "1-2 sentence description for hover tooltip.",
    "diagram": {
      "direction": "TD",
      "nodes": [
        {"id": "child_1", "label": "Child Module", "type": "module", "link": "child_1.md"},
        {"id": "external", "label": "External Dep", "type": "external", "link": null}
      ],
      "edges": [{"source": "child_1", "target": "external"}],
      "groups": []
    },
    "components": [...],
    "children": {...}
  }
}
```

## Viewer Changes Required

1. **Hover**: Show `title` + `description` on node hover
2. **Right panel**: Closed by default, opens on click
3. **Node colors**: `type: "module"` = blue/clickable, `type: "external"` = gray

## Node Types

| type | clickable | color |
|------|-----------|-------|
| `module` | yes | blue |
| `component` | no | gray |
| `external` | no | light gray |

## Test

```bash
cd /Users/shreyaspatel/atelier && python3 -m http.server 8080
# http://localhost:8080/demo/viewer.html?repo=KubeElasti
```
