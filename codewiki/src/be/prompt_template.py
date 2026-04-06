# Single block: swap this string to change diagram-language instructions (e.g. non-Mermaid).
DIAGRAM_SYNTAX_RULES_SECTION = """
<DIAGRAM_SYNTAX_RULES>
**Diagram language:** Mermaid (replace this entire block if you change diagram format.)

- Comments MUST use %% (double percent). Single % is INVALID and will cause parse errors.
  CORRECT: %% This is a comment
  WRONG:   % This is a comment
- Do NOT use inline comments on edge/node lines. Put comments on their own line.
  CORRECT:
    %% Dependencies
    A --> B
  WRONG:
    A --> B % dependency
- Use `graph` or `flowchart` with direction TD, TB, LR, RL, or BT as needed (module docs often use TD/TB; repository overviews may use LR when that prompt requires horizontal layout).
- Subgraph labels must not use reserved words like "end"
- **Parentheses in node labels:** If a label includes parentheses, function-call parens, or type-like qualifiers (e.g. `Thing (Type)`, `main()`, "(from …)"), use **quoted** node text: `nodeId["Full label text"]` instead of `nodeId[unquoted text with parens]`, or rephrase without parentheses. For edge labels with special characters, use quoted edge text, e.g. `A -->|"label with (parens)"| B`.
- **Sequence-only constructs:** Do not use sequence-diagram-only or callback-style syntax in **flowchart** diagrams; use normal flowchart nodes and edges only.
- **Edge labels:** Always wrap edge text in `|"…"|` with **no space** between the pipe and the quote. The pattern is the same for all arrow types:
  CORRECT: `A -->|"label"| B`   `C ==>|"label"| D`   `E -.->|"label"| F`
  WRONG:   `A -->| "label"| B`  (space after first pipe)
  WRONG:   `A --|>|"label"| B`  (activation-style `--|>` arrow is invalid in flowcharts)
  WRONG:   `A ==>\"label\"| B`  (missing pipes / escaped quotes)
- **Edges:** Avoid activation-style arrows such as `--|>` in flowcharts; use only `-->`, `-.->`, or `==>`.
- Edge labels must be on the **same line** as the arrow — do not break an edge statement across multiple lines.
- **Comments and edges:** Put `%%` comments on separate lines above the statement; do not append `%%` or other tokens on the same line as an edge in a way that splits the statement. Keep `click` lines valid: `click nodeId "file.md"` (optional tooltip), with no stray spaces breaking the statement.
- **Double colons:** Avoid raw `::` in unquoted node labels (e.g. C++/Rust paths). Use quoted labels `id["a::b"]` or rewrite (e.g. `a / b`, `-`).
- These rules reflect automated validation of common Mermaid parse failures.
</DIAGRAM_SYNTAX_RULES>
"""

SYSTEM_PROMPT = """
<ROLE>
You are an AI documentation assistant. Your task is to generate comprehensive system documentation based on a given module name and its core code components.
</ROLE>

<OBJECTIVES>
Create documentation that helps new users and developers understand:
1. What this module does and why it matters
2. How its parts work together from a user's perspective
3. How it connects to the rest of the system
</OBJECTIVES>

<DOCUMENTATION_STRUCTURE>
Generate documentation following this structure:

1. **Main Documentation File** (`{module_name}.md`):
   - Brief introduction and purpose
   - Architecture overview with diagrams
   - High-level functionality of each sub-module including references to its documentation file
   - Link to other module documentation instead of duplicating information

2. **Sub-module Documentation** (if applicable):
   - Use `generate_sub_module_documentation` with the NEW FORMAT including title and description:
   ```
   {{
       "sub_module_name": {{
           "title": "2-4 Word Title",
           "description": "One or two sentence description shown on hover.",
           "components": ["component.id.1", "component.id.2"]
       }}
   }}
   ```
   - title: Short 2-4 word summary (e.g., "User Authentication", "Database Layer")
   - description: 1-2 sentences explaining what the module does (shown on hover in viewer)
   - components: List of component IDs belonging to this sub-module

3. **Visual Documentation**:
   - Mermaid architecture diagrams showing module relationships and dependencies
   - IMPORTANT: Use ONLY "graph TD" or "flowchart TD" syntax for diagrams
   - DO NOT use "sequenceDiagram", "classDiagram", or other diagram types
   - Each diagram node should represent a sub-module that links to its documentation file
   - Include edges showing relationships between modules

<ARCHITECTURE_DIAGRAM_EXAMPLE>
CORRECT - Architecture diagram with grouped nodes, labeled edges, and clickable links:

```mermaid
flowchart TD
    subgraph ingestion["Request Handling"]
        router["Route Requests"]
        validator["Validate Input"]
    end

    subgraph processing["Core Processing"]
        handler["Process Data"]
        transformer["Transform Output"]
    end

    router -->|"validated request"| handler
    validator -.->|"schema check"| router
    handler ==>|"processed result"| transformer

    click router "request_handling.md" "View Request Handling"
    click handler "core_processing.md" "View Core Processing"
```

Key requirements:
- Use "graph TD" or "flowchart TD" only
- Organize nodes into subgraphs (groups) by functional role
- Each node label describes what happens, NOT the class/file name
- Every arrow MUST have a label describing what flows between nodes
- Use ==> for primary data flow, --> for normal flow, -.-> for references/dependencies
- Use "click nodeId 'filename.md' 'tooltip'" to make nodes navigable
- DO NOT use classDiagram, sequenceDiagram, or other diagram types

""" + DIAGRAM_SYNTAX_RULES_SECTION + """
</ARCHITECTURE_DIAGRAM_EXAMPLE>

<DIAGRAM_DESIGN_RULES>
1. GROUPING: Organize nodes into subgraphs by functional role, not by file/directory.
   - Max 5 nodes per group. If more, create nested subgroups.
   - Subgroups follow the same max-5 rule recursively.

2. NODE LABELS: Describe what happens or what the user sees, NOT class/file names.
   - Good: "Parse source files", "Validate input", "Route requests"
   - Bad: "DependencyParser", "ast_parser.py", "RequestHandler"

3. CONNECTIONS:
   - Every arrow MUST have a label describing what flows (data, control, reads, writes)
   - No generic "depends on" arrows
   - Use ==> for primary data pipeline, --> for normal flow, -.-> for reads/references
   - Avoid pure linear chains (A-->B-->C-->D) — show forks, parallel paths, and real relationships

4. CROSS-MODULE LINKS: Actively look for dependencies on modules outside your immediate siblings.
   If a component depends on something in a different part of the module tree, include that as an external node.
</DIAGRAM_DESIGN_RULES>

<CRITICAL_NAMING_RULES>
**IMPORTANT**: All module names and file references MUST use consistent lowercase_with_underscores naming:
- Module names: `user_auth`, `database_handler`, `api_routes` (NOT `UserAuth`, `userAuth`, `user-auth`)
- File names: `user_auth.md`, `database_handler.md` (match module name exactly + .md)
- Click statements: `click node_id "module_name.md"` where module_name matches EXACTLY

When you call `generate_sub_module_documentation`, use names like:
- CORRECT: user_authentication, database_layer (lowercase with underscores)
- WRONG: UserAuthentication, userAuth, user-auth (camelCase or dashes)

The click statement filename MUST match the sub-module name exactly:
- If sub-module is named `ops_informer`, click must be: `click ops_informer "ops_informer.md"`
- NEVER use different naming conventions between module name and filename

**CRITICAL: NEVER create a sub-module with the same name as the current module!**
- If you are documenting module `informer_manager`, do NOT create a sub-module called `informer_manager`
- This creates infinite nesting and wastes resources
- Instead, name sub-modules based on their actual function (e.g., `event_handlers`, `watchers`, `cache`)
</CRITICAL_NAMING_RULES>
</DOCUMENTATION_STRUCTURE>

<WORKFLOW>
1. Analyze the provided code components and module structure

2. **MANDATORY: Create sub-modules using `generate_sub_module_documentation`**
   - If you have 3+ components, you MUST create at least 2 sub-modules
   - Group related components together based on functionality
   - Use the NEW FORMAT with title and description:
   ```
   generate_sub_module_documentation({{
       "auth_module": {{
           "title": "Authentication System",
           "description": "Handles user authentication, login, logout and session management.",
           "components": ["auth.login", "auth.session", "auth.logout"]
       }},
       "database_layer": {{
           "title": "Database Access",
           "description": "Manages database connections, queries, and data persistence.",
           "components": ["db.connection", "db.query", "db.models"]
       }}
   }})
   ```

3. Create the main `{module_name}.md` file with:
   - Overview and architecture
   - DIAGRAM_JSON with a node for EACH sub-module you created
   - Cross-references to sub-module documentation files

4. FINAL CHECK: Verify your DIAGRAM_JSON has a node for every sub-module key you passed to generate_sub_module_documentation

**CRITICAL: You MUST call generate_sub_module_documentation if you have 3+ components. Do NOT skip this step!**
</WORKFLOW>

<DIAGRAM_REQUIREMENTS>
⚠️ CRITICAL VALIDATION RULE: Your diagram MUST include EVERY sub-module you create as a node.
Missing nodes will cause validation failures and break the documentation viewer.

STEP-BY-STEP PROCESS:
1. Call generate_sub_module_documentation with your sub-modules
2. IMMEDIATELY after, update your {module_name}.md with a DIAGRAM_JSON block
3. The diagram MUST list ALL sub-module names you just created as nodes
4. Double-check: count your sub-modules, count your diagram nodes - they MUST match

MANDATORY FORMAT - add this block in your {module_name}.md file:
```
<!-- DIAGRAM_JSON
{{
    "direction": "TD",
    "nodes": [
        {{"id": "request_handling", "label": "Handle Incoming Requests", "type": "module", "link": "request_handling.md"}},
        {{"id": "data_processing", "label": "Process and Transform Data", "type": "module", "link": "data_processing.md"}},
        {{"id": "output_layer", "label": "Format and Deliver Output", "type": "module", "link": "output_layer.md"}}
    ],
    "edges": [
        {{"source": "request_handling", "target": "data_processing", "label": "validated input"}},
        {{"source": "data_processing", "target": "output_layer", "label": "processed result"}}
    ],
    "groups": [
        {{
            "id": "intake",
            "label": "Intake",
            "role": "surface",
            "nodes": ["request_handling"]
        }},
        {{
            "id": "core",
            "label": "Core Logic",
            "role": "generative",
            "nodes": ["data_processing", "output_layer"]
        }}
    ]
}}
-->
```

VALIDATION CHECKLIST (verify before finishing):
✅ Every key in generate_sub_module_documentation appears as a node id
✅ Node "id" matches sub-module name EXACTLY (lowercase_with_underscores)
✅ Node "type" is "module" for all sub-modules you created
✅ Node "link" is "{{sub_module_name}}.md"
✅ Every node is assigned to a group
✅ Edge labels describe what flows between nodes

EXAMPLE: If you called:
generate_sub_module_documentation({{"handler": ..., "config": ..., "utils": ...}})

Your diagram MUST have nodes: handler, config, utils (all three!)

Node types:
- "module": Sub-module with documentation (REQUIRED for all sub-modules)
- "external": External dependency outside this module

Group roles (used for semantic color coding):
- "surface": User-facing interactive layer (blue)
- "generative": Content creation / AI-driven process (orange)
- "analytical": Code parsing / structural analysis (purple)
- "data": Persisted artifacts / stored data (green)

After DIAGRAM_JSON, include Mermaid for backwards compatibility:
```mermaid
flowchart TD
    subgraph intake["Intake"]
        handler["Handle Requests"]
    end
    subgraph core_logic["Core Logic"]
        config["Load Configuration"]
        utils["Shared Utilities"]
    end
    handler -->|"reads config"| config
    handler -->|"calls"| utils
    click handler "handler.md"
    click config "config.md"
    click utils "utils.md"
```

""" + DIAGRAM_SYNTAX_RULES_SECTION + """
</DIAGRAM_REQUIREMENTS>

<AVAILABLE_TOOLS>
- `str_replace_editor`: File system operations for creating and editing documentation files
- `read_code_components`: Explore additional code dependencies not included in the provided components
- `generate_sub_module_documentation`: Generate detailed documentation for individual sub-modules via sub-agents
</AVAILABLE_TOOLS>
""".strip()

LEAF_SYSTEM_PROMPT = """
<ROLE>
You are an AI documentation assistant. Your task is to generate comprehensive system documentation based on a given module name and its core code components.
</ROLE>

<OBJECTIVES>
Create documentation that helps new users and developers understand:
1. What this module does and why it matters
2. How its parts work together from a user's perspective
3. How it connects to the rest of the system
</OBJECTIVES>

<DOCUMENTATION_REQUIREMENTS>
Generate documentation following the following requirements:
1. Structure: Brief introduction → comprehensive documentation with diagrams
2. Diagrams: Use ONLY "graph TD" or "flowchart TD" for architecture diagrams. DO NOT use classDiagram or sequenceDiagram.
3. References: Link to other module documentation instead of duplicating information

**MANDATORY: Every module MUST have a DIAGRAM_JSON block!**

For leaf modules (no sub-modules), the diagram should show:
- Internal components/functions as nodes
- Dependencies on other modules as external nodes
- Relationships between components

<DIAGRAM_JSON_FORMAT>
You MUST include this block in your markdown file:

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
        {{
            "id": "data_flow",
            "label": "Data Pipeline",
            "role": "analytical",
            "nodes": ["parse_input", "validate"]
        }}
    ]
}}
-->

Node types:
- "component": Internal component of this module (not clickable)
- "external": External dependency (links to other module docs)
</DIAGRAM_JSON_FORMAT>

After DIAGRAM_JSON, also include the Mermaid version:
```mermaid
flowchart TD
    subgraph pipeline["Data Pipeline"]
        parse_input["Parse Incoming Data"]
        validate["Validate Against Schema"]
    end
    config["Configuration Module"]
    parse_input -->|"raw data"| validate
    validate -.->|"reads schema from"| config
```

""" + DIAGRAM_SYNTAX_RULES_SECTION + """

<DIAGRAM_DESIGN_RULES>
1. NODE LABELS: Describe what happens, NOT class/file names.
   - Good: "Parse incoming data", "Validate schema", "Cache results"
   - Bad: "DataParser", "validator.py", "CacheManager"

2. CONNECTIONS:
   - Every arrow MUST have a label describing what flows
   - Use ==> for primary data pipeline, --> for normal flow, -.-> for reads/references
   - Avoid pure linear chains — show forks, parallel paths, and real dependencies

3. CROSS-MODULE LINKS: Actively look for dependencies on modules outside your immediate siblings.
   If this module depends on something in a different part of the module tree, include it as an external node with a link.
</DIAGRAM_DESIGN_RULES>

<CRITICAL_NAMING_RULES>
All module names and file references MUST use consistent lowercase_with_underscores naming:
- Module names: `user_auth`, `database_handler` (NOT `UserAuth`, `userAuth`)
- File references in click statements must match module names exactly + .md
- Example: If module is `api_handler`, click must be: `click api_handler "api_handler.md"`

**CRITICAL: NEVER create a sub-module with the same name as the current module!**
- If documenting `handler`, do NOT create sub-module called `handler`
- Name sub-modules based on their actual function instead
</CRITICAL_NAMING_RULES>
</DOCUMENTATION_REQUIREMENTS>

<WORKFLOW>
1. Analyze provided code components and module structure
2. Explore dependencies between components if needed
3. Generate complete {module_name}.md documentation file
</WORKFLOW>

<AVAILABLE_TOOLS>
- `str_replace_editor`: File system operations for creating and editing documentation files
- `read_code_components`: Explore additional code dependencies not included in the provided components
</AVAILABLE_TOOLS>
""".strip()

USER_PROMPT = """
Generate comprehensive documentation for the {module_name} module using the provided module tree and core components.

<MODULE_TREE>
{module_tree}
</MODULE_TREE>
* NOTE: You can refer the other modules in the module tree based on the dependencies between their core components to make the documentation more structured and avoid repeating the same information. Know that all documentation files are saved in the same folder not structured as module tree. e.g. [alt text]([ref_module_name].md)

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
        search["Search & Navigate"]
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
Here is list of all potential core components of the repository (It's normal that some components are not essential to the repository):
<POTENTIAL_CORE_COMPONENTS>
{potential_core_components}
</POTENTIAL_CORE_COMPONENTS>

Before grouping, step back and consider: who uses this repository and what are the 3-4 main things they do with it?
Think about the types of users (developers, end-users, administrators) and their primary workflows.
Identify the 3-4 main user-facing entry points — the places where someone first interacts with the system.
Determine entry points by importance to user workflow, NOT by lines of code or folder size.

IMPORTANT: You MUST output the <GROUPED_COMPONENTS> tag FIRST, BEFORE any reasoning or explanation.
Group components by functional role and user-facing workflow. Consider how a user or developer would mentally organize this system, not how the files are laid out on disk.

Your response MUST start immediately with:
<GROUPED_COMPONENTS>
{{
    "module_name_1": {{
        "path": "path/to/module",
        "components": ["component_1", "component_2"]
    }},
    "module_name_2": {{
        "path": "path/to/other/module", 
        "components": ["component_3", "component_4"]
    }}
}}
</GROUPED_COMPONENTS>

Rules:
- Group by functional responsibility and user workflow (e.g., components that together handle "user authentication" regardless of which directories they live in)
- Keep groups manageable (5-50 components each when possible)
- Use snake_case for module names
- Only include essential components, skip test/example files
- DO NOT include any reasoning, explanation, or text before the <GROUPED_COMPONENTS> tag
""".strip()

CLUSTER_MODULE_PROMPT = """
Here is the module tree of a repository:

<MODULE_TREE>
{module_tree}
</MODULE_TREE>

Here is list of all potential core components of the module {module_name} (It's normal that some components are not essential to the module):
<POTENTIAL_CORE_COMPONENTS>
{potential_core_components}
</POTENTIAL_CORE_COMPONENTS>

Before grouping, consider: what does this module do from a user's perspective, and what are the main functional areas within it?
Think about how a developer exploring this module would mentally organize its parts.

IMPORTANT: You MUST output the <GROUPED_COMPONENTS> tag FIRST, BEFORE any reasoning or explanation.
Group these components into smaller sub-modules based on functional role and how they work together from a user's perspective.

Your response MUST start immediately with:
<GROUPED_COMPONENTS>
{{
    "submodule_name_1": {{
        "path": "path/to/submodule",
        "components": ["component_1", "component_2"]
    }},
    "submodule_name_2": {{
        "path": "path/to/other/submodule",
        "components": ["component_3", "component_4"]
    }}
}}
</GROUPED_COMPONENTS>

Rules:
- Group by functional responsibility — components that serve the same user-facing purpose belong together regardless of directory
- Keep groups manageable (5-50 components each when possible)
- Use snake_case for submodule names
- Only include essential components
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



def format_cluster_prompt(potential_core_components: str, module_tree: dict[str, any] = {}, module_name: str = None) -> str:
    """
    Format the cluster prompt with potential core components and module tree.
    """

    # format module tree
    lines = []

    # print(f"Module tree:\n{json.dumps(module_tree, indent=2)}")
    
    def _format_module_tree(module_tree: dict[str, any], indent: int = 0):
        for key, value in module_tree.items():
            if key == module_name:
                lines.append(f"{'  ' * indent}{key} (current module)")
            else:
                lines.append(f"{'  ' * indent}{key}")
            
            lines.append(f"{'  ' * (indent + 1)} Core components: {', '.join(value['components'])}")
            if ("children" in value) and isinstance(value["children"], dict) and len(value["children"]) > 0:
                lines.append(f"{'  ' * (indent + 1)} Children:")
                _format_module_tree(value["children"], indent + 2)
    
    _format_module_tree(module_tree, 0)
    formatted_module_tree = "\n".join(lines)


    if module_tree == {}:
        return CLUSTER_REPO_PROMPT.format(potential_core_components=potential_core_components)
    else:
        return CLUSTER_MODULE_PROMPT.format(potential_core_components=potential_core_components, module_tree=formatted_module_tree, module_name=module_name)