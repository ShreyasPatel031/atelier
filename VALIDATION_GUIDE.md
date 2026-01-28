# Validation Guide (Agent 3)

## Validation Script Location

```
/Users/shreyaspatel/atelier/codewiki/src/be/validation.py
```

## Run Validation

```bash
cd /Users/shreyaspatel/atelier
source .venv/bin/activate
python codewiki/src/be/validation.py demo/repos/KubeElasti
```

## Error Codes

| Code | Severity | Description |
|------|----------|-------------|
| `MISSING_TITLE` | ERROR | Module missing `title` field |
| `MISSING_DESCRIPTION` | ERROR | Module missing `description` field |
| `MISSING_STRUCTURED_DIAGRAM` | ERROR | Parent module missing `diagram` JSON |
| `MISSING_LEAF_DIAGRAM` | ERROR | Leaf module missing `diagram` JSON |
| `INVALID_DIAGRAM` | ERROR | Diagram missing `nodes` or `edges` array |
| `MISSING_CHILD_NODE` | ERROR | Child module not in parent's diagram nodes |
| `MISSING_DOCUMENTATION` | ERROR | No `.md` file for module |
| `TITLE_TOO_LONG` | WARNING | Title > 6 words |
| `DESCRIPTION_TOO_LONG` | WARNING | Description > 3 sentences |

## Current Benchmark (5 repos)

| Metric | Value |
|--------|-------|
| Total modules | 417 |
| Diagram coverage | 89.2% |
| Title coverage | 98.8% |
| Description coverage | 98.8% |
| Parent errors | 5 (1.2%) |
| Leaf errors | 40 (9.6%) |

## Repos to Test

```
/Users/shreyaspatel/atelier/demo/repos/
├── KubeElasti/  (new format)
├── typer/       (new format)
├── httpx/       (new format)
├── rich/        (new format)
├── fastapi/     (new format)
└── flask/       (old format - skip)
```

## Run All Repos

```bash
cd /Users/shreyaspatel/atelier
source .venv/bin/activate

for repo in KubeElasti typer httpx rich fastapi; do
  echo "=== $repo ==="
  python codewiki/src/be/validation.py demo/repos/$repo
  echo ""
done
```

## Data Structure to Validate

```json
{
  "module_name": {
    "title": "Required - 2-4 words",
    "description": "Required - 1-2 sentences",
    "diagram": {
      "direction": "TD",
      "nodes": [{"id": "x", "label": "X", "type": "module|component|external", "link": "x.md"}],
      "edges": [{"source": "x", "target": "y"}],
      "groups": []
    },
    "components": [...],
    "children": {...}
  }
}
```

## Validation Rules

1. **Every module** must have `title` and `description`
2. **Every module** must have `diagram` (parent AND leaf)
3. **Parent modules**: all `children` keys must appear as nodes in `diagram.nodes`
4. **Every module** must have corresponding `.md` file
