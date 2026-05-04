# Single block: swap this string to change diagram-language instructions (e.g. non-Mermaid).
# ALL Mermaid-specific syntax, types, keywords, fencing, colors, shapes, and examples
# live here so a migration to another diagram format only touches this one constant.
DIAGRAM_SYNTAX_RULES_SECTION = """
<DIAGRAM_SYNTAX_RULES>
**Diagram language:** Mermaid (replace this entire block if you change diagram format.)

**Allowed diagram types and directions:**
- Use ONLY `graph` or `flowchart` with direction TD, TB, LR, RL, or BT.
  Module docs typically use TD/TB; repository overviews may use LR for horizontal layout.
- DO NOT use `sequenceDiagram`, `classDiagram`, `stateDiagram`, `erDiagram`, `pie`, or any other diagram type.
- Do not use sequence-diagram-only or callback-style syntax in flowchart diagrams.

**Fencing:** Wrap diagrams in ` ```mermaid ` / ` ``` ` fenced code blocks.

**Comments:**
- Comments MUST use %% (double percent). Single % is INVALID and will cause parse errors.
  CORRECT: %% This is a comment
  WRONG:   % This is a comment
- Do NOT use inline comments on edge/node lines. Put comments on their own line.
  CORRECT:
    %% Dependencies
    A --> B
  WRONG:
    A --> B % dependency
- Put `%%` comments on separate lines above the statement; do not append `%%` or other tokens on the same line as an edge.

**Nodes and labels:**
- **Subgraph headers (Mermaid 11):** Every subgraph MUST be `subgraph unique_id["Title Here"]` on one line. Never write bare multi-word titles like `subgraph Agent Core` or `subgraph Foo & Bar` — the parser raises **Syntax error in text**. Use an id + quoted title, and use `and` instead of `&` in titles.
- Subgraph labels must not use reserved words like "end".
- **Parentheses (MOST COMMON ERROR — causes ~90% of parse failures):**
  Any label containing `(`, `)`, or function-call parens MUST use double-quoted brackets `["…"]`.
  CORRECT: `field["Field (Pydantic)"]`
  CORRECT: `cleanup["_cleanup_on_exit()"]`
  CORRECT: `uploader["File Uploader (from provider)"]`
  WRONG:   `field[Field (Pydantic)]`        ← PARSE ERROR (got 'PS')
  WRONG:   `cleanup[_cleanup_on_exit()]`     ← PARSE ERROR (got 'PS')
  WRONG:   `uploader[File Uploader (from provider)]`  ← PARSE ERROR
  Rule of thumb: if the label text has ANY parentheses, always quote it.
- **Pipe characters (`|`):** The `|` character is a Mermaid delimiter. Never use it inside node labels.
  CORRECT: `types["ChatCompletionOutput or StreamOutput"]`
  WRONG:   `types[ChatCompletionOutput | StreamOutput]`  ← PARSE ERROR (got 'PIPE')
  Rewrite with `or`, `/`, a comma, or rephrase.
- **Ampersands (`&`):** The `&` character breaks the Mermaid JS parser inside node labels, edge labels, and subgraph titles — even when quoted. Replace `&` with the word `and` (or rephrase).
  CORRECT: `subgraph grp["User Interaction and Integrations"]`
  WRONG:   `subgraph grp["User Interaction & Integrations"]`
  CORRECT: `node1["Define Agent and Capabilities"]`
  WRONG:   `node1["Define Agent & Capabilities"]`
- **Double colons:** Avoid raw `::` in unquoted node labels (e.g. C++/Rust paths). Use quoted labels `id["a::b"]` or rewrite (e.g. `a / b`, `-`).
- **Single-line rule:** Node definitions and subgraph headers must be entirely on ONE line. Do NOT break `id[…]` or `subgraph id[…]` across multiple lines — the parser emits `got 'STR'` when the label starts on the next line.
  CORRECT: `subgraph cli_ops["CLI Operations"]`
  CORRECT: `provider_abc["Provider (Abstract Base Class)"]`
  WRONG (multiline — PARSE ERROR):
    ```
    subgraph cli_ops[
        "CLI Operations"
    ]
    ```
  WRONG:
    ```
    provider_abc[
        "Provider (Abstract Base Class)"
    ]
    ```
- **Data artifacts:** Use cylinder shape `[("label")]` for stored data nodes.

**Edges and arrows:**
- Allowed arrow types: `-->` (normal), `-.->` (dashed/reference), `==>` (heavy/primary).
  Use `==>` for primary data pipeline, `-->` for normal flow, `-.->` for reads/references.
- Do NOT use reverse arrows (`<--`, `<==`, `<-.->`) — they cause parse errors. Swap source and target instead.
- Do NOT use activation-style arrows such as `--|>` or `---|>`.
- Do NOT use class-diagram inheritance arrows (`<|--`, `<|..`) — these are `classDiagram` syntax and cause `got 'TAGSTART'` in flowcharts.
  WRONG: `Model <|-- WrapperModel`   ← PARSE ERROR
  WRONG: `StreamedResponse <|-- OpenAIStreamedResponse`
  Rewrite as a normal edge with a label: `WrapperModel -->|"inherits"| Model`
- **Edge labels:** Always wrap edge text in `|"…"|` with **no space** between the pipe and the quote:
  CORRECT: `A -->|"label"| B`   `C ==>|"label"| D`   `E -.->|"label"| F`
  WRONG:   `A -->| "label"| B`  (space after first pipe)
  WRONG:   `A --|>|"label"| B`  (activation-style arrow)
  WRONG:   `A ==>\"label\"| B`  (missing pipes / escaped quotes)
- Edge labels must be on the **same line** as the arrow — do not break an edge statement across multiple lines.
- For edge labels with special characters, use quoted edge text: `A -->|"label with (parens)"| B`.

**Click statements:** `click nodeId "file.md"` (optional tooltip `"View …"`). No stray spaces.

**Colors (semantic — apply classDef and class statements):**
- classDef userNode fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e
- classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
- classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
- classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
- classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
Color meanings: Gold = human actor, Blue = interactive read surface, Green = persisted data, Orange = AI-driven creation, Purple = code analysis.

**Styling: nodes only — NEVER style subgraphs:**
- **classDef id must not be the reserved word `class`** — use e.g. `classDef modClass` / `classDef nodeStyle` (Mermaid.js parse error: got 'CLASS').
- Apply `class` ONLY to **node IDs** (identifiers you declare for `id["label"]`, `id(("label"))`, or `id[("label")]`).
- Do **NOT** write `class <subgraph_id> <className>` — that paints the entire group box one flat color and looks bad. Subgraphs are for layout only; leave them unstyled.
- **Do NOT use `:::` inline class attachment** (e.g. `id["Label"]:::class`). It causes `got 'CLASS'` parse errors in flowcharts. Use separate `class` statements at the end of the diagram instead.
  WRONG: `B[A2AConfig]:::class`        ← PARSE ERROR (got 'CLASS')
  WRONG: `Flow[Flow]:::class`
  CORRECT (use a class statement): `class B,Flow analytical`
- After all nodes are defined, use comma-separated node lists: `class viewer,search surface` (correct), not `class ui surface` when `ui` is only a subgraph id (wrong).
- Every colored node must appear in exactly one `class` line (or share a line with other nodes of the same semantic role).

**Reference example (valid diagram):**
```mermaid
flowchart LR
    user(("User"))
    user ==>|"explores"| viewer

    subgraph ui["User Interface"]
        viewer["Web Viewer"]
        search["Search and Navigate"]
    end

    subgraph processing["Processing"]
        parser["Parse Input (Streaming)"]
        validator["validate_schema()"]
    end

    subgraph data_store["Stored Data"]
        docs[("Documentation")]
        index[("Search Index")]
    end

    viewer -->|"reads content"| docs
    search -->|"queries"| index
    viewer -->|"sends request"| parser
    parser -->|"validated data"| validator

    classDef userNode fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e
    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95

    class user userNode
    class viewer,search surface
    class docs,index data
    class parser,validator analytical

    click viewer "user_interface.md" "View UI Module"
    click search "search.md" "View Search Module"
```
Note: `parser["Parse Input (Streaming)"]` and `validator["validate_schema()"]` use quoted brackets because their labels contain parentheses.

These rules reflect automated validation of common Mermaid parse failures.
</DIAGRAM_SYNTAX_RULES>
"""

# Stage 4.6 (doc sync): LLM repairs invalid or placeholder diagrams — prepended before DIAGRAM_SYNTAX_RULES_SECTION.
MERMAID_DIAGRAM_FIX_INSTRUCTIONS = """
<MERMAID_FIX_TASK>
You repair Mermaid `flowchart` / `graph` diagrams so they pass structural validation and match the syntax rules below.
Output ONLY the corrected Mermaid diagram body: no markdown fences, no explanation, no leading/trailing prose.
</MERMAID_FIX_TASK>
"""

SYSTEM_PROMPT = """
<ROLE>
You are an AI documentation assistant. Generate a concise module overview with an architecture diagram. The output is displayed in an interactive viewer — users navigate via diagrams, not prose.
</ROLE>

<OUTPUT_FORMAT>
Create `{module_name}.md` with ONLY these sections — nothing else:

1. `# Title` — a short human-readable title
2. One paragraph (~200 characters, 1-2 sentences) summarizing what this module does. This is shown as hover text in the viewer.
3. `<!-- DIAGRAM_JSON ... -->` block (MANDATORY — see format below)
4. A matching ` ```mermaid ``` ` diagram

Do NOT write `## Architecture`, `## Key Components`, `## Usage`, code examples, or any narrative sections. The viewer only uses the summary paragraph and diagram.
</OUTPUT_FORMAT>

<WORKFLOW>
1. Analyze the provided code components and module structure

2. **MANDATORY: Create sub-modules using `generate_sub_module_documentation`**
   - If you have 3+ components, you MUST create at least 2 sub-modules
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

3. Create `{module_name}.md` with title + summary + DIAGRAM_JSON + mermaid (nothing else)

4. FINAL CHECK: Every sub-module key MUST appear as a node in your DIAGRAM_JSON
</WORKFLOW>

<DIAGRAM_JSON_FORMAT>
MANDATORY — add this block in `{module_name}.md`:
```
<!-- DIAGRAM_JSON
{{
    "direction": "TD",
    "nodes": [
        {{"id": "request_handling", "label": "Handle Incoming Requests", "type": "module", "link": "request_handling.md"}},
        {{"id": "data_processing", "label": "Process and Transform Data", "type": "module", "link": "data_processing.md"}}
    ],
    "edges": [
        {{"source": "request_handling", "target": "data_processing", "label": "validated input"}}
    ],
    "groups": [
        {{"id": "intake", "label": "Intake", "role": "surface", "nodes": ["request_handling"]}},
        {{"id": "core", "label": "Core Logic", "role": "analytical", "nodes": ["data_processing"]}}
    ]
}}
-->
```

Node types: "module" (sub-module with docs), "external" (dependency outside this module)
Group roles: "surface" (blue), "generative" (orange), "analytical" (purple), "data" (green)

GROUPS INTEGRITY (CRITICAL): Every id you list in `groups[].nodes[]` MUST exactly match an `"id"` field in your `nodes[]` array.
Never emit a group with `"nodes": []` — if you cannot populate a group with at least one valid node id, omit that group entirely.

After DIAGRAM_JSON, include matching Mermaid:
```mermaid
flowchart TD
    subgraph intake["Intake"]
        request_handling["Handle Incoming Requests"]
    end
    subgraph core["Core Logic"]
        data_processing["Process and Transform Data"]
    end
    request_handling -->|"validated input"| data_processing
    click request_handling "request_handling.md"
    click data_processing "data_processing.md"
```
</DIAGRAM_JSON_FORMAT>

<DIAGRAM_DESIGN_RULES>
1. GROUPING: Organize nodes into subgraphs by functional role. Max 5 nodes per group.
   Every group's `"nodes"` must be a non-empty list of ids that exist verbatim in your `nodes[]` array. Omit any group you cannot populate.
2. NODE LABELS: Describe what happens, NOT class/file names. Good: "Parse source files". Bad: "DependencyParser".
3. CONNECTIONS: Every arrow MUST have a label. Use ==> for primary flow, --> for normal, -.-> for references.
4. CROSS-MODULE LINKS: Include dependencies on modules outside your siblings as external nodes.
</DIAGRAM_DESIGN_RULES>

""" + DIAGRAM_SYNTAX_RULES_SECTION + """

<NAMING_RULES>
- All names use lowercase_with_underscores: `user_auth`, NOT `UserAuth` or `user-auth`
- Click statements: `click node_id "module_name.md"` — filename must match sub-module name exactly
- NEVER create a sub-module with the same name as the current module
</NAMING_RULES>

<AVAILABLE_TOOLS>
- `str_replace_editor`: Create and edit documentation files
- `read_code_components`: Explore code dependencies not in the provided components
- `generate_sub_module_documentation`: Create sub-module documentation via sub-agents
</AVAILABLE_TOOLS>
""".strip()

LEAF_SYSTEM_PROMPT = """
<ROLE>
You are an AI documentation assistant. Generate a concise module overview with an architecture diagram. The output is displayed in an interactive viewer — users navigate via diagrams, not prose.
</ROLE>

<OUTPUT_FORMAT>
Create `{module_name}.md` with ONLY these sections — nothing else:

1. `# Title` — a short human-readable title
2. One paragraph (~200 characters, 1-2 sentences) summarizing what this module does. This is shown as hover text in the viewer.
3. `<!-- DIAGRAM_JSON ... -->` block (MANDATORY — see format below)
4. A matching ` ```mermaid ``` ` diagram

Do NOT write `## Architecture`, `## Key Components`, `## Usage`, code examples, or any narrative sections. The viewer only uses the summary paragraph and diagram.
</OUTPUT_FORMAT>

<DIAGRAM_JSON_FORMAT>
MANDATORY — you MUST include this block in `{module_name}.md`:

<!-- DIAGRAM_JSON
{{
    "direction": "TD",
    "nodes": [
        {{"id": "parse_input", "label": "Parse Incoming Data", "type": "component", "link": null}},
        {{"id": "validate", "label": "Validate Against Schema", "type": "component", "link": null}},
        {{"id": "config", "label": "Configuration Module", "type": "external", "link": "config.md"}}
    ],
    "edges": [
        {{"source": "parse_input", "target": "validate", "label": "raw data"}},
        {{"source": "validate", "target": "config", "label": "reads schema from"}}
    ],
    "groups": [
        {{"id": "data_flow", "label": "Data Pipeline", "role": "analytical", "nodes": ["parse_input", "validate"]}}
    ]
}}
-->

Node types: "component" (internal, not clickable), "external" (links to other module docs)
Group roles: "surface" (blue), "generative" (orange), "analytical" (purple), "data" (green)

GROUPS INTEGRITY (CRITICAL): Every id you list in `groups[].nodes[]` MUST exactly match an `"id"` field in your `nodes[]` array.
Never emit a group with `"nodes": []` — if you cannot populate a group with at least one valid node id, omit that group entirely.

After DIAGRAM_JSON, include matching Mermaid:
```mermaid
flowchart TD
    subgraph pipeline["Data Pipeline"]
        parse_input["Parse Incoming Data"]
        validate["Validate Against Schema (Pydantic)"]
    end
    config["Configuration Module"]
    parse_input -->|"raw data"| validate
    validate -.->|"reads schema from"| config
```
</DIAGRAM_JSON_FORMAT>

<DIAGRAM_DESIGN_RULES>
1. NODE LABELS: Describe what happens, NOT class/file names. Good: "Parse incoming data". Bad: "DataParser".
   If label has parentheses, MUST quote: `node["func()"]`
2. CONNECTIONS: Every arrow MUST have a label. Use ==> for primary flow, --> for normal, -.-> for references.
3. CROSS-MODULE LINKS: Include dependencies on other modules as external nodes with links.
</DIAGRAM_DESIGN_RULES>

""" + DIAGRAM_SYNTAX_RULES_SECTION + """

<NAMING_RULES>
- All names use lowercase_with_underscores: `user_auth`, NOT `UserAuth`
- Click statements: filename must match module name exactly + .md
- NEVER create a sub-module with the same name as the current module
</NAMING_RULES>

<WORKFLOW>
1. Analyze provided code components and module structure
2. Explore dependencies between components if needed
3. Generate `{module_name}.md` with title + summary + DIAGRAM_JSON + mermaid (nothing else)
</WORKFLOW>

<AVAILABLE_TOOLS>
- `str_replace_editor`: Create and edit documentation files
- `read_code_components`: Explore code dependencies not in the provided components
</AVAILABLE_TOOLS>
""".strip()

USER_PROMPT = """
Generate a diagram and brief summary for the {module_name} module. Output ONLY: title, ~200 char summary, DIAGRAM_JSON, and mermaid diagram. No narrative sections.

<MODULE_TREE>
{module_tree}
</MODULE_TREE>
* All documentation files are in the same folder. Link to siblings: [alt text]([ref_module_name].md)

<CORE_COMPONENT_CODES>
{formatted_core_component_codes}
</CORE_COMPONENT_CODES>
""".strip()

REPO_OVERVIEW_PROMPT = """
You are an AI documentation assistant. Your task is to generate a brief overview of the {repo_name} repository.

Before writing, take a holistic view of the full parsed codebase:
- Who is this software for? What problem does it solve?
- How would a new user or developer actually use it?
- What are the 3-4 main things someone does with this system?
- Frame the overview around user workflows and entry points, not internal code structure or folder layout.
- A small but critical entry point matters more than a large utility module — prioritize by importance to the user, not by size.

The overview should include:
- The purpose of the repository
- A mermaid architecture diagram showing how users interact with the system and how the main functional areas connect
- Each node in the diagram should be clickable and link to its documentation file

IMPORTANT: Use ONLY "flowchart LR" or "flowchart TD" syntax. DO NOT use classDiagram or sequenceDiagram.

<DIAGRAM_DESIGN_RULES>
1. LAYOUT: Use "flowchart LR" (horizontal). Users on the left, system flows right.

2. GROUPING: Organize ALL nodes into 3-4 top-level subgraphs.
   - Each subgraph represents a functional layer (e.g., "User Interface", "Processing Engine", "Data Storage")
   - User entry points float outside groups with distinct styling
   - Max 5 nodes per group. If more, create nested subgroups.

3. OVERVIEW LEVEL: Each functional area appears as a SINGLE collapsed node.
   - This is the 30,000-foot view — detail lives in child docs
   - Cross-group connections connect collapsed nodes, not internals

4. CONNECTIONS:
   - Max 2 cross-group arrows per group pair. Pick the most important data flows.
   - Every arrow MUST have a label describing what flows ("reads structure", "writes docs")
   - Use ==> for primary pipeline, --> for normal, -.-> for references
   - Arrows radiate OUTWARD from user entry points

5. COLORS (semantic — apply classDef and class statements):
   - classDef userNode fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e
   - classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
   - classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
   - classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
   - classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
   Color meanings: Gold = human actor, Blue = interactive read surface, Green = persisted data, Orange = AI-driven creation, Purple = code analysis
   **Apply `class` to each NODE id only.** Do NOT use `class` with a subgraph id (that floods the whole group with one color). List every node: `class nodeA,nodeB generative`. Subgraphs stay visually neutral.

6. NODE LABELS: Describe what happens or what the user sees, NOT class/file names.
   - Good: "Scan source files", "Web Viewer", "Walk tree bottom-up"
   - Bad: "DependencyParser", "ast_parser.py", "AgentOrchestrator"

7. DATA ARTIFACTS: Use cylinder shape [("label")] for stored data.
   - Group artifacts together in their own subgraph
   - One write arrow in (from producer), 1-2 read arrows out (to consumers)
</DIAGRAM_DESIGN_RULES>

Example architecture diagram:
```mermaid
flowchart LR
    user(("User"))
    user ==>|"explores"| viewer

    subgraph ui["User Interface"]
        viewer["Web Viewer"]
        search["Search and Navigate"]
    end

    subgraph data_store["Stored Data"]
        docs[("Documentation")]
        index[("Search Index")]
    end

    viewer -->|"reads content"| docs
    search -->|"queries"| index

    classDef userNode fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#92400e
    classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
    classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46

    class user userNode
    class viewer,search surface
    class docs,index data

    click viewer "user_interface.md" "View UI Module"
    click search "search.md" "View Search Module"
```

The `class` lines above attach styles to **viewer** and **search** (nodes), not to subgraphs **ui** or **data_store**.

<DIAGRAM_JSON_FORMAT>
MANDATORY — you MUST include this block in the output, placed before the mermaid code block:

<!-- DIAGRAM_JSON
{{
    "direction": "LR",
    "nodes": [
        {{"id": "core_building", "label": "Core Program Building", "type": "module", "link": "core_program_building.md"}},
        {{"id": "data_eval", "label": "Data and Evaluation", "type": "module", "link": "data_evaluation.md"}},
        {{"id": "user", "label": "Developer / User", "type": "external", "link": null}}
    ],
    "edges": [
        {{"source": "user", "target": "core_building", "label": "builds programs"}},
        {{"source": "core_building", "target": "data_eval", "label": "feeds examples"}}
    ],
    "groups": [
        {{"id": "system", "label": "System", "nodes": ["core_building", "data_eval"]}}
    ]
}}
-->

Rules:
- Use only module names from AVAILABLE_MODULES as node ids and links.
- Node type "module" for repo modules, "external" for actors/dependencies outside the repo.
- GROUPS INTEGRITY: Every id in `groups[].nodes[]` MUST exist in `nodes[]`. Never emit `"nodes": []`.
</DIAGRAM_JSON_FORMAT>

""" + DIAGRAM_SYNTAX_RULES_SECTION + """

CRITICAL: You can ONLY link to modules that exist in the AVAILABLE_MODULES list below.
DO NOT create links to files that don't exist. DO NOT infer modules from directory structure or component paths.
If there is only one module (e.g., "main"), create a diagram showing the internal architecture without click statements,
or use click statements ONLY for that single module.

<AVAILABLE_MODULES>
{available_modules}
</AVAILABLE_MODULES>

When creating links to module documentation, use the module's markdown file name format: [Module Name](module_name.md). 
For example, if a module is named "chat_module", link to it as [Chat Module](chat_module.md). 
DO NOT link to source code files - only link to the generated markdown documentation files.
ONLY use modules from the AVAILABLE_MODULES list above.

Provide `{repo_name}` repo structure and its core modules documentation:
<REPO_STRUCTURE>
{repo_structure}
</REPO_STRUCTURE>

Please generate the overview of the `{repo_name}` repository in markdown format with the following structure:
<OVERVIEW>
overview_content
</OVERVIEW>
""".strip()

MODULE_OVERVIEW_PROMPT = """
You are an AI documentation assistant. Your task is to generate a brief overview of `{module_name}` module.

The overview should be a brief documentation of the module, including:
- The purpose of the module and what it does for the user
- How the module's components work together, visualized by mermaid diagrams
- The references to the core components documentation

IMPORTANT: Use ONLY "flowchart TD" syntax. DO NOT use classDiagram or sequenceDiagram.

<DIAGRAM_DESIGN_RULES>
1. GROUPING: Organize nodes into 3-4 subgraphs by functional role.
   - Max 5 nodes per group. If more, create nested subgroups.
   - Subgroups follow the same max-5 rule recursively.

2. NODE LABELS: Describe what happens or what the user sees, NOT class/file names.
   - Good: "Parse configuration", "Run validation checks", "Generate output"
   - Bad: "ConfigParser", "validator.py", "OutputGenerator"

3. CONNECTIONS:
   - Every arrow MUST have a label describing what flows
   - Use ==> for primary data flow, --> for normal, -.-> for references
   - Avoid pure linear chains — show real relationships, forks, parallel paths

4. COLORS (semantic):
   - classDef surface fill:#dbeafe,stroke:#3b82f6,stroke-width:2px,color:#1e3a5f
   - classDef data fill:#d1fae5,stroke:#10b981,stroke-width:2px,color:#065f46
   - classDef generative fill:#fed7aa,stroke:#ea580c,stroke-width:1px,color:#7c2d12
   - classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
   Color meanings: Blue = interactive surface, Green = persisted data, Orange = AI-driven creation, Purple = code analysis
   Apply `class` to **node IDs only** — never to subgraph ids (avoids solid-colored group boxes).
</DIAGRAM_DESIGN_RULES>

Example architecture diagram with clickable nodes:
```mermaid
flowchart TD
    subgraph intake["Intake"]
        receiver["Receive Input"]
    end
    subgraph processing["Processing"]
        transform["Transform Data"]
        validate["Validate Output"]
    end
    receiver ==>|"raw input"| transform
    transform -->|"processed data"| validate

    classDef analytical fill:#ede9fe,stroke:#8b5cf6,stroke-width:1px,color:#4c1d95
    class receiver,transform,validate analytical

    click receiver "intake.md" "View Intake"
    click transform "processing.md" "View Processing"
```

<DIAGRAM_JSON_FORMAT>
MANDATORY — include this block in the output, placed before the mermaid code block:

<!-- DIAGRAM_JSON
{{
    "direction": "TD",
    "nodes": [
        {{"id": "intake", "label": "Intake", "type": "module", "link": "intake.md"}},
        {{"id": "processing", "label": "Processing", "type": "module", "link": "processing.md"}}
    ],
    "edges": [
        {{"source": "intake", "target": "processing", "label": "raw input"}}
    ],
    "groups": [
        {{"id": "pipeline", "label": "Pipeline", "nodes": ["intake", "processing"]}}
    ]
}}
-->

Rules:
- Node ids should match the clickable module names in the Mermaid diagram.
- GROUPS INTEGRITY: Every id in `groups[].nodes[]` MUST exist in `nodes[]`. Never emit `"nodes": []`.
</DIAGRAM_JSON_FORMAT>

""" + DIAGRAM_SYNTAX_RULES_SECTION + """

Provide repo structure and core components documentation of the `{module_name}` module:
<REPO_STRUCTURE>
{repo_structure}
</REPO_STRUCTURE>

Please generate the overview of the `{module_name}` module in markdown format with the following structure:
<OVERVIEW>
overview_content
</OVERVIEW>
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
    ".md": "markdown",
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
    ".hpp": "cpp",
    ".cxx": "cpp",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".jsx": "javascript",
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
            
            # Module name
            if is_current:
                lines.append(f"{'  ' * indent}{key} (current module)")
            else:
                lines.append(f"{'  ' * indent}{key}")
            
            # Show full component list for current module and its siblings
            # For other modules, just show count
            if is_current or parent_is_current:
                lines.append(f"{'  ' * (indent + 1)} Core components: {', '.join(value['components'])}")
            else:
                lines.append(f"{'  ' * (indent + 1)} Components: {comp_count} items (use list_module_components to view)")
            
            # Recurse into children
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
    
    Args:
        module_name: Name of the module to document
        core_component_ids: List of component IDs to include
        components: Dictionary mapping component IDs to CodeComponent objects
    
    Returns:
        Formatted user prompt string
    """
    from codewiki.src.config import LARGE_REPO_COMPONENT_THRESHOLD
    import logging
    logger = logging.getLogger(__name__)

    # Count total components to decide formatting approach
    total_components = _count_total_components(module_tree)
    
    # Choose module tree format based on repo size
    if total_components > LARGE_REPO_COMPONENT_THRESHOLD:
        logger.info(f"[PROMPT] Large repo detected ({total_components} components > {LARGE_REPO_COMPONENT_THRESHOLD})")
        logger.info(f"[PROMPT] Using tiered module tree format with summaries")
        formatted_module_tree = _format_module_tree_tiered(module_tree, module_name)
    else:
        formatted_module_tree = _format_module_tree_full(module_tree, module_name)

    # print(f"Formatted module tree:\n{formatted_module_tree}")

    # Group core component IDs by their file path
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
        
        # Get file extension for syntax highlighting
        ext = '.' + path.split('.')[-1] if '.' in path else '.txt'
        lang = EXTENSION_TO_LANGUAGE.get(ext, 'text')
        
        # Include each component's source code (NOT the entire file)
        for component_id in component_ids_in_file:
            component = components[component_id]
            core_component_codes += f"## Component: {component_id}\n"
            if hasattr(component, 'start_line') and hasattr(component, 'end_line'):
                core_component_codes += f"Lines {component.start_line}-{component.end_line}\n"
            core_component_codes += f"```{lang}\n"
            
            # Use component.source_code instead of reading entire file
            if hasattr(component, 'source_code') and component.source_code:
                core_component_codes += component.source_code
            else:
                core_component_codes += f"# Source code not available for {component_id}\n"
            
            core_component_codes += "\n```\n\n"
        
    return USER_PROMPT.format(module_name=module_name, formatted_core_component_codes=core_component_codes, module_tree=formatted_module_tree)



def format_cluster_prompt(potential_core_components: str) -> str:
    """Format the one-shot clustering prompt with the component name list."""
    return CLUSTER_REPO_PROMPT.format(potential_core_components=potential_core_components)