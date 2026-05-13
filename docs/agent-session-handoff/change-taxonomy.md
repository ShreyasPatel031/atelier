# Change Taxonomy

This file categorizes the concrete actions performed during the session. It is
intended to help translate future agent behavior into first-class MCP operations.

## 1. Environment Bootstrap

Actions:

- Clone/reuse repo.
- Checkout MCP branch.
- Install Node dependencies.
- Create/sync Python venv.
- Verify `codewiki.mcp` import.
- Wire `.cursor/mcp.json`.
- Open/reload viewer.

Potential MCP primitive:

- `doctor`
- `check_install`
- `check_workspace_config`
- `ensure_demo_server`

## 2. Direct Diagram Creation

Actions:

- Create overview diagram.
- Create module tree.
- Create module doc.
- Open viewer.
- List created diagrams.

MCP tools already used:

- `set_overview`
- `set_module_tree`
- `set_module_doc`
- `open_viewer`
- `list_diagrams`

Missing wrapper:

- `create_repo_bundle`

## 3. Source Entity Extraction

Actions:

- Extract 41 `systemAgents`.
- Extract 105 synthetic CRA records.
- Extract user roles.
- Extract integration connectors.
- Identify stale/missing reference: `ontological-alignment-agent`.
- Curate agent-to-external dependency mapping.

Potential MCP primitive:

- `extract_entities`
- `set_architecture_entities`
- `import_from_code`

## 4. Semantic Architecture Modeling

Actions:

- Define role groups.
- Define role-facing workbenches.
- Define data views.
- Define four functional agent domains.
- Define curated workflow edges.
- Define external dependency packs.

Potential MCP primitive:

- `set_architecture_model`
- `set_domain_model`
- `set_workbench_model`
- `derive_diagrams_from_model`

## 5. Multi-Artifact Persistence

Actions:

- Write `overview.md`.
- Write `module_tree.json`.
- Write many module docs.
- Update `demo/repos/index.json`.
- Bump `viewer_epoch.json`.

Potential MCP primitive:

- `apply_repo_bundle(validate=true, bump_epoch=true)`

## 6. Layout Constraint Enforcement

Actions:

- Enforce max 4 groups per diagram.
- Enforce max 4 nodes per group.
- Split dense concepts into drill-down pages.
- Replace flat or alphabetical pages with functional groupings.
- Validate no dangling edges.

Potential MCP primitive:

- `set_layout_constraints`
- `validate_repo`
- `autofix_group_overflow`
- `promote_group_to_module`

## 7. Metadata Enrichment

Actions:

- Add titles and descriptions for role nodes.
- Add workbench descriptions.
- Add domain descriptions.
- Add external dependency descriptions.
- Pull agent descriptions from `systemAgents`.

Potential MCP primitive:

- `bulk_set_metadata`
- `derive_metadata_from_source`

## 8. Curated Edge Authoring

Actions:

- Add user/workbench to domain edges.
- Add domain workflow edges.
- Add agent-to-agent conceptual edges.
- Add agent-to-external data dependency edges.
- Add control spine coordination edges.

Potential MCP primitive:

- `bulk_set_edges`
- `set_edge_semantics`
- `annotate_edge_source`

## 9. Viewer Interaction Changes

Actions:

- Node hover highlights connected edges.
- Connected hover edges are dashed/animated.
- Collapse pill added above help pill.
- Collapse icon changed to cross.

Potential MCP primitive if viewer behavior is in scope:

- `set_viewer_interaction_config`
- `toggle_viewer_feature`

Otherwise these remain code changes in `demo/reactflow-r6.mjs`.

## 10. Validation and Smoke Checks

Actions:

- Python generator run.
- Inline diagram invariant validation.
- JS syntax check with `node --check`.
- Linter check.
- Attempted Playwright test, blocked by missing Chromium.

Potential MCP primitive:

- `validate_repo`
- `validate_links`
- `validate_constraints`
- `run_smoke_render`

