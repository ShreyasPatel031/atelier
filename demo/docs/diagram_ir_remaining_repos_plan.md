# Diagram IR — remaining five demo repos (after dspy)

DSPy was validated with Stage 4.5 diagram IR (pre/post audit in `sync_issues.json`), `apply_diagram_ir_repairs_to_docs_dir`, and `ELK_VALIDATE_REPO=dspy node demo/scripts/validate-elk-all-diagrams.js` (0 failures).

## Per repo

1. Point output at the repo’s docs tree (e.g. `demo/repos/crewai`, …) per your normal `codewiki generate` workflow, **or** run a fresh generation that lands under `demo/repos/<name>/`.
2. Run full sync (runs diagram IR pre-audit, repairs, post-audit, Mermaid 4.5/4.6 when `config` is passed from the main pipeline):
   ```bash
   PYTHONPATH=. python3 -m codewiki.src.be.doc_file_sync demo/repos/<name>
   ```
3. In `sync_issues.json`, check `metrics.measurement_summary["3_diagram_ir"]`:
   - `by_code_post` should be empty or only contain codes you accept as **warn-only** (e.g. `g2_endpoint_is_group_id` for LangChain-style edges).
4. Cross-check ELK + R2 in JS (same repair order as Python):
   ```bash
   ELK_VALIDATE_REPO=<name> node demo/scripts/validate-elk-all-diagrams.js
   ```
5. **Only if** a **new** `by_code` appears that dspy did not show, add a targeted fix in [codewiki/src/be/doc_file_sync.py](codewiki/src/be/doc_file_sync.py) (do not add new modules). Otherwise treat as pass.

## Repos to repeat

- `crewai`
- `langchain`
- `ollama`
- `pydantic-ai`
- `transformers`

## Optional: full ELK smoke (all six)

```bash
node demo/scripts/validate-elk-all-diagrams.js
```

Requires `npm install` (includes `elkjs`).
