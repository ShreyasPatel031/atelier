# Stage 3 output vs tests — coverage gaps

This document maps **what the LLM / agents are supposed to guarantee** to **what automated tests actually assert**, so you can close gaps systematically.

## What existing tests cover

| Test file | What it checks | Stage |
|-----------|----------------|--------|
| `test_diagram_format.py` | Mermaid in markdown: `graph TD`, optional `click` lines, node definitions exist, bracket balance, `validate_mermaid` / `fix_mermaid_diagram` on **sample strings** | Post-hoc on static fixtures |
| `test_e2e_pipeline.py` | `module_tree.json` non-empty, `components` key present per module, overview has mermaid fence | Fixture `flask` docs only |
| `test_web_ui_generation_e2e.py` | Web UI job flow (not full doc quality contract) | FE |

## Gaps (not asserted in tests)

| Contract (prompt / product) | Missing test |
|-----------------------------|--------------|
| Every tree module has a matching `*.md` | No pytest that fails on `missing_md` count |
| Every module has `title` and `description` | Only e2e warns; no failure on missing |
| Leaf modules have `diagram` in tree | `test_flask_all_modules_have_diagrams` is flask-only; not generalized |
| `DIAGRAM_JSON` node `id` set ⊆ `children` keys (or documented exceptions) | `validate_children` in `diagram_schema.py` **never called**; no test |
| Non-empty `label` on diagram nodes | No test |
| Edges reference existing node ids | No test (see `audit_docs_state`: `diagram_edges_unknown_endpoint`) |
| Stage 4.5 repair rate / `presync_audit` | **Now** measurable via `audit_docs_state` + `sync_issues.json` `metrics` |

## Recommended additions (pytest)

1. Load `demo/repos/<fixture>/module_tree.json` + directory scan → assert `presync_audit["missing_md"] == 0` for a **golden** fixture (or assert below threshold).
2. Unit test: `audit_docs_state` on a **synthetic** minimal tree with known defects → expect exact counts.
3. Parametrized test: for each mermaid block in a fixture, `validate_mermaid` returns `valid` (optional; slower).

## Related code

- `codewiki/src/be/doc_file_sync.py` — `audit_docs_state`, `run_full_sync` → `metrics` in `sync_issues.json`
- `scripts/batch_sync_metrics.py` — batch presync / mermaid bench
