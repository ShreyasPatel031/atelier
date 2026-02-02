# Copyright (c) Meta Platforms, Inc. and affiliates
"""
Topological sorting utilities for dependency graphs with cycle handling.

This module provides functions to perform topological sorting on a dependency graph,
including detection and resolution of dependency cycles.
"""

import logging
from typing import Dict, List, Set, Any
from collections import deque

from codewiki.src.be.dependency_analyzer.models.core import Node

logger = logging.getLogger(__name__)


def detect_cycles(graph: Dict[str, Set[str]]) -> List[List[str]]:
    """
    Detect cycles in a dependency graph using Tarjan's algorithm to find
    strongly connected components.
    
    Args:
        graph: A dependency graph represented as adjacency lists
               (node -> set of dependencies)
    
    Returns:
        A list of lists, where each inner list contains the nodes in a cycle
    """
    # Implementation of Tarjan's algorithm
    index_counter = [0]
    index = {}  # node -> index
    lowlink = {}  # node -> lowlink value
    onstack = set()  # nodes currently on the stack
    stack = []  # stack of nodes
    result = []  # list of cycles (strongly connected components)
    
    def strongconnect(node):
        # Set the depth index for node
        index[node] = index_counter[0]
        lowlink[node] = index_counter[0]
        index_counter[0] += 1
        stack.append(node)
        onstack.add(node)
        
        # Consider successors
        for successor in graph.get(node, set()):
            if successor not in index:
                # Successor has not yet been visited; recurse on it
                strongconnect(successor)
                lowlink[node] = min(lowlink[node], lowlink[successor])
            elif successor in onstack:
                # Successor is on the stack and hence in the current SCC
                lowlink[node] = min(lowlink[node], index[successor])
        
        # If node is a root node, pop the stack and generate an SCC
        if lowlink[node] == index[node]:
            # Start a new strongly connected component
            scc = []
            while True:
                successor = stack.pop()
                onstack.remove(successor)
                scc.append(successor)
                if successor == node:
                    break
            
            # Only include SCCs with more than one node (actual cycles)
            if len(scc) > 1:
                result.append(scc)
    
    # Visit each node
    for node in graph:
        if node not in index:
            strongconnect(node)
    
    return result

def resolve_cycles(graph: Dict[str, Set[str]]) -> Dict[str, Set[str]]:
    """
    Resolve cycles in a dependency graph by identifying strongly connected
    components and breaking cycles.
    
    Args:
        graph: A dependency graph represented as adjacency lists
               (node -> set of dependencies)
    
    Returns:
        A new acyclic graph with the same nodes but with cycles broken
    """
    # Detect cycles (SCCs)
    cycles = detect_cycles(graph)
    
    if not cycles:
        logger.debug("No cycles detected in the dependency graph")
        return graph
    
    logger.debug(f"Detected {len(cycles)} cycles in the dependency graph")
    
    # Create a copy of the graph to modify
    new_graph = {node: deps.copy() for node, deps in graph.items()}
    
    # Process each cycle
    for i, cycle in enumerate(cycles):
        logger.debug(f"Cycle {i+1}: {' -> '.join(cycle)}")
        
        # Strategy: Break the cycle by removing the "weakest" dependency
        # Here, we just arbitrarily remove the last edge to make the graph acyclic
        # In a real-world scenario, you might use heuristics to determine which edge to break
        # For example, removing edges between different modules before edges within the same module
        for j in range(len(cycle) - 1):
            current = cycle[j]
            next_node = cycle[j + 1]
            
            if next_node in new_graph[current]:
                logger.debug(f"Breaking cycle by removing dependency: {current} -> {next_node}")
                new_graph[current].remove(next_node)
                break
    
    return new_graph

def topological_sort(graph: Dict[str, Set[str]]) -> List[str]:
    """
    Perform a topological sort on a dependency graph.
    
    Args:
        graph: A dependency graph represented as adjacency lists
               (node -> set of dependencies)
    
    Returns:
        A list of nodes in topological order (dependencies first)
    """
    # First, check for and resolve cycles
    acyclic_graph = resolve_cycles(graph)
    
    # Initialize in-degree counter for all nodes
    in_degree = {node: 0 for node in acyclic_graph}
    
    # Count in-degrees
    for node, dependencies in acyclic_graph.items():
        for dep in dependencies:
            if dep in in_degree:
                in_degree[dep] += 1
    
    # Queue of nodes with no dependencies (in-degree of 0)
    queue = deque([node for node, degree in in_degree.items() if degree == 0])
    
    # Result list to store the topological order
    result = []
    
    # Process nodes in topological order
    while queue:
        node = queue.popleft()
        result.append(node)
        
        # Reduce in-degree for each node that depends on the current node
        for dependent, deps in acyclic_graph.items():
            if node in deps:
                in_degree[dependent] -= 1
                if in_degree[dependent] == 0:
                    queue.append(dependent)
    
    # Check if the sort was successful (all nodes included)
    if len(result) != len(acyclic_graph):
        logger.warning("Topological sort failed: graph has cycles that weren't resolved")
        # Return all nodes in some order to avoid breaking the process
        return list(acyclic_graph.keys())
    
    # Reverse the result to get dependencies first
    return result[::-1]

def dependency_first_dfs(graph: Dict[str, Set[str]]) -> List[str]:
    """
    Perform a depth-first traversal of the dependency graph, starting from root nodes
    that have no dependencies.
    
    The graph uses natural dependency direction:
    - If A depends on B, the graph has an edge A → B
    - This means an edge from X to Y represents "X depends on Y"
    - Root nodes (nodes with no incoming edges/dependencies) are processed first,
      followed by nodes that depend on them
    
    Args:
        graph: A dependency graph with natural direction (A→B if A depends on B)
    
    Returns:
        A list of nodes in an order where dependencies come before their dependents
    """
    # First, resolve cycles to ensure we have a DAG
    acyclic_graph = resolve_cycles(graph)
    
    # Find root nodes (nodes with no dependencies)
    root_nodes = []
    # Create a reverse graph to easily check if a node has incoming edges
    has_incoming_edge = {node: False for node in acyclic_graph}
    
    for node, deps in acyclic_graph.items():
        for dep in deps:
            has_incoming_edge[dep] = True
    
    # Nodes with no incoming edges are root nodes
    for node in acyclic_graph:
        if not has_incoming_edge.get(node, False) and node in acyclic_graph:
            root_nodes.append(node)
    
    if not root_nodes:
        logger.warning("No root nodes found in the graph, using arbitrary starting point")
        root_nodes = list(acyclic_graph.keys())[:1]  # Use the first node as starting point
    
    # Track visited nodes
    visited = set()
    result = []
    
    # DFS function that processes dependencies first
    def dfs(node):
        if node in visited:
            return
        visited.add(node)
        
        # Visit all dependencies first
        for dep in sorted(acyclic_graph.get(node, set())):
            dfs(dep)
        
        # Add this node to the result after all its dependencies
        result.append(node)
    
    # Start DFS from each root node
    for root in sorted(root_nodes):
        dfs(root)
    
    # Check if all nodes were visited
    if len(result) != len(acyclic_graph):
        # Some nodes weren't visited - try to visit remaining nodes
        for node in sorted(acyclic_graph.keys()):
            if node not in visited:
                dfs(node)
    
    return result

def build_graph_from_components(components: Dict[str, Any]) -> Dict[str, Set[str]]:
    """
    Build a dependency graph from a collection of code components.
    
    The graph uses the natural dependency direction:
    - If A depends on B, we create an edge A → B
    - This means an edge from node X to node Y represents "X depends on Y"
    - Root nodes (nodes with no dependencies) are components that don't depend on anything
    
    Args:
        components: A dictionary of code components, where each component
                   has a 'depends_on' attribute
    
    Returns:
        A dependency graph with natural dependency direction
    """
    graph = {}
    
    for comp_id, component in components.items():
        # Initialize the node's adjacency list
        if comp_id not in graph:
            graph[comp_id] = set()
        
        # Add dependencies
        for dep_id in component.depends_on:
            # Only include dependencies that are actual components in our repository
            if dep_id in components:
                graph[comp_id].add(dep_id)
    
    return graph 


def compute_reachability(graph: Dict[str, Set[str]], start_node: str) -> int:
    """
    Compute how many nodes are reachable from start_node via BFS.
    
    Args:
        graph: Dependency graph (node -> set of dependencies)
        start_node: Node to start BFS from
    
    Returns:
        Count of nodes reachable from start_node (excluding itself)
    """
    visited = set()
    queue = deque([start_node])
    
    while queue:
        node = queue.popleft()
        if node in visited:
            continue
        visited.add(node)
        
        # Add all dependencies to queue
        for dep in graph.get(node, set()):
            if dep not in visited:
                queue.append(dep)
    
    return len(visited) - 1  # Exclude start_node itself


def get_leaf_nodes(
    graph: Dict[str, Set[str]], 
    components: Dict[str, Node],
    max_context_tokens: int = 100_000
) -> List[str]:
    """
    Find entry point candidates using reachability-based ranking.
    
    DYNAMIC ALGORITHM - scales to fit context window:
    1. Find nodes with in-degree=0 (nothing depends on them)
    2. Filter to nodes with out-degree>0 (they depend on something)
    3. Compute reachability via BFS for each candidate
    4. Sort by reachability descending (highest first)
    5. DYNAMICALLY remove lowest-reachability nodes until tokens fit in context
    
    This is language-agnostic, naming-agnostic, and convention-agnostic.
    High reachability = node controls/orchestrates large portion of codebase.
    
    Args:
        graph: A dependency graph with natural direction (A→B if A depends on B)
        components: Dictionary of code components
        max_context_tokens: Maximum tokens for clustering prompt (default 100K)
    
    Returns:
        A list of entry point node IDs, sorted by reachability (highest first)
    """
    # First, resolve cycles to ensure we have a DAG
    acyclic_graph = resolve_cycles(graph)
    
    # Compute in-degree for all nodes
    in_degree: Dict[str, int] = {node: 0 for node in acyclic_graph}
    for node, deps in acyclic_graph.items():
        for dep in deps:
            if dep in in_degree:
                in_degree[dep] += 1
    
    # Find candidates: in-degree=0 AND out-degree>0 AND exists in components
    candidates = []
    for node in acyclic_graph:
        out_degree = len(acyclic_graph.get(node, set()))
        
        # Skip invalid nodes
        if not isinstance(node, str) or node.strip() == "":
            continue
        if any(err in node.lower() for err in ['error', 'exception', 'failed', 'invalid']):
            continue
        
        # Entry point criteria: nothing depends on it (in=0) AND it depends on something (out>0)
        if in_degree[node] == 0 and out_degree > 0:
            # Must exist in components
            if node in components:
                candidates.append(node)
    
    logger.info(f"[ENTRY_POINTS] Found {len(candidates)} candidates with in-degree=0 and out-degree>0")
    
    if not candidates:
        # Fallback: include all nodes with in-degree=0 (even isolated ones)
        logger.warning("[ENTRY_POINTS] No candidates with out-degree>0, falling back to all in-degree=0 nodes")
        candidates = [
            node for node in acyclic_graph 
            if in_degree[node] == 0 and node in components
        ]
    
    if not candidates:
        logger.error("[ENTRY_POINTS] No entry point candidates found")
        return []
    
    # Compute reachability for each candidate
    logger.info(f"[ENTRY_POINTS] Computing reachability for {len(candidates)} candidates...")
    reachability: Dict[str, int] = {}
    for i, node in enumerate(candidates):
        reachability[node] = compute_reachability(acyclic_graph, node)
        if (i + 1) % 500 == 0:
            logger.debug(f"[ENTRY_POINTS] Computed reachability for {i+1}/{len(candidates)} candidates")
    
    # Sort by reachability descending (highest first)
    sorted_candidates = sorted(candidates, key=lambda n: -reachability[n])
    
    # Log top entries
    top_10 = sorted_candidates[:10]
    logger.info(f"[ENTRY_POINTS] Top 10 by reachability:")
    for i, node in enumerate(top_10):
        logger.info(f"  {i+1}. reach={reachability[node]:4d}  {node[:60]}")
    
    # DYNAMIC ALGORITHM: Scale nodes to fit BOTH input AND output constraints
    # 
    # Constraints (from config, model-specific):
    # 1. INPUT: max_context_tokens (passed in, already computed from model)
    # 2. OUTPUT: MODEL_OUTPUT_LIMITS / TOKENS_PER_NODE_OUTPUT
    #
    from codewiki.src.config import (
        TOKENS_PER_NODE_INPUT, 
        TOKENS_PER_NODE_OUTPUT,
        SYSTEM_PROMPT_TOKENS,
        SAFETY_BUFFER_PERCENT,
        MODEL_OUTPUT_LIMITS,
        DEFAULT_OUTPUT_LIMIT
    )
    
    # Calculate max nodes for INPUT
    available_input_tokens = max_context_tokens - SYSTEM_PROMPT_TOKENS
    max_nodes_for_input = available_input_tokens // TOKENS_PER_NODE_INPUT
    
    # Calculate max nodes for OUTPUT (use Gemini 2.5 Flash as default since that's what we use)
    # TODO: Pass model_name through to make this truly dynamic
    output_limit = MODEL_OUTPUT_LIMITS.get('gemini-2.5-flash', DEFAULT_OUTPUT_LIMIT)
    usable_output = int(output_limit * (1 - SAFETY_BUFFER_PERCENT))
    max_nodes_for_output = usable_output // TOKENS_PER_NODE_OUTPUT
    
    # Use the MORE RESTRICTIVE constraint
    max_nodes = min(max_nodes_for_input, max_nodes_for_output)
    
    # Start with all candidates
    result = sorted_candidates.copy()
    
    logger.info(f"[ENTRY_POINTS] Initial: {len(result)} candidates")
    logger.info(f"[ENTRY_POINTS] INPUT limit: {max_nodes_for_input} nodes (from {max_context_tokens} token context)")
    logger.info(f"[ENTRY_POINTS] OUTPUT limit: {max_nodes_for_output} nodes (from {output_limit} token output)")
    logger.info(f"[ENTRY_POINTS] Using: {max_nodes} nodes (more restrictive)")
    
    # Trim to fit both constraints
    if len(result) > max_nodes:
        logger.info(f"[ENTRY_POINTS] Trimming {len(result)} → {max_nodes} (output-constrained)")
        result = result[:max_nodes]
    
    logger.info(f"[ENTRY_POINTS] Final: {len(result)} entry points (fits in {max_context_tokens} token context)")
    
    if result:
        min_reach = reachability[result[-1]]
        max_reach = reachability[result[0]]
        logger.info(f"[ENTRY_POINTS] Reachability range: {min_reach} - {max_reach}")
    
    return result