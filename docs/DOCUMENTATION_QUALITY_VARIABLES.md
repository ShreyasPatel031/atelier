# Variables That Affect Documentation Quality

This document lists the main variables you can change to influence the outcome of documentation generation. They are grouped by **pipeline stage** and by **how to change them** (config vs code).

---

## 1. Config / CLI / env (no code edits)

These are set via environment variables, `codewiki config`, or (for some) future CLI flags.

| Variable | Where | Effect on quality |
|----------|--------|-------------------|
| **main_model** | `config.py` (env `MAIN_MODEL`), CLI config | Model used for doc generation. Better models → better prose and diagram choices. |
| **cluster_model** | `config.py` (env `CLUSTER_MODEL`), CLI config | Model used for clustering (Stage 2). Affects module grouping and tree shape. |
| **fallback_model** | `config.py` (env `FALLBACK_MODEL_1`) | Used when main/cluster fails. |
| **max_depth** | `Config` (from `config.py` → `MAX_DEPTH`) | Max recursion depth for clustering. Passed into pipeline; currently always `MAX_DEPTH` (10). |

---

## 2. Central constants (`codewiki/src/config.py`)

Edit these to change behavior without touching the rest of the codebase.

### Stage 1 – Components / entry points

| Variable | Default | Effect |
|----------|---------|--------|
| **MAX_ENTRY_POINTS** | 300 | Max number of entry points (nodes) passed into clustering. Lower = fewer components in the tree, faster clustering; higher = more coverage, more risk of truncation. |

### Stage 2 – Clustering (module tree)

| Variable | Default | Effect |
|----------|---------|--------|
| **MAX_DEPTH** | 10 | Maximum recursion depth for clustering. |
| **MIN_DEPTH** | 3 | Minimum depth; agents are forced to create sub-modules until this depth. Higher = more levels and finer granularity. |
| **MAX_TOKEN_PER_MODULE** | 32_768 | If a module’s components fit in this many tokens, it can stay one leaf; otherwise the LLM is asked to split. Lower = more splitting. |
| **MAX_TOKEN_PER_LEAF_MODULE** | 16_000 | Threshold for delegating to sub-agents in Stage 4 (doc generation). |
| **MIN_COMPONENTS_FOR_CLUSTERING** | 3 | Fewer than this → no LLM clustering (avoids tiny modules). |
| **SYSTEM_PROMPT_TOKENS** | 3_000 | Reserved for clustering system prompt when computing context. |
| **SAFETY_BUFFER_PERCENT** | 0.10 | 10% buffer when computing max clustering tokens. |
| **TOKENS_PER_NODE_INPUT** | 25 | Estimated tokens per node in clustering input. |
| **TOKENS_PER_NODE_OUTPUT** | 40 | Estimated tokens per node in clustering output (~max nodes = output_limit / 40). |

### Model context / output limits

| Variable | Effect |
|----------|--------|
| **MODEL_CONTEXT_WINDOWS** | Input context size per model; used to derive max clustering input tokens. |
| **MODEL_OUTPUT_LIMITS** | Max output tokens per model; caps clustering response size and thus effective max nodes. |
| **DEFAULT_CONTEXT_WINDOW** / **DEFAULT_OUTPUT_LIMIT** | Used for unknown models. |

### Stage 3 / 4 – Doc generation (large repos)

| Variable | Default | Effect |
|----------|---------|--------|
| **LARGE_REPO_COMPONENT_THRESHOLD** | 500 | Above this, tiered module tree + summaries are used in the prompt. |
| **BEHEMOTH_REPO_COMPONENT_THRESHOLD** | 2000 | Above this, on-demand loading (e.g. `list_module_components`) is used. |
| **MAX_MODULE_TREE_TOKENS** | 10_000 | Max tokens for module tree in the doc-agent prompt when using tiered format. |

---

## 3. Clustering retry / truncation (`codewiki/src/be/cluster_modules.py`)

| Variable | Default | Effect |
|----------|---------|--------|
| **MAX_RETRIES_PER_SIZE** | 3 | Retries per “node set size” before reducing nodes. |
| **MAX_REDUCTION_ROUNDS** | 5 | How many times we reduce nodes and retry after failures. |
| **REDUCTION_FACTOR** | 0.7 | After each reduction, keep 70% of nodes. |
| **MAX_OUTPUT_TOKENS** (local) | 65_536 | Used to detect truncated clustering response (Gemini 2.5 Flash limit). |
| Truncation safety margin | 5000 | `max_tokens - 5000` when truncating clustering prompt. |

---

## 4. What gets analyzed (Stage 1) – include / exclude

### File/dir patterns

- **`codewiki/src/be/dependency_analyzer/utils/patterns.py`**
  - **DEFAULT_IGNORE_PATTERNS**: Dirs/files never analyzed (e.g. `node_modules`, `__pycache__`, `examples`, lockfiles, build artifacts). Adding patterns here excludes more from the component set and thus from diagrams.
  - **DEFAULT_INCLUDE_PATTERNS**: File extensions considered (e.g. `*.py`, `*.js`, `*.ts`). Shrinking this reduces which files become components.

- **`codewiki/src/be/dependency_analyzer/analysis/call_graph_analyzer.py`**
  - **excluded_dirs** (in `extract_code_files`): Extra dirs skipped during call-graph extraction (`node_modules`, `vendor`, `.git`, `__pycache__`, `.venv`, `dist`, `build`, etc.). Hardcoded in that method.

- **`codewiki/src/be/dependency_analyzer/ast_parser.py`**
  - **include_patterns** / **exclude_patterns** passed into `AnalysisService._analyze_structure` are currently `None`, so the analyzer uses the defaults above. Changing that call would allow repo-specific include/exclude.

---

## 5. Prompts (diagram and doc quality)

All in **`codewiki/src/be/prompt_template.py`**. Editing these changes what the model is asked to produce (and thus diagram structure, completeness, and prose).

| Name | Stage | Effect |
|------|--------|--------|
| **SYSTEM_PROMPT** | Doc generation (non-leaf) | Instructions for structure, sub-modules, diagrams, DIAGRAM_JSON, Mermaid, naming. Strong lever for diagram quality and consistency. |
| **LEAF_SYSTEM_PROMPT** | Doc generation (leaf) | Same for leaf modules (no sub-modules). Diagram rules for components/externals. |
| **REPO_OVERVIEW_PROMPT** / **MODULE_OVERVIEW_PROMPT** | Overview / parent docs | What goes into overview and parent module docs. |
| **USER_PROMPT** | Doc generation | Template for the user message (module name, code, module tree). |
| **CLUSTER_REPO_PROMPT** | Clustering (root) | How to group components into top-level modules; “5–50 components each”, snake_case, skip tests. |
| **CLUSTER_MODULE_PROMPT** | Clustering (nested) | How to split a module into sub-modules. |
| **FILTER_FOLDERS_PROMPT** | (Optional) folder filtering | Not currently used by the main parser path; would filter which paths are “core”. |

Diagram-specific instructions live inside **SYSTEM_PROMPT** and **LEAF_SYSTEM_PROMPT** (e.g. “graph TD only”, “every sub-module as a node”, DIAGRAM_JSON format, validation checklist). Changing those directly affects diagram completeness and format.

---

## 6. Agent behavior (Stage 3 / 4)

| Where | What | Effect |
|-------|------|--------|
| **config.py** | **LARGE_REPO_COMPONENT_THRESHOLD** (500) | When to switch to tiered module tree in the prompt. |
| **config.py** | **BEHEMOTH_REPO_COMPONENT_THRESHOLD** (2000) | When to add `list_module_components` / on-demand loading. |
| **agent_orchestrator.py** | **is_complex_module** | Uses “number of distinct files” > 1. Only file count, not tokens. |
| **agent_orchestrator.py** | **force_complex** (root, ≥2 components) | Forces sub-module creation at root to satisfy MIN_DEPTH. |
| **agent_orchestrator.py** | Tool list | Complex agents get `generate_sub_module_documentation_tool`; large repos get `list_module_components_tool` and `get_module_summary_tool`. |

---

## 7. Summary: levers for “better docs / fewer wrong diagrams”

- **More/better components:** Relax **DEFAULT_IGNORE_PATTERNS** or **excluded_dirs** (or add include/exclude at parse time). Increase **MAX_ENTRY_POINTS** if you want more entry points in clustering.
- **Finer/coarser module tree:** **MIN_DEPTH**, **MAX_TOKEN_PER_MODULE**, **MAX_TOKEN_PER_LEAF_MODULE**, and clustering prompts (“5–50 components”, “group by directory”).
- **Fewer truncation / clustering failures:** **MODEL_OUTPUT_LIMITS** (or model choice), **MAX_ENTRY_POINTS**, **REDUCTION_FACTOR**, **MAX_RETRIES_PER_SIZE**, **MAX_REDUCTION_ROUNDS**, and the truncation margin (5000) in `cluster_modules`.
- **Diagram content and consistency:** **SYSTEM_PROMPT** and **LEAF_SYSTEM_PROMPT** in `prompt_template.py` (DIAGRAM_JSON rules, “every sub-module as node”, examples).
- **Doc quality for huge repos:** **LARGE_REPO_COMPONENT_THRESHOLD**, **BEHEMOTH_REPO_COMPONENT_THRESHOLD**, **MAX_MODULE_TREE_TOKENS**, and the tiered vs full tree logic in `format_user_prompt`.
- **Model quality:** **main_model** and **cluster_model** (and fallbacks) via config/env.

All of the above are the main variables that can be changed to change the outcome of documentation (and diagram) quality.
