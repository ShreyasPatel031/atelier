# CodeWiki Comprehensive Reliability Report

## What is AUTO-SPLIT?

**AUTO-SPLIT** is an emergency fallback mechanism that automatically splits large modules when they exceed the LLM's context limit (100,000 tokens).

### When It Triggers

```
IF prompt_tokens > 100,000 AND depth < 5:
    → AUTO-SPLIT activates
```

**Location:** `agent_orchestrator.py:588-663`

### How It Works

**Step 1: Directory-Based Splitting (Primary Method)**
- Groups components by their file paths
- Example: `pkg/cloud/azure/file.go` → grouped into `pkg_cloud` module
- Creates sub-modules like: `pkg_cloud`, `pkg_metrics`, `pkg_costmodel`

**Step 2: Token-Budget Chunking (Fallback)**
- If directory split creates ≤2 groups, switches to token-based chunking
- Splits components into chunks of ~80K tokens each
- Creates artificial modules: `part_1`, `part_2`, `part_3`...

**Step 3: Recursive Processing**
- Each sub-module is processed recursively
- If a sub-module is still too large, AUTO-SPLIT triggers again
- This creates cascading splits: `pkg` → `pkg_cloud` → `pkg_cloud_azure`

### Example: Kubecost

```
pkg (330 components, 402K tokens) 
  → AUTO-SPLIT triggers
  → Creates: pkg_cloud, pkg_metrics, pkg_costmodel...
  
pkg_cloud (still 212K tokens)
  → AUTO-SPLIT triggers AGAIN
  → Creates: pkg_cloud_azure, pkg_cloud_digitalocean...
```

### Problems with AUTO-SPLIT

1. **Not Semantic**: Uses directory structure, not code relationships
2. **Missing Metadata**: Doesn't add `title` or `description` to created modules
3. **Cascading Splits**: Can create deeply nested, artificial hierarchies
4. **Race Conditions**: When parallel processing, multiple processes update `module_tree.json` simultaneously

---

## Kubecost Pipeline Failure: Top-Down Analysis

### Executive Summary

The kubecost repository (6,643 files, 779 leaf nodes) failed to generate complete documentation due to a **cascading failure** that originated in Stage 2 (clustering) and propagated through Stage 3 (documentation generation).

**Result:** 135 validation errors, only 49% diagram coverage, 55% title coverage.

---

## Stage-by-Stage Analysis

### Stage 1: Dependency Analysis ✅ SUCCESS

| Metric | Value |
|--------|-------|
| Files parsed | 6,643 |
| Components found | 6,643 |
| Leaf nodes | 779 |
| Duration | 2.3s |

**Status:** Working correctly. No issues.

---

### Stage 2: Module Clustering ⚠️ PARTIAL FAILURE

| Metric | Value |
|--------|-------|
| Input | 779 leaf nodes |
| Prompt tokens | 12,325 |
| Duration | 29.8s |
| Result | **TIMEOUT** |

**What happened:**
```
[16:11:39] ERROR [LLM] Gemini API error: TimeoutError: Module clustering timed out after 60 seconds
[16:11:39] WARNING [STAGE 2] FALLING BACK TO DIRECTORY-BASED CLUSTERING due to LLM failure
```

**Fallback Result:**
| Module | Components |
|--------|------------|
| `pkg` | 330 |
| `core` | 382 |
| `modules` | remaining |

**Problem:** Directory-based fallback created only 3 top-level modules for 6,643 files. This is too coarse and leads to massive prompts in Stage 3.

---

### Stage 3: Documentation Generation ❌ FAILURE

#### 3.1 Token Explosion (Root Cause)

For each top-level module, the prompt size was calculated:

| Module | Components | Prompt Tokens | Limit |
|--------|------------|---------------|-------|
| `pkg` | 330 | **402,517** | 100,000 |
| `core` | 382 | **420,857** | 100,000 |
| `modules` | ~50 | ~15,000 | 100,000 |

The `pkg` and `core` modules were **4x over the context limit**.

#### 3.2 AUTO-SPLIT Triggered

When prompt > 100K tokens, AUTO-SPLIT kicks in:

```
[16:11:39] WARNING [STAGE 4.5.5: AUTO-SPLIT] Prompt too large (402517 tokens > 100000)
[16:11:39] WARNING [STAGE 4.5.5] Automatically splitting module 'pkg' before LLM call
```

AUTO-SPLIT creates directory-based sub-modules:
- `pkg` → `pkg_cloud`, `pkg_metrics`, `pkg_costmodel`, ...
- `pkg_cloud` → `pkg_cloud_azure`, `pkg_cloud_digitalocean`, ...

#### 3.3 The KeyError Bug 🐛

When processing `pkg_cloud_azure` (nested 2 levels deep), the agent failed:

```
KeyError: 'pkg'
```

**Root Cause:**

In `generate_sub_module_documentations.py:110-112`:
```python
value = deps.module_tree
for key in deps.path_to_current_module:  # ['pkg', 'pkg_cloud']
    value = value[key]["children"]  # KeyError: 'pkg'
```

**Why `pkg` wasn't found:**

1. `process_module` loads `module_tree.json` at line 462
2. AUTO-SPLIT modifies `deps.module_tree` and saves to disk (lines 604-641)
3. Recursive call to `process_module` for sub-module
4. **BUG:** Recursive call loads module_tree from disk at line 462, but...
5. The loaded tree is passed to deps, but the LLM agent's deps object may reference a STALE version

Actually, looking more closely:

```python
# Line 546: module_tree is passed to deps
module_tree=module_tree,  # <-- This is what was loaded at line 462
```

The issue is that each `process_module` call loads the tree fresh from disk (line 462), but when the tree is updated by AUTO-SPLIT in one call, the concurrent/nested calls may have ALREADY loaded an older version.

**More specifically:**

1. `process_module('pkg', path=[])` loads tree (empty or initial)
2. AUTO-SPLIT runs, adds children to `deps.module_tree['pkg']['children']`
3. Saves to disk
4. Recursively calls `process_module('pkg_cloud', path=['pkg'])`
5. `process_module('pkg_cloud')` loads tree from disk ← should have `pkg` now
6. AUTO-SPLIT runs again for `pkg_cloud`, adds children
7. Saves to disk
8. Recursively calls `process_module('pkg_cloud_azure', path=['pkg', 'pkg_cloud'])`
9. Agent runs, calls `generate_sub_module_documentation`
10. **BOOM:** Tries to navigate `deps.path_to_current_module = ['pkg', 'pkg_cloud']`

Wait, but the tree SHOULD have `pkg` at this point...

Let me re-examine. The actual bug is in **line 544**:

```python
path_to_current_module=module_path,  # This is ['pkg', 'pkg_cloud']
```

But `module_tree` at line 546 was loaded at line 462 before AUTO-SPLIT added the children!

**Timing issue:**

```
process_module('pkg_cloud_azure', path=['pkg', 'pkg_cloud'])
↓
Line 462: module_tree = file_manager.load_json(module_tree_path)
          # At this point, tree has pkg, pkg.children, pkg_cloud, pkg_cloud.children
↓
Line 546: module_tree=module_tree  # GOOD - should work
↓
Line 546: path_to_current_module=['pkg', 'pkg_cloud']  # GOOD - correct path
↓
Agent runs...
↓
generate_sub_module_documentation():
  value = deps.module_tree  # Should have pkg
  for key in ['pkg', 'pkg_cloud']:
    value = value[key]["children"]  # KeyError: 'pkg'
```

**THE REAL BUG:**

Looking at line 604-641 in `agent_orchestrator.py`:

```python
# Line 606-617: Navigate to parent container
if len(module_path) == 0:
    target = deps.module_tree
elif len(module_path) == 1:
    target = deps.module_tree
else:
    target = deps.module_tree
    for key in module_path[:-1]:
        if key in target:
            target = target[key].get("children", {})

# Line 620-626: Update the module's children
if module_name in target:
    target[module_name]["children"] = {}
    for sub_name, sub_info in sub_modules.items():
        target[module_name]["children"][sub_name] = {
            "components": sub_info["components"],
            "children": {}
        }
```

When processing `pkg` (module_path=[]):
- `len(module_path) == 0` → `target = deps.module_tree`
- `if module_name in target` → `if 'pkg' in deps.module_tree`

**BUT `pkg` was added to the tree DURING Stage 2 clustering, not during this process_module call!**

Actually, let me trace the Stage 2 output:

```python
# After Stage 2 (cluster_modules), module_tree.json looks like:
{
    "pkg": {"components": [...], "children": {}},
    "core": {"components": [...], "children": {}},
    "modules": {"components": [...], "children": {}}
}
```

So when `process_module('pkg', path=[])` runs:
- Line 462 loads this tree
- Line 620: `if 'pkg' in target` → `if 'pkg' in module_tree` → TRUE
- Line 621-626: Updates `module_tree['pkg']['children']` with AUTO-SPLIT sub-modules

This should work! But the error says `KeyError: 'pkg'` in `generate_sub_module_documentations.py:112`.

**WAIT - I need to check if there are CONCURRENT updates happening!**

Looking at the log:
```
[16:11:46] ERROR KeyError: 'core'  # pkg_cloud_azure
[16:11:50] ERROR KeyError: 'pkg'   # core_pkg_clustercache
```

These errors happened at roughly the same time (4 seconds apart), meaning **parallel processing** was occurring!

**THE ACTUAL BUG: RACE CONDITION WITH PARALLEL PROCESSING**

When parallelization was enabled, multiple `process_module` calls run concurrently:
1. `process_module('pkg', ...)` and `process_module('core', ...)` run in parallel
2. Each loads module_tree.json at the START of their execution
3. Each one's `deps.module_tree` is a SEPARATE COPY from that moment
4. When one saves, the other's copy becomes STALE
5. When AUTO-SPLIT's recursive calls happen, they load again - but by then, the tree structure may be inconsistent

---

## Summary of Issues

| Issue | Stage | Severity | Status |
|-------|-------|----------|--------|
| LLM clustering timeout | 2 | High | Causes fallback to directory-based |
| 3 top-level modules too coarse | 2 | High | Causes token explosion in Stage 3 |
| AUTO-SPLIT doesn't add title/description | 3 | Medium | 45 modules missing metadata |
| Race condition in parallel processing | 3 | **Critical** | Causes KeyError crashes |
| generate_sub_module_documentation navigates stale tree | 3 | **Critical** | Root cause of KeyError |

---

## Fixes Required

### Fix 1: Reload tree after AUTO-SPLIT saves (Critical)

In `agent_orchestrator.py`, after saving module tree in AUTO-SPLIT:

```python
# After line 641 (file_manager.save_json)
# Reload the tree to get latest state before passing to recursive calls
deps.module_tree = file_manager.load_json(module_tree_path)
```

### Fix 2: Add title/description in AUTO-SPLIT (Medium)

In the AUTO-SPLIT section (lines 622-626):

```python
target[module_name]["children"][sub_name] = {
    "title": sub_name.replace("_", " ").title(),  # ADD THIS
    "description": f"Auto-split module for {sub_name}",  # ADD THIS
    "components": sub_info["components"],
    "children": {}
}
```

### Fix 3: Handle parallel processing correctly (Critical)

The current `asyncio.Lock` protects file saves, but each process still works with its own copy. Need either:

A. **Sequential processing for large repos** (simple)
B. **Shared mutable state with proper synchronization** (complex)
C. **Event-driven architecture** where each save triggers reloads (proper fix)

### Fix 4: Increase clustering timeout or break into chunks (High)

779 leaf nodes is too many for a single LLM call. Either:
- Increase timeout from 60s to 300s
- Pre-chunk leaf nodes before sending to LLM
- Use hierarchical clustering (cluster directories first, then contents)

---

## Comparison: CruiseKube vs Kubecost

| Metric | CruiseKube | Kubecost |
|--------|------------|----------|
| Files | 504 | 6,643 |
| Leaf nodes | ~100 | 779 |
| LLM Clustering | ✅ | ❌ Timeout |
| Top-level modules | 14 | 3 |
| Token explosion | No | Yes (402K+) |
| AUTO-SPLIT needed | No | Yes (cascading) |
| KeyError crashes | No | Yes (2) |
| Diagram coverage | 86% | 49% |
| Title coverage | 99% | 55% |

---

## ROOT CAUSE DISCOVERED: Functions Are Excluded from Clustering

**Analysis of kubecost's 779 "leaf nodes":**

| Category | Count | % | What They Are |
|----------|-------|---|---------------|
| True entry points (0 in, >0 out) | 182 | 23% | Structs that orchestrate |
| Data structs (0 in, 0 out) | 597 | 76% | Isolated data types |
| **Functions (excluded!)** | **2,516** | **N/A** | **Including main(), handlers** |

**The Bug (`topo_sort.py:313`):**
```python
valid_types = {"class", "interface", "struct"}  # Functions NOT included!
if not available_types.intersection(valid_types):
    valid_types.add("function")  # Only for C-only codebases
```

**Result:**
- `main()` has in-degree=0, out-degree=2 → TRUE entry point
- But it's a `function` → **filtered out**
- Only 779 structs sent to clustering
- 597 of them are isolated data types with no dependencies
- These aren't meaningful entry points for documentation

**What SHOULD Happen:**
- Send TRUE entry points to clustering: ~182-200 nodes
- Include functions that match patterns: `main`, `Execute`, `Handler`, `Server`
- Filter OUT data structs with 0 dependencies (they're noise)

---

## Recommendations

### Fix 1: Include Functions in Clustering (Critical)
In `topo_sort.py`, change line 313:
```python
# Old
valid_types = {"class", "interface", "struct"}

# New
valid_types = {"class", "interface", "struct", "function"}
```

Then filter by characteristics, not just type:
```python
# Keep nodes that are TRUE entry points:
if in_degree[node] == 0 and out_degree[node] > 0:
    keep_leaf_nodes.append(node)
```

### Fix 2: Filter by Name Patterns
Keep nodes matching: `main`, `Handler`, `Controller`, `Router`, `Server`, `Execute`, `API`

### Fix 3: Better Clustering Strategy
- Instead of 779 structs → 3 modules (timeout)
- Send ~200 true entry points → 10-15 modules (success)

### Short-term Fixes
1. Disable parallelization for repos with >500 components
2. Increase clustering timeout to 300s
3. Implement proper state management with atomic updates

### Long-term Architecture
Re-architect to use event-driven pipeline with message passing
