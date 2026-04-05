# Plan: Models (Gemini), Depth, and Prompt Families

Planning only — no code changes. Focus: single-repo (e.g. visualwebarena); Gemini only; prompt families, not individual prompt edits.

---

## 1. Models (Gemini) — What the model has access to

### 1.1 Where Gemini is used

| Use site | Model source | What it does |
|----------|--------------|--------------|
| **Clustering** (Stage 2) | `config.cluster_model` | One-shot `call_llm(prompt, config, model=cluster_model)`. No tools, no multi-turn. Input: CLUSTER_REPO_PROMPT or CLUSTER_MODULE_PROMPT + component list. Output: `<GROUPED_COMPONENTS>` JSON. |
| **Overview / parent docs** (Stage 3) | `config.main_model` (default) | One-shot `call_llm(prompt, self.config)` (no `model=` → main_model). No tools. Input: REPO_OVERVIEW_PROMPT or MODULE_OVERVIEW_PROMPT + repo structure. Output: markdown with `<OVERVIEW>`. |
| **Per-module doc generation** (Stage 4) | `FallbackModel(main_model, fallback_model)` | pydantic-ai `Agent.run(user_prompt, deps=deps)`. Multi-turn; has tools. System prompt: SYSTEM_PROMPT or LEAF_SYSTEM_PROMPT. User message: USER_PROMPT template (module tree + core component code). |
| **Architectural agent** (optional) | `main_model` (GoogleModel) | Read-only Q&A over docs. No doc-generation tools. System prompt: ARCHITECTURAL_AGENT_SYSTEM_PROMPT_TEMPLATE. Input: module tree (text). No tools in current design. |

So for “model interface” we have two kinds: (a) **one-shot call_llm** (clustering, overview), and (b) **Agent with deps + tools** (doc generation, and optionally architectural agent with a different tool set).

### 1.2 What the doc-generation model receives (Gemini via Agent)

**Dependencies (CodeWikiDeps) — all agents:**

- `absolute_docs_path` — where to write .md files  
- `absolute_repo_path` — repo root  
- `registry` — (unused in tools?)  
- `components` — **full dict of all components** (id → Node with source_code, file_path, etc.). This is the full codebase index; the model does not get full source in the prompt, only the slice for the current module.  
- `path_to_current_module` — list of names from root to current module  
- `current_module_name` — name of module being documented  
- `module_tree` — full module tree (nested dict with components, children, title, description)  
- `max_depth` — from config (e.g. 10)  
- `current_depth` — depth of current module in tree  
- `config` — LLM config (models, api key, etc.)

**User message (format_user_prompt):**

- Module name  
- **Module tree** (formatted: full for small repos, tiered/summaries for repos above LARGE_REPO_COMPONENT_THRESHOLD)  
- **Core component codes** for this module only (syntax-highlighted source of `module_info["components"]`)

So by default the model sees: full tree structure + full source only for the current module’s components. It can pull more code only via tools.

### 1.3 Tools available to the doc-generation model

| Tool | Input | What it does | Used when |
|------|--------|----------------|-----------|
| **read_code_components** | `component_ids: list[str]` | Returns `source_code` for each id from `ctx.deps.components`. Fetches by ID only; no path/search. | Always (base_tools). |
| **str_replace_editor** | (search/replace or view ops on files under `absolute_docs_path`) | View/edit documentation files. Same machinery as SWE-agent–style editor (search_replace, etc.). | Always (base_tools). |
| **generate_sub_module_documentation** | `sub_module_specs: dict` (title, description, components per sub-module) | Spawns sub-agents (same model, SYSTEM or LEAF prompt, same deps with updated current_module_name/current_depth). Each sub-agent gets format_user_prompt(…) for its slice. | Only when agent is “complex” (has this tool). |
| **list_module_components** | `module_name: str` | Returns component IDs (and children) for that module from `ctx.deps.module_tree` + `ctx.deps.components`. No source, just IDs/paths. | Only when repo > LARGE_REPO_COMPONENT_THRESHOLD. |
| **get_module_summary** | `module_name: str` | Returns title, description, component count, child names for that module. | Only when repo > LARGE_REPO_COMPONENT_THRESHOLD. |

So the “interface” of the model to code is: (1) initial message with one module’s source + full tree (or tiered tree), (2) read_code_components(ids) to get more source by ID, (3) list_module_components / get_module_summary only in large-repo mode, (4) str_replace_editor to write docs. There is no generic “search codebase” or “code assistant” tool; only ID-based code fetch and doc edit.

### 1.4 What could be added (for planning; not changing)

- **Richer code interface**  
  - Search/grep over code or path-based lookup (e.g. “show me all callers of X”) so the model can discover code beyond component IDs.  
  - “Code assistant” style: file path + range, or symbol-based navigation (e.g. “open definition of function Y”).  
  - These would require new tools and possibly different prompts; currently the model is limited to component IDs and the tree.

- **Architectural agent**  
  - Today: no tools; tree + markdown only. Could give it read_code_components (read-only) so it can cite code when answering, or a dedicated “snippet by symbol” tool.

- **Clustering / overview**  
  - No tools; single prompt/response. Could in theory be multi-step (e.g. “first list top dirs, then group”), but that would be a design change, not a config change.

---

## 2. Depth

### 2.1 Where depth is defined and used

- **Config**  
  - `config.max_depth` — set from `MAX_DEPTH` in config (default 10). Passed into CodeWikiDeps and used as upper bound.  
  - `MIN_DEPTH` (config.py) — constant, default 3. Not in Config dataclass; read directly where needed.

- **Agent creation (agent_orchestrator)**  
  - Root (depth 0): `force_complex = (len(core_component_ids) >= 2)` so the root agent always gets the sub-module tool and can create children.  
  - So depth 0 is forced to “complex” to satisfy MIN_DEPTH below.

- **Sub-agent choice (generate_sub_module_documentations)**  
  - `force_subagent = (current_depth < MIN_DEPTH) and (len(core_component_ids) >= 2)`  
  - `normal_criteria = is_complex_module(...) and (current_depth < max_depth) and (num_tokens >= MAX_TOKEN_PER_LEAF_MODULE)`  
  - If force_subagent or normal_criteria → complex agent (SYSTEM_PROMPT + generate_sub_module_documentation). Else → leaf agent (LEAF_SYSTEM_PROMPT, no sub-module tool).  
  - After running the sub-agent, if force_subagent and the agent created no children and there are ≥2 components, we force an auto-split by directory and recursively call generate_sub_module_documentation on that split.

- **current_depth**  
  - Set in deps when creating the first agent (e.g. 1 for a top-level module). Incremented before each sub-agent run, decremented after.  
  - Used in _auto_split_by_directory (depth level for choosing which path component to group by).

- **documentation_generator**  
  - Processes modules by depth (deepest first). Does not pass depth into prompts; depth only affects which module is being processed and in what order.

- **Auto-split (agent_orchestrator)**  
  - When prompt_tokens > MAX_LLM_CONTEXT and current_depth < MAX_AUTO_SPLIT_DEPTH (5), we auto-split by directory and inject children into the tree. So depth also gates whether we’re allowed to auto-split.

### 2.2 Depth levers (planning)

| Lever | Where | Effect |
|-------|--------|--------|
| **MIN_DEPTH** | config.py | How many levels we force before allowing “leaf”. Bigger → more mandatory nesting and more sub-agent runs. |
| **MAX_DEPTH** | config.py → Config.max_depth | Hard cap on depth; agents stop getting the sub-module tool when current_depth >= max_depth. |
| **force_complex at root** | agent_orchestrator | Kept as-is if we want to keep MIN_DEPTH meaningful; otherwise root could become leaf when only one file. |
| **force_subagent / normal_criteria** | generate_sub_module_documentations | Balance of “always push to MIN_DEPTH” vs “only split when complex and over token threshold”. |
| **MAX_AUTO_SPLIT_DEPTH** | agent_orchestrator (hardcoded 5) | Beyond this depth we don’t auto-split even if over context; could be made configurable. |

For a single repo (e.g. visualwebarena) with modest size, the main knobs are MIN_DEPTH and MAX_DEPTH; the rest matter if we want to tune “when to stop splitting” or “when to force one more level.”

---

## 3. Prompt families (no individual edits)

Group prompts by role so we can plan changes by family, not by single string.

### 3.1 Clustering family

- **CLUSTER_REPO_PROMPT** — root-level grouping: “here are potential core components, output <GROUPED_COMPONENTS> first, group by path and logic, 5–50 per module, snake_case, skip tests.”  
- **CLUSTER_MODULE_PROMPT** — same but for a sub-module: “here is current module tree and potential components for this module, output <GROUPED_COMPONENTS> for sub-modules.”

Planning: any change to “how we ask for grouping” (granularity, naming, what to skip, or output format) should be done consistently across this family. Optionally one shared base + small overlay for root vs module.

### 3.2 Doc-generation agent family (per-module docs + diagrams)

- **SYSTEM_PROMPT** — non-leaf: role, objectives, doc structure, sub-module format, diagram rules (graph TD only, DIAGRAM_JSON, “every sub-module as node”), naming rules, workflow (“create sub-modules then main .md”), validation checklist, available tools.  
- **LEAF_SYSTEM_PROMPT** — leaf: same role/objectives but no sub-module tool; diagram for components/externals only; same naming; tools list without generate_sub_module_documentation.  
- **USER_PROMPT** — template for the user message: “generate docs for {module_name}”, placeholders for module tree and core component codes.

Planning: treat SYSTEM + LEAF as one family (doc-and-diagram agent). Changes to diagram rules, structure, or tool descriptions should align across both. USER_PROMPT is the “task” slice; SYSTEM/LEAF are the “instructions” slice.

### 3.3 Overview / parent-doc family

- **REPO_OVERVIEW_PROMPT** — repo-level overview: purpose, one mermaid diagram, clickable nodes, only link to AVAILABLE_MODULES, example, repo structure.  
- **MODULE_OVERVIEW_PROMPT** — same idea for a parent module: purpose, mermaid, references to sub-module docs, repo structure.

Planning: overviews are one-shot (no tools). Any change to “what an overview contains” or “how diagrams look at this level” should be consistent across this family. Could share a base and vary repo vs module slightly.

### 3.4 Architectural agent family

- **ARCHITECTURAL_AGENT_SYSTEM_PROMPT_TEMPLATE** — short Q&A assistant over tree + docs; no code; no tools. Single template with {module_tree}.

Planning: separate from doc generation. If we add tools (e.g. read_code_components) or change persona, that’s the only member of this family for now.

### 3.5 Optional / unused

- **FILTER_FOLDERS_PROMPT** — “shortlist files that represent core functionality.” Not used in the main parser path today; if we ever use it, it becomes its own small family or is folded into clustering.

---

## 4. Summary for “plan only”

- **Models (Gemini)**  
  - List what each use gets: clustering (one-shot, no tools), overview (one-shot, no tools), doc agent (Agent with deps + tools), architectural (Agent, no tools).  
  - Doc agent’s interface to code: initial module source + tree, then read_code_components(ids), list/get_module only in large-repo mode, str_replace_editor for docs. No search or code-assistant style yet; list that as a possible extension.  
  - All model wiring (which model for cluster vs main vs fallback) is already in config; no doc change needed beyond this list.

- **Depth**  
  - Levers: MIN_DEPTH, MAX_DEPTH, force_complex at root, force_subagent vs normal_criteria, MAX_AUTO_SPLIT_DEPTH.  
  - For one repo, MIN_DEPTH and MAX_DEPTH are the main knobs; the rest matter for tuning when to split or force one more level.

- **Prompts**  
  - Plan by families: Clustering (CLUSTER_REPO + CLUSTER_MODULE), Doc agent (SYSTEM + LEAF + USER), Overview (REPO_OVERVIEW + MODULE_OVERVIEW), Architectural (single template).  
  - Decide changes per family (e.g. “tighten diagram rules in doc family” or “unify overview format”) rather than one-off edits.

No code or config changes in this doc; it’s the plan and inventory only.
