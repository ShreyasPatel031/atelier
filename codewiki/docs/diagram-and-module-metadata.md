# Title, description, and diagram metadata in documentation generation

This doc explains **where** `title` and `description` come from for:

1. **Module docs** (each `*.md` that corresponds to a `module_tree` entry)
2. **Diagram nodes** in the viewer — including **module-linked** nodes and **non-module** nodes (personas, data shapes, etc.)

---

## A. Module-level `title` and `description` (stored in `module_tree.json`)

These describe **the whole module**, not an individual diagram shape.

| Step | Where | What happens |
|------|--------|----------------|
| Generation | LLM writes `module_name.md` | Markdown has a `# Title` heading and body text. |
| Extraction | `codewiki/src/be/module_metadata.py` — `extract_module_metadata_from_markdown()` | **Title**: first `# heading` (trimmed, first ~5 words), or `fallback_title` from filename stem. **Description**: first lines of prose after the heading (up to ~2 sentences, ~200 chars), or a generic sentence. **Diagram**: optional JSON from `<!-- DIAGRAM_JSON ... -->`. |
| Apply to tree | `apply_metadata_to_tree_path()` | Writes `title`, `description`, and optional `diagram` onto the matching node in `module_tree.json`. |
| Call sites | `agent_orchestrator.py` (after each module doc is written), `documentation_generator.py` (parent docs, stage 3) | Same extract + apply pattern. |

So for **modules**, title/description are **always derived from that module’s markdown file**, not from the overview alone.

---

## B. Per–diagram-node `title` and `description` (viewer tooltips)

The static viewer (`demo/index.html`) reads **`<!-- DIAGRAM_JSON ... -->`** from:

- `overview.md` (repo overview diagram), and  
- each module’s `.md` when present,

and builds a map **`nodes[]` → `{ title, description }`** keyed by Mermaid **node `id`** (and by **label** when present).

### B1. Nodes that **also** link to a module (`click` / `link`)

- **Navigation** uses `click node_id "some_module.md"` (or `link` in JSON) → resolves to a **module id**.
- **Tooltip** prefers **`nodes[]` in DIAGRAM_JSON** for that `id`: use **`title`** and **`description`** on that node object.
- If the diagram node omits `description` (or `title`), the viewer can **fill gaps** from **`module_tree` / `moduleMetadata[module_id]`** — i.e. the **module’s** title/description from section A.

So: **authoritative copy for the shape** should live on the **diagram node** in DIAGRAM_JSON; the **module doc** is the fallback when the node doesn’t repeat it.

### B2. Nodes that are **not** modules (personas, cylinders, purely conceptual boxes)

- They **do not** appear as keys in `module_tree.json`.
- Their **only** structured source for tooltip text is **`nodes[]` in DIAGRAM_JSON** in **`overview.md`** (or the doc that owns that diagram): each such shape must have the same **`id`** as in Mermaid and include **`title`** and **`description`**.

Mermaid `click` lines are optional for these nodes.

---

## C. What generators should emit

1. **Every** `overview.md` (or equivalent) that includes an architecture diagram should include a **`<!-- DIAGRAM_JSON -->`** block whose **`nodes`** array lists **every** Mermaid node id used in the diagram, each with at least **`id`**, **`title`**, and **`description`** (and optional **`label`** aligned with the visible label).
2. **Module** markdown files should keep **`#` title + intro** for module-level metadata (section A) and **`nodes[]`** for per-shape tooltips where shapes don’t map 1:1 to the module title (section B).
3. **Post-processing**: `documentation_generator._extract_all_diagrams` copies **DIAGRAM_JSON** from each `*.md` into **`module_tree`** for module files (not `overview`), so structured diagrams are stored on the tree for validation/sync — overview’s JSON is primarily for the viewer and arch-agent when embedded in `overview.md`.

---

## D. File reference

| Concern | Primary file |
|--------|----------------|
| Parse markdown → title, description, diagram JSON | `codewiki/src/be/module_metadata.py` |
| Apply module title/description/diagram to tree | `apply_metadata_to_tree_path()` in same file |
| Extract diagrams from all `.md` into tree | `documentation_generator.py` — `_extract_all_diagrams` |
| Prompts mentioning DIAGRAM_JSON shape | `codewiki/src/be/prompt_template.py` (`LEAF_SYSTEM_PROMPT`, `REPO_OVERVIEW_PROMPT`, parent prompts) |
| Viewer: build `diagramNodeMeta` + tooltips | `demo/index.html` — `buildDiagramNodeMetaMap`, `processNodes` |
