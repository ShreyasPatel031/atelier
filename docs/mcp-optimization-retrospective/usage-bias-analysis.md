# MCP Usage Bias Analysis

## Observation

The session began with direct MCP usage, but later shifted to file/script edits.
That shift was not because the MCP failed. It happened because the task changed
from "edit a diagram" to "build and repeatedly regenerate a source-derived
architecture model."

## Where MCP Worked Well

MCP was a good fit for:

- Creating a small smoke diagram.
- Writing a simple overview.
- Writing a simple module tree.
- Adding one module doc.
- Opening the viewer.
- Listing diagram state.

These actions map directly to existing tools.

## Where File Editing Became More Attractive

File/script editing became attractive when the work required:

- Parsing repo source data.
- Creating a repeatable generator.
- Applying constraints to all generated diagrams.
- Rewriting many artifacts together.
- Preserving a semantic source of truth.
- Adding rich metadata across many nodes.
- Iterating on conceptual architecture, not just canvas layout.

At that point, patching generated diagram files through MCP felt like editing
outputs instead of the model that produced them.

## Core Missing Abstraction

The current MCP feels strongest as a persistence and patch layer for diagram IR.
The work needed a semantic architecture modeling layer:

- roles
- workbenches
- domains
- agents
- external systems
- views
- workflows
- constraints
- metadata
- generator ownership

Without that layer, the agent naturally fell back to a Python generator because
the generator gave repeatability, validation, and a single place to encode the
architecture model.

## Practical Bias Drivers

The agent favored file edits because:

- A generator was easier to rerun than a long sequence of patch calls.
- Bulk validation was easier outside the MCP.
- Atomic multi-file updates were easier with filesystem writes.
- Constraints like "max 4 groups / max 4 nodes" needed to apply globally.
- It was easier to encode curated functional edges in code than manually patch
  many diagrams.
- Metadata enrichment at scale was easier as data structures.

## What Would Change The Bias

The MCP would become the default path if it owned:

- architecture model persistence
- bundle writes
- validation
- constraint enforcement
- generator integration
- metadata/edge bulk operations
- preview/diff before apply
- current canvas context

Then "use the MCP" would also mean "edit the canonical semantic model," not just
"patch the rendered diagram artifact."

