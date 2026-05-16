# Session Log

## Context

Workspace used by Cursor:

- `/Users/test/Downloads/cortex-ops_-agentic-clinical-control-tower`

Pushable git checkout used for MCP/viewer work:

- `/Users/test/Downloads/cortex-ops_-agentic-clinical-control-tower/atelier`
- Branch: `react-flow-elk-mcp`

The parent workspace is not a git repository, so pushable handoff material lives
inside the nested `atelier` checkout.

## Setup Actions

- Reused/cloned `atelier` on `react-flow-elk-mcp`.
- Installed Node dependencies with `npm install`.
- Created/synced Python environment with `uv venv .venv && uv sync`.
- Verified MCP import with `.venv/bin/python -c "import codewiki.mcp; print('ok')"`.
- Added workspace `.cursor/mcp.json` in the parent workspace pointing at the nested
  `atelier/scripts/run_codewiki_mcp.sh`.
- Reloaded Cursor MCP externally, then verified the `codewiki-diagram` tools were
  available through Cursor's MCP descriptors.

## MCP Usage

The MCP was used directly for a small smoke diagram:

- `set_overview` for `mcp-test-diagram`.
- `set_module_tree` for an `orders` drill-down.
- `set_module_doc` for `orders.md`.
- `open_viewer`.
- `get_diagram` with `target='__inventory__'` (repo summary + viewer state).

This validated basic diagram creation, indexing, module tree writes, docs, epoch
updates, and viewer serving.

## Architecture Diagram Work

The main architecture diagram was created as a generated demo repo:

- Repo id: `cortex-ops-architecture`.
- Output directory: `demo/repos/cortex-ops-architecture/`.
- Source data came from the parent workspace:
  - `data/dummyData.ts`
  - `systemAgents`
  - `integrationConnectors`
  - `UserRole`
  - synthetic CRA roster (`agents`, 105 entries)

Because the diagram became source-derived and repeatedly regenerated, work shifted
from direct MCP patch calls to a generator script in the parent workspace:

- `scripts/generate_cortex_architecture_diagram.py`

That script is outside this nested `atelier` git checkout because the parent
workspace is not a git repo.

## Diagram Modeling Iterations

Major modeling iterations:

- Initial full agent list: 41 `systemAgents` plus 105 synthetic CRA personas.
- First architecture version: root overview with users, entrypoints, externals,
  control spine, and agent groups.
- Constraint pass: no group should exceed roughly 3-4 nodes.
- Second constraint pass: no canvas level should have more than 3-4 sibling groups.
- Semantic refactor: replaced alphabetical agent slices with functional domains:
  - Site & Enrollment Ops
  - Data Quality & DB Lock
  - Safety, Regulatory & TMF
  - Platform, Trust & Integrations
- Role-facing refactor: replaced generic browser/service/fixture nodes with
  meaningful work surfaces:
  - Users & roles
  - Field execution
  - Study command
  - Data + AI governance
- Workbench detail pass: added workbench pages that map users to tasks, domains,
  and inspected views while preserving the 4 groups / 4 nodes constraint.
- Metadata pass: enriched root, workbench, domain, agent, and external nodes with
  titles and descriptions suitable for hover panels.

## Viewer Behavior Changes

Changes made in `demo/reactflow-r6.mjs`:

- Hovering a ReactFlow node now renders incoming/outgoing edges as dashed and
  animated.
- Hover edge color was adjusted to match the node hover color (`#3b82f6`).
- Hover edge thickness was restored to normal edge thickness.
- Expanded group controls now stack in a right-side column:
  - collapse button first
  - question-mark help button second
- Collapse button glyph changed from a dash/minus to a cross (`x` visually in UI).
- The old in-layout `[-] Collapse` node is visually suppressed, leaving the pill as
  the collapse affordance.

## Validation Performed

- Ran `python3 scripts/generate_cortex_architecture_diagram.py` from the parent
  workspace repeatedly after diagram changes.
- Ran an inline validator over generated diagrams:
  - max 4 groups per diagram
  - max 4 nodes per group
  - no dangling edges
- Ran `node --check demo/reactflow-r6.mjs`.
- Ran `ReadLints` for changed files where applicable.
- Attempted `npm run test:e2e:edge`, but Playwright could not launch because the
  local Chromium binary was missing. The failure was environment setup, not an
  assertion failure.

## Current Useful URL

Viewer URL from MCP:

- `http://127.0.0.1:18765/?repo=cortex-ops-architecture`

