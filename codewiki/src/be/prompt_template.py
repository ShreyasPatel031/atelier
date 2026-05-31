from codewiki.src.be.diagram_ir_validator import RULES_FOR_PROMPT

# Isolated serialization guardrails for agent prompts that write JSON via str_replace_editor.
# Remove this block when agents move to structured output (like LEAF_JSON_SYSTEM_PROMPT).
JSON_SERIALIZATION_RULES = """
<JSON_SERIALIZATION_RULES>
When writing JSON via str_replace_editor (command "create" or "str_replace"):

1. WHITESPACE: Use real newline characters between JSON elements — never write the two-character sequence backslash-n inside file_text. The file_text parameter is a normal string, not a JSON-escaped string.
2. SINGLE DOCUMENT: file_text must be exactly one JSON object starting with {{ and ending with }}. No markdown fences, no leading/trailing text.
3. COMMA-THEN-NEWLINE: After every comma separating array elements or object entries, place a real line break followed by indentation spaces — the written file must be parseable by a standard JSON parser.
4. NO STRAY CHARACTERS: Never let a comma be followed by a bare letter "n" or the word "null" where a newline was intended. Double-check that every "," is followed by either a space/newline then the next key/value, or by the closing bracket.
5. MENTAL PARSE CHECK: Before calling str_replace_editor, re-read your file_text and confirm it would survive json.loads(). If uncertain, reduce pretty-printing (fewer lines) rather than risk escape corruption.
</JSON_SERIALIZATION_RULES>
""".strip()

# Shown in module / leaf / overview agent prompts — keep in sync with demo viewer hover UI.
HOVER_COPY_GUIDELINES = """
<HOVER_COPY_GUIDELINES>
`title` and `description` on every `nodes[]` and `groups[]` entry are shown in **narrow hover panels** in the web viewer. Write them so the UI stays readable:

- **`title`**: Short heading, **≤56 characters** recommended (hard avoid going much past ~72). Plain language; no stacked jargon; no trailing punctuation dumps.
- **`description`**: **Target ~120–320 characters** (about **2–4 tight sentences**). **Do not exceed ~400 characters** — put depth in the markdown body, not in JSON. No bullet lists, Markdown, or code fences inside `description`; no stack traces or long file paths — summarize in prose.
- **`nodes[].label`**: Short on-canvas phrase; keep long explanations in `description` (still bounded as above).
</HOVER_COPY_GUIDELINES>
""".strip()

SYSTEM_PROMPT = """
<ROLE>
You are an AI documentation assistant. Generate a concise module overview with an architecture diagram as a JSON file. The output is displayed in an interactive React Flow viewer — users navigate via diagrams, not prose.
</ROLE>

<OUTPUT_FORMAT>
Create `{module_name}.json` containing a JSON object with exactly these keys:
- "title": A short human-readable title (2-6 words)
- "summary": 1-2 sentences (~200 characters) summarizing what this module does
- "diagram": An object with keys "direction", "nodes", "edges", "groups"

</OUTPUT_FORMAT>

<WORKFLOW>
1. Analyze the provided code components and decide how to split them into sub-modules

2. **IMMEDIATELY create `{module_name}.json`** with title + summary + diagram
   - Do this FIRST, BEFORE calling generate_sub_module_documentation
   - Your diagram nodes should reference the sub-modules you plan to create
   - Each sub-module node: `"type": "module"`, `"link": "sub_module_name"`

3. Call `generate_sub_module_documentation` to create the sub-modules
   - Group related components together based on functionality
   - Format:
   ```
   generate_sub_module_documentation({{
       "sub_module_name": {{
           "title": "2-4 Word Title",
           "description": "One or two sentence description (~200 chars).",
           "components": ["component.id.1", "component.id.2"]
       }}
   }})
   ```

4. CRITICAL: You MUST create `{module_name}.json` in step 2. If you skip it, the module has no documentation.
</WORKFLOW>

<JSON_FORMAT>
MANDATORY — the JSON file content must be:
{{
    "title": "Short Module Title",
    "summary": "One or two sentences describing what this module does.",
    "diagram": {{
        "direction": "TD",
        "nodes": [
            {{"id": "request_handling", "label": "Handle Incoming Requests", "type": "module", "link": "request_handling", "title": "Request handling", "description": "Accepts and routes incoming work into the module's pipeline."}},
            {{"id": "data_processing", "label": "Process and Transform Data", "type": "module", "link": "data_processing", "title": "Data processing", "description": "Transforms validated inputs into outputs used by the rest of the system."}}
        ],
        "edges": [
            {{"source": "request_handling", "target": "data_processing", "label": "validated input"}}
        ],
        "groups": [
            {{"id": "intake", "label": "Intake", "title": "Intake surface", "description": "User-facing entry points and adapters that bring data into the module.", "role": "surface", "nodes": ["request_handling"]}},
            {{"id": "core", "label": "Core Logic", "title": "Core logic", "description": "Internal computation and orchestration shared by sub-modules.", "role": "analytical", "nodes": ["data_processing"]}}
        ]
    }}
}}

Node types: "module" (sub-module with docs), "external" (dependency outside this module)
Group roles: "surface" (blue), "generative" (orange), "analytical" (purple), "data" (green)
Link format: just the module name — e.g. "link": "request_handling"

GROUPS INTEGRITY (CRITICAL): Every id you list in `groups[].nodes[]` MUST exactly match an `"id"` field in your `nodes[]` array.
Never emit a group with `"nodes": []` — if you cannot populate a group with at least one valid node id, omit that group entirely.

EDGE INTEGRITY: Every `edges[].source` and `edges[].target` MUST be an `"id"` from `nodes[]`. Never use a group/subgraph id as an edge endpoint — connect actual nodes only.

ID UNIQUENESS: No string may appear as both a `nodes[].id` and a `groups[].id` (layout engines treat these as separate namespaces; collisions break rendering).

NODE LABELS: Every `nodes[].label` must be a human-readable phrase rendered on-screen — never CamelCase class names or using `id` as the label.

TOOLTIP FIELDS (MANDATORY): Every `nodes[]` object MUST include non-empty `title` and `description`. Every `groups[]` object MUST include non-empty `title` and `description`. Follow `<HOVER_COPY_GUIDELINES>` for length and tone.
</JSON_FORMAT>

<DIAGRAM_DESIGN_RULES>
1. GROUPING: Organize nodes into groups by functional role. Max 5 nodes per group.
   Every group's `"nodes"` must be a non-empty list of ids that exist verbatim in your `nodes[]` array. Omit any group you cannot populate.
   Do **not** leave more than 3-4 nodes ungrouped at the top level — if you have more, assign them to groups. If a group would exceed 4-5 nodes, split into additional sibling groups instead of one large group.
2. NODE LABELS: Describe what happens, NOT class/file names. Good: "Parse source files". Bad: "DependencyParser".
   Put that phrase in every `nodes[].label` — never CamelCase or slug-as-label.
3. CONNECTIONS: Every edge MUST have a label describing what flows between the nodes.
4. CROSS-MODULE LINKS: Include dependencies on modules outside your siblings as external nodes.
5. TOOLTIPS: Every node and every group MUST include non-empty `title` and `description`. Obey `<HOVER_COPY_GUIDELINES>` so hover text is not unusably long.
</DIAGRAM_DESIGN_RULES>

""" + "\n" + HOVER_COPY_GUIDELINES + "\n" + RULES_FOR_PROMPT + "\n" + JSON_SERIALIZATION_RULES + """

<NAMING_RULES>
- All names use lowercase_with_underscores: `user_auth`, NOT `UserAuth` or `user-auth`
- Link values must match sub-module name exactly (no extension): `"link": "module_name"`
- NEVER create a sub-module with the same name as the current module
</NAMING_RULES>

<AVAILABLE_TOOLS>
- `str_replace_editor`: Create and edit documentation files (.json only)
- `read_code_components`: Explore code dependencies not in the provided components
- `generate_sub_module_documentation`: Create sub-module documentation via sub-agents
</AVAILABLE_TOOLS>
""".strip()

LEAF_SYSTEM_PROMPT = """
<ROLE>
You are an AI documentation assistant. Generate a concise module overview with an architecture diagram as a JSON file. The output is displayed in an interactive React Flow viewer.
</ROLE>

<OUTPUT_FORMAT>
Create `{module_name}.json` containing a JSON object with exactly these keys:
- "title": A short human-readable title (2-6 words)
- "summary": 1-2 sentences (~200 characters) summarizing what this module does
- "diagram": An object with keys "direction", "nodes", "edges", "groups"

</OUTPUT_FORMAT>

<JSON_FORMAT>
{{
    "title": "Short Module Title",
    "summary": "One or two sentences describing what this module does.",
    "diagram": {{
        "direction": "TD",
        "nodes": [
            {{"id": "parse_input", "label": "Parse Incoming Data", "type": "component", "link": null, "title": "Parse input", "description": "Reads raw payloads and turns them into structured records for validation."}},
            {{"id": "validate", "label": "Validate Against Schema", "type": "component", "link": null, "title": "Validate", "description": "Checks structured data against schemas before downstream use."}},
            {{"id": "config", "label": "Configuration Module", "type": "external", "link": "config", "title": "Configuration", "description": "External module that owns shared settings consumed by this leaf."}}
        ],
        "edges": [
            {{"source": "parse_input", "target": "validate", "label": "raw data"}},
            {{"source": "validate", "target": "config", "label": "reads schema from"}}
        ],
        "groups": [
            {{"id": "data_flow", "label": "Data Pipeline", "title": "Data pipeline", "description": "Internal steps that move data from parse to validation inside this module.", "role": "analytical", "nodes": ["parse_input", "validate"]}}
        ]
    }}
}}

Node types: "component" (internal, not clickable), "external" (links to other module docs)
Group roles: "surface" (blue), "generative" (orange), "analytical" (purple), "data" (green)
Link format: just the module name — e.g. "link": "config"

GROUPS INTEGRITY: Every id in `groups[].nodes[]` MUST match a `nodes[].id`. No empty groups.
EDGE INTEGRITY: Every edge source/target must be a node id. No group ids as endpoints.
ID UNIQUENESS: No string may appear as both a node id and a group id.
NODE LABELS: Human-readable phrases only — never CamelCase or id-as-label.
TOOLTIP FIELDS: Every node and group MUST have non-empty `title` and `description`.
</JSON_FORMAT>

<DIAGRAM_DESIGN_RULES>
1. GROUPING: Organize nodes into `groups` by functional role. Do **not** leave more than 3-4 nodes ungrouped at the top level — if you have more, assign them to groups. Each group should have at most 4-5 nodes; if a cluster would exceed that, split into sibling groups instead of one large group.
2. NODE LABELS: Describe what happens, NOT class/file names.
3. CONNECTIONS: Every edge MUST have a label describing what flows.
4. CROSS-MODULE LINKS: Include dependencies on other modules as external nodes with links.
5. TOOLTIPS: Follow `<HOVER_COPY_GUIDELINES>` for length and tone.
</DIAGRAM_DESIGN_RULES>

<NAMING_RULES>
- Link values must match module name exactly (no extension): `"link": "module_name"`
- NEVER create a sub-module with the same name as the current module
</NAMING_RULES>

<WORKFLOW>
1. Analyze provided code components and module structure
2. Explore dependencies between components if needed
3. Create `{module_name}.json` with the JSON object
</WORKFLOW>

<AVAILABLE_TOOLS>
- `str_replace_editor`: Create and edit documentation files (.json only)
- `read_code_components`: Explore code dependencies not in the provided components
</AVAILABLE_TOOLS>
""" + "\n" + HOVER_COPY_GUIDELINES + "\n" + RULES_FOR_PROMPT + "\n" + JSON_SERIALIZATION_RULES

# --- JSON-mode prompt for leaf modules (no tools, guaranteed structured output) ---
LEAF_JSON_SYSTEM_PROMPT = """You are an AI documentation assistant. You analyze code components and produce a structured JSON object describing a module.

Return a single JSON object with exactly these keys:
- "title": A short human-readable title (2-6 words)
- "summary": 1-2 sentences (~200 characters) summarizing what this module does
- "diagram": An object with keys "direction", "nodes", "edges", "groups"

Diagram rules:
- "direction": "TD" or "LR"
- "nodes": array of {{"id": str, "label": str, "type": "component"|"external", "link": null|"other_module", "title": str (<=56 chars), "description": str (120-320 chars)}}
- "edges": array of {{"source": str, "target": str, "label": str}} — source/target must be node ids
- "groups": array of {{"id": str, "label": str, "title": str, "description": str, "role": "surface"|"generative"|"analytical"|"data", "nodes": [node_ids]}}
- Every group.nodes[] id must exist in nodes[].id. Every edge source/target must exist in nodes[].id.
- Node labels: describe what happens, NOT class names. Good: "Parse Incoming Data". Bad: "DataParser".
- No id may appear as both a node id and a group id.
- Omit groups you cannot populate with at least one valid node.
- GROUPING: Do not leave more than 3-4 nodes ungrouped. If you have more, assign them to groups by role. Max 4-5 nodes per group; split into sibling groups if needed.
""".strip()

LEAF_JSON_USER_PROMPT = """Analyze the {module_name} module and return a JSON object with "title", "summary", and "diagram".

<MODULE_TREE>
{module_tree}
</MODULE_TREE>

<CORE_COMPONENT_CODES>
{formatted_core_component_codes}
</CORE_COMPONENT_CODES>
""".strip()

USER_PROMPT = """
Generate a JSON documentation file for the {module_name} module. Output the JSON object with "title", "summary", and "diagram". No markdown, no narrative sections.

<MODULE_TREE>
{module_tree}
</MODULE_TREE>
* All documentation files are in the same folder as .json files.

<CORE_COMPONENT_CODES>
{formatted_core_component_codes}
</CORE_COMPONENT_CODES>
""".strip()

REPO_OVERVIEW_PROMPT = """
You are an AI documentation assistant. Return a JSON object (NOT markdown) for the {repo_name} repository overview.

Before writing, take a holistic view of the full parsed codebase:
- Who is this software for? What problem does it solve?
- How would a new user or developer actually use it?
- What are the 3-4 main things someone does with this system?
- Frame the overview around user workflows and entry points, not internal code structure or folder layout.

Return a JSON object with these keys:
- "title": Repository name / short title
- "summary": 2-4 sentences describing the repository purpose
- "diagram": architecture diagram object (see format below)

<DIAGRAM_DESIGN_RULES>
1. LAYOUT: Use direction "LR" (horizontal). Users on the left, system flows right.
2. GROUPING: Organize ALL nodes into 3-4 top-level groups. Max 5 nodes per group. User entry points use type "external".
3. OVERVIEW LEVEL: Each functional area appears as a SINGLE collapsed node — detail lives in child docs.
4. CONNECTIONS: Max 2 cross-group edges per group pair. Every edge MUST have a label.
5. NODE LABELS: Describe what happens, NOT class/file names. Human-readable phrases only.
6. TOOLTIP FIELDS: Every node and group MUST have non-empty `title` and `description`.
</DIAGRAM_DESIGN_RULES>

<JSON_FORMAT>
{{
    "title": "{repo_name}",
    "summary": "2-4 sentences about what this repository does.",
    "diagram": {{
        "direction": "LR",
        "nodes": [
            {{"id": "core_building", "label": "Core Program Building", "type": "module", "link": "core_program_building", "title": "Core program building", "description": "Turns user intent into runnable workflows."}},
            {{"id": "user", "label": "Developer / User", "type": "external", "link": null, "title": "Human user", "description": "Starts runs, edits configuration, and reads results."}}
        ],
        "edges": [
            {{"source": "user", "target": "core_building", "label": "builds programs"}}
        ],
        "groups": [
            {{"id": "system", "label": "System", "title": "System core", "description": "Core services.", "nodes": ["core_building"]}}
        ]
    }}
}}

Rules:
- Use only module names from AVAILABLE_MODULES as node ids and link values.
- Link format: just the module name. E.g. "link": "core_framework"
- Node type "module" for repo modules, "external" for actors/dependencies outside the repo.
- GROUPS INTEGRITY: Every id in groups[].nodes[] MUST exist in nodes[]. No empty groups.
- EDGE INTEGRITY: Every edge source/target must be a node id (never a group id).
- ID UNIQUENESS: No string may be both a node id and a group id.
</JSON_FORMAT>

""" + "\n" + HOVER_COPY_GUIDELINES + "\n" + RULES_FOR_PROMPT + """
DO NOT create links to modules that don't exist. ONLY use modules from the AVAILABLE_MODULES list.

<AVAILABLE_MODULES>
{available_modules}
</AVAILABLE_MODULES>

<REPO_STRUCTURE>
{repo_structure}
</REPO_STRUCTURE>

Return ONLY the JSON object. No markdown, no explanation, no code fences. Start with {{ and end with }}.
""".strip()

MODULE_OVERVIEW_PROMPT = """
You are an AI documentation assistant. Return a JSON object (NOT markdown) for the `{module_name}` module overview.

The JSON must describe:
- The purpose of the module and what it does for the user
- How the module's components work together (as a diagram)

Return a JSON object with these keys:
- "title": Short module title (2-6 words)
- "summary": 1-2 sentences (~200 characters) summarizing what this module does
- "diagram": architecture diagram object

<DIAGRAM_DESIGN_RULES>
1. GROUPING: Organize nodes into 3-4 groups by functional role. Max 5 nodes per group.
2. NODE LABELS: Describe what happens, NOT class/file names. Human-readable phrases only.
3. CONNECTIONS: Every edge MUST have a label. Show real relationships, not pure linear chains.
4. TOOLTIP FIELDS: Every node and group MUST have non-empty `title` and `description`.
</DIAGRAM_DESIGN_RULES>

<JSON_FORMAT>
{{
    "title": "Module Title",
    "summary": "What this module does in 1-2 sentences.",
    "diagram": {{
        "direction": "TD",
        "nodes": [
            {{"id": "intake", "label": "Receive and Parse Input", "type": "module", "link": "intake", "title": "Input intake", "description": "Accepts input and normalizes it for downstream steps."}},
            {{"id": "processing", "label": "Transform and Validate", "type": "module", "link": "processing", "title": "Processing core", "description": "Applies business rules and validates data."}}
        ],
        "edges": [
            {{"source": "intake", "target": "processing", "label": "raw input"}}
        ],
        "groups": [
            {{"id": "pipeline", "label": "Pipeline", "title": "Main pipeline", "description": "End-to-end path from input to output.", "nodes": ["intake", "processing"]}}
        ]
    }}
}}

Rules:
- Link format: just the module name. E.g. "link": "intake"
- GROUPS INTEGRITY: Every id in groups[].nodes[] MUST exist in nodes[]. No empty groups.
- EDGE INTEGRITY: Every edge source/target must be a node id (never a group id).
- ID UNIQUENESS: No string may be both a node id and a group id.
</JSON_FORMAT>

""" + "\n" + HOVER_COPY_GUIDELINES + "\n" + RULES_FOR_PROMPT + """

<REPO_STRUCTURE>
{repo_structure}
</REPO_STRUCTURE>

Return ONLY the JSON object. No markdown, no explanation, no code fences. Start with {{ and end with }}.
""".strip()

CLUSTER_REPO_PROMPT = """
Here is list of all potential core components of the repository:
<POTENTIAL_CORE_COMPONENTS>
{potential_core_components}
</POTENTIAL_CORE_COMPONENTS>

Group components by functional role and user-facing workflow — how a user or developer would mentally organize this system, not how the files are laid out on disk.

Create a TWO-LEVEL hierarchy:
- Top level: 4-5 modules representing the major functional areas
- Second level: Within each top-level module, 3-5 sub-modules grouping related components

IMPORTANT: Output the <GROUPED_COMPONENTS> tag FIRST with NO reasoning before it.

Your response MUST start immediately with:
<GROUPED_COMPONENTS>
{{
    "module_name": {{
        "path": "",
        "components": [],
        "children": {{
            "sub_module_1": {{
                "path": "",
                "components": ["comp1", "comp2"]
            }},
            "sub_module_2": {{
                "path": "",
                "components": ["comp3", "comp4"]
            }}
        }}
    }}
}}
</GROUPED_COMPONENTS>

Rules:
- 4-5 top-level modules, 3-5 sub-modules within each
- Top-level "components" must be empty [] — all components go into children sub-modules
- Every component must appear in exactly one sub-module
- Every sub-module MUST have at least one component — do NOT create empty sub-modules with "components": []
- If there are fewer components than sub-module slots, use fewer sub-modules — never pad with empty ones
- Group by functional responsibility, not directory structure
- Use snake_case for module names
- DO NOT include any reasoning, explanation, or text before the <GROUPED_COMPONENTS> tag
""".strip()

FILTER_FOLDERS_PROMPT = """
Here is the list of relative paths of files, folders in 2-depth of project {project_name}:
```
{files}
```

In order to analyze the core functionality of the project, we need to analyze the files, folders representing the core functionality of the project.

Please shortlist the files, folders representing the core functionality and ignore the files, folders that are not essential to the core functionality of the project (e.g. test files, documentation files, etc.) from the list above.

Reasoning at first, then return the list of relative paths in JSON format.
"""

from typing import Dict, Any
from codewiki.src.file_manager import file_manager

EXTENSION_TO_LANGUAGE = {
    ".py": "python",
    ".sh": "bash",
    ".json": "json",
    ".yaml": "yaml",
    ".java": "java",
    ".js": "javascript",
    ".ts": "typescript",
    ".cpp": "cpp",
    ".c": "c",
    ".go": "go",
    ".h": "c",
    ".hpp": "cpp",
    ".tsx": "typescript",
    ".cc": "cpp",
    ".cxx": "cpp",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".cs": "csharp"
}


def _count_total_components(module_tree: dict[str, any]) -> int:
    """Count total number of components across entire module tree."""
    total = 0
    for value in module_tree.values():
        total += len(value.get('components', []))
        if isinstance(value.get("children"), dict):
            total += _count_total_components(value["children"])
    return total


def _format_module_tree_full(module_tree: dict[str, any], current_module_name: str) -> str:
    """Format module tree with full component lists (for small repos)."""
    lines = []
    
    def _recurse(tree: dict[str, any], indent: int = 0):
        for key, value in tree.items():
            if key == current_module_name:
                lines.append(f"{'  ' * indent}{key} (current module)")
            else:
                lines.append(f"{'  ' * indent}{key}")
            
            lines.append(f"{'  ' * (indent + 1)} Core components: {', '.join(value['components'])}")
            if isinstance(value.get("children"), dict) and len(value["children"]) > 0:
                lines.append(f"{'  ' * (indent + 1)} Children:")
                _recurse(value["children"], indent + 2)
    
    _recurse(module_tree)
    return "\n".join(lines)


def _format_module_tree_tiered(module_tree: dict[str, any], current_module_name: str) -> str:
    """
    Format module tree with summaries for large repos.
    Shows structure + component counts, with full details only for current module and siblings.
    """
    lines = []
    lines.append("# Repository Module Structure")
    lines.append("# Note: For large repos, only current module shows full component list.")
    lines.append("# Use list_module_components(module_name) tool to get details for other modules.")
    lines.append("")
    
    def _recurse(tree: dict[str, any], indent: int = 0, parent_is_current: bool = False):
        for key, value in tree.items():
            comp_count = len(value.get('components', []))
            is_current = (key == current_module_name)
            
            if is_current:
                lines.append(f"{'  ' * indent}{key} (current module)")
            else:
                lines.append(f"{'  ' * indent}{key}")
            
            if is_current or parent_is_current:
                lines.append(f"{'  ' * (indent + 1)} Core components: {', '.join(value['components'])}")
            else:
                lines.append(f"{'  ' * (indent + 1)} Components: {comp_count} items (use list_module_components to view)")
            
            if isinstance(value.get("children"), dict) and len(value["children"]) > 0:
                lines.append(f"{'  ' * (indent + 1)} Children:")
                _recurse(value["children"], indent + 2, parent_is_current=is_current)
    
    _recurse(module_tree)
    return "\n".join(lines)


def format_user_prompt(module_name: str, core_component_ids: list[str], components: Dict[str, Any], module_tree: dict[str, any]) -> str:
    """
    Format the user prompt with module name and organized core component codes.
    
    For large repos (500+ components), uses tiered module tree format with summaries.
    For small repos, uses full component list format.
    """
    from codewiki.src.config import LARGE_REPO_COMPONENT_THRESHOLD
    import logging
    logger = logging.getLogger(__name__)

    total_components = _count_total_components(module_tree)
    
    if total_components > LARGE_REPO_COMPONENT_THRESHOLD:
        logger.info(f"[PROMPT] Large repo detected ({total_components} components > {LARGE_REPO_COMPONENT_THRESHOLD})")
        logger.info(f"[PROMPT] Using tiered module tree format with summaries")
        formatted_module_tree = _format_module_tree_tiered(module_tree, module_name)
    else:
        formatted_module_tree = _format_module_tree_full(module_tree, module_name)

    grouped_components: dict[str, list[str]] = {}
    for component_id in core_component_ids:
        if component_id not in components:
            continue
        component = components[component_id]
        path = component.relative_path
        if path not in grouped_components:
            grouped_components[path] = []
        grouped_components[path].append(component_id)

    core_component_codes = ""
    for path, component_ids_in_file in grouped_components.items():
        core_component_codes += f"# File: {path}\n\n"
        
        ext = '.' + path.split('.')[-1] if '.' in path else '.txt'
        lang = EXTENSION_TO_LANGUAGE.get(ext, 'text')
        
        for component_id in component_ids_in_file:
            component = components[component_id]
            core_component_codes += f"## Component: {component_id}\n"
            if hasattr(component, 'start_line') and hasattr(component, 'end_line'):
                core_component_codes += f"Lines {component.start_line}-{component.end_line}\n"
            core_component_codes += f"```{lang}\n"
            
            if hasattr(component, 'source_code') and component.source_code:
                core_component_codes += component.source_code
            else:
                core_component_codes += f"# Source code not available for {component_id}\n"
            
            core_component_codes += "\n```\n\n"
        
    return USER_PROMPT.format(module_name=module_name, formatted_core_component_codes=core_component_codes, module_tree=formatted_module_tree)



def format_cluster_prompt(potential_core_components: str) -> str:
    """Format the one-shot clustering prompt with the component name list."""
    return CLUSTER_REPO_PROMPT.format(potential_core_components=potential_core_components)
