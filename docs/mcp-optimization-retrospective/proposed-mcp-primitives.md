# Proposed MCP Primitives

The following primitives are derived from actual actions performed in the
session.

## Highest Priority

### `apply_repo_bundle`

Atomic write for a whole diagram repo:

- overview
- module tree
- module docs
- index entry
- viewer epoch bump
- validation gate

Why:

The session repeatedly changed many files as one logical update.

### `validate_repo`

Validate the entire diagram repo:

- dangling edges
- missing node ids
- missing module docs
- bad links
- max groups per diagram
- max nodes per group
- orphan modules
- index consistency

Why:

The user repeatedly corrected structure with rules like "no more than 3-4 nodes"
and "no more than 3-4 groups at any level."

### `set_layout_constraints`

Persist constraints:

```json
{
  "maxGroupsPerDiagram": 4,
  "maxNodesPerGroup": 4,
  "preferFunctionalGroups": true
}
```

Why:

Constraints should not live only in agent memory.

### `set_architecture_model`

Persist semantic model:

```json
{
  "roles": [],
  "workbenches": [],
  "domains": [],
  "agents": [],
  "externalSystems": [],
  "views": [],
  "flows": []
}
```

Why:

The meaningful diagram was not a raw node list. It was a functional system model.

### `derive_diagrams_from_model`

Generate overview and drill-down diagrams from the semantic model and constraints.

Why:

This replaces a separate Python generator with an MCP-native generator.

## Medium Priority

### `register_generator` / `run_generator`

If external generation remains useful, MCP should own it:

- command
- working directory
- expected outputs
- validation command
- last run status

Why:

This lets MCP stay the control plane even when generation is script-based.

### `bulk_set_metadata`

Bulk title/description updates by target:

```json
{
  "target": "overview",
  "metadataById": {
    "node_id": {
      "title": "...",
      "description": "..."
    }
  }
}
```

Why:

Hover metadata was a major part of making the architecture understandable.

### `bulk_set_edges`

Replace or merge edge sets with provenance:

```json
{
  "target": "domain_data_quality_lock",
  "mode": "replace-curated",
  "edges": [
    {
      "source": "query-agent",
      "target": "lock-blocker",
      "label": "open query state",
      "provenance": "curated"
    }
  ]
}
```

Why:

Architecture diagrams need curated and inferred edges, not only code-derived
relationships.

### `autofix_group_overflow`

Apply a configured grouping policy:

- split large groups
- promote overflow to module pages
- preserve semantic grouping names
- validate result

Why:

The session repeatedly restructured diagrams to obey readability constraints.

## Canvas-Aware Tools

### `get_canvas_context`

Return active viewer state:

- current repo
- current module
- selected nodes/groups/edges
- current diagram tab
- visible/expanded modules

Why:

Without this, MCP edits feel blind compared with directly reading files.

### `preview_patch`

Dry-run a patch:

- resulting node/edge/group counts
- validation errors
- textual diff summary
- affected files

Why:

This would make agents more confident using MCP for larger edits.

## Viewer Configuration Tools

If MCP should control viewer UX:

### `set_viewer_interaction_config`

Examples:

- node hover connected-edge style
- collapse/help control stack
- semantic legend enablement
- edge label behavior

Otherwise, these remain normal code changes in `demo/reactflow-r6.mjs`.

