# AST Tree → Initial Module Tree Algorithm

## Overview

Converts parsed AST components into a hierarchical module tree for documentation generation.

---

## Algorithm Steps

### 1. Build Dependency Graph
```
FOR each component in AST:
    Extract dependencies (imports, function calls, type references)
    Create edge: component → dependency
RESULT: Graph G where edge A→B means "A depends on B"
```

### 2. Extract "Leaf Nodes"
```
leaf_nodes = ALL nodes in graph  // Start with everything

// Filter by type
valid_types = {"class", "interface", "struct"}
IF no structs/classes exist:
    valid_types.add("function")  // Only for C-only codebases

leaf_nodes = filter(leaf_nodes, type IN valid_types)

// Broken filtering (doesn't work)
IF len(leaf_nodes) >= 400:
    // Try to remove nodes that ARE dependencies
    // BUG: Leaf nodes have in-degree=0, so nothing depends on them
    // Result: 0 nodes removed, still 779 nodes

RESULT: List of nodes with in-degree=0, filtered by type
```

**Current Result:** 779 structs/interfaces (functions excluded)

---

### 3. Cluster into Modules

```
IF len(leaf_nodes) < MIN_COMPONENTS (3):
    RETURN single module with all components

IF token_count <= MAX_TOKEN_PER_MODULE:
    // Small enough - use directory-based split
    RETURN _create_directory_based_modules(leaf_nodes)
    // Groups by top-level directory (e.g., "pkg", "core")

ELSE:
    // Too large - try LLM clustering
    prompt = format_cluster_prompt(leaf_nodes)
    
    IF prompt_tokens > MAX_CLUSTERING_PROMPT_TOKENS:
        TRUNCATE component list
    
    TRY:
        response = call_llm(prompt, timeout=60s)
        module_tree = parse_llm_response(response)
        
    CATCH TimeoutError:
        // LLM timeout → fallback
        module_tree = _create_directory_based_modules(leaf_nodes)
    
    CATCH ParseError:
        // Invalid response → fallback
        module_tree = _create_directory_based_modules(leaf_nodes)
    
    RETURN module_tree
```

**Fallback:** `_create_directory_based_modules()` groups by top-level directory:
```
FOR each leaf_node:
    dir = get_top_level_directory(leaf_node.path)
    groups[dir].append(leaf_node)

RETURN {dir_name: {components: [...], children: {}}}
```

---

## Current Flow (Kubecost Example)

```
1. AST → 6,643 components (2,516 functions + 4,127 structs)

2. Leaf nodes:
   - Start: 6,643 nodes
   - Filter types: 779 structs/interfaces (functions excluded)
   - >= 400 check: 0 nodes removed (bug)
   - Result: 779 nodes

3. Clustering:
   - token_count > MAX_TOKEN → Try LLM
   - prompt_tokens = 12,325
   - LLM timeout after 60s
   - Fallback: Directory-based
   - Result: 3 modules (pkg, core, modules)

4. Initial module tree:
   {
     "pkg": {components: [330 items], children: {}},
     "core": {components: [382 items], children: {}},
     "modules": {components: [67 items], children: {}}
   }
```

---

## Problems

1. **Functions excluded** (line 313): `valid_types = {"class", "interface", "struct"}`
   - `main()`, handlers, controllers all filtered out
   - Only structs sent to clustering

2. **>= 400 filter broken** (line 337-342):
   - Tries to remove dependencies
   - Leaf nodes have in-degree=0, so nothing depends on them
   - Result: 0 nodes removed

3. **No characteristic filtering**:
   - 597/779 (76%) are isolated data structs (0 in, 0 out)
   - Should filter to true entry points (0 in, >0 out)
   - Would reduce 779 → ~182 meaningful nodes

4. **LLM timeout**:
   - 779 nodes too many for single LLM call
   - Should pre-filter or batch

---

## Correct Algorithm (Proposed)

```
1. Build dependency graph (same)

2. Extract TRUE entry points:
   leaf_nodes = nodes with in-degree = 0
   
   // Include functions
   valid_types = {"class", "interface", "struct", "function"}
   
   // Filter by characteristics
   true_entry_points = []
   FOR each node in leaf_nodes:
       IF node.type IN valid_types:
           in_deg = in_degree(node)
           out_deg = out_degree(node)
           
           // Keep only nodes that orchestrate (true entry points)
           IF in_deg == 0 AND out_deg > 0:
               true_entry_points.append(node)
   
   RESULT: ~200 true entry points (not 779 noise)

3. Cluster (same, but with fewer nodes):
   - 200 nodes → LLM succeeds
   - Creates 10-15 semantic modules
   - No timeout, no fallback needed
```
