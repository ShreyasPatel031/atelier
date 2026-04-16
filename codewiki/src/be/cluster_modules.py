from typing import List, Dict, Any
from collections import defaultdict
import logging
logger = logging.getLogger(__name__)

from codewiki.src.be.dependency_analyzer.models.core import Node
from codewiki.src.be.llm_services import call_llm
from codewiki.src.be.utils import count_tokens
from codewiki.src.config import (
    CLUSTERING_THINKING_BUDGET,
    MIN_COMPONENTS_FOR_CLUSTERING,
    get_max_clustering_tokens,
    Config,
)
from codewiki.src.be.prompt_template import format_cluster_prompt


class ClusteringError(Exception):
    """
    Exception raised when LLM clustering fails.
    Contains detailed context about the failure.
    """
    def __init__(self, message: str, error_type: str, context: dict):
        super().__init__(message)
        self.error_type = error_type
        self.context = context
    
    def __str__(self):
        return f"[{self.error_type}] {super().__str__()}\nContext: {self.context}"


def _create_directory_based_modules(
    leaf_nodes: List[str],
    components: Dict[str, Node],
    current_module_name: str = None
) -> Dict[str, Any]:
    """
    DEPRECATED: This function is no longer used.
    
    Previously used as a fallback when LLM clustering failed.
    Now we raise ClusteringError instead to make failures explicit.
    
    Kept for reference only.
    """
    logger.warning("DEPRECATED: _create_directory_based_modules called but should not be used")
    from collections import defaultdict
    import os
    
    logger.info(f"[STAGE 2 FALLBACK] Creating directory-based modules for {len(leaf_nodes)} leaf nodes")
    
    # Group leaf nodes by their top-level directory
    dir_groups = defaultdict(list)
    
    for leaf_node in leaf_nodes:
        if leaf_node not in components:
            continue
        
        component = components[leaf_node]
        path = component.relative_path
        
        # Get top-level directory (or file name if no directory)
        parts = path.split(os.sep)
        if len(parts) > 1:
            # Use first directory level
            top_dir = parts[0]
        else:
            # Single file, use filename without extension
            top_dir = os.path.splitext(parts[0])[0] if parts else "root"
        
        dir_groups[top_dir].append(leaf_node)
    
    # If we have too few groups, try second-level directories
    if len(dir_groups) <= 2 and any(len(v) > 500 for v in dir_groups.values()):
        logger.info(f"[STAGE 2 FALLBACK] Too few groups ({len(dir_groups)}), trying second-level directories")
        dir_groups = defaultdict(list)
        
        for leaf_node in leaf_nodes:
            if leaf_node not in components:
                continue
            
            component = components[leaf_node]
            path = component.relative_path
            parts = path.split(os.sep)
            
            if len(parts) > 2:
                # Use first two directory levels
                key = f"{parts[0]}_{parts[1]}"
            elif len(parts) > 1:
                key = parts[0]
            else:
                key = os.path.splitext(parts[0])[0] if parts else "root"
            
            dir_groups[key].append(leaf_node)
    
    # Convert to module tree format
    module_tree = {}
    for dir_name, node_list in dir_groups.items():
        # Create clean module name
        module_name = dir_name.lower().replace("-", "_").replace(".", "_").replace(" ", "_")
        if not module_name:
            module_name = "other"
        
        # Skip empty modules
        if not node_list:
            continue
        
        module_tree[module_name] = {
            "path": dir_name,
            "components": node_list,
            "children": {}
        }
    
    logger.info(f"[STAGE 2 FALLBACK] Created {len(module_tree)} directory-based modules:")
    for name, info in module_tree.items():
        logger.info(f"[STAGE 2 FALLBACK]   - {name}: {len(info['components'])} components")
    
    # If still no modules, create a single fallback module
    if not module_tree:
        fallback_name = current_module_name or "main"
        module_tree = {
            fallback_name: {
                "path": "",
                "components": leaf_nodes,
                "children": {}
            }
        }
        logger.warning(f"[STAGE 2 FALLBACK] No directory structure found, created single module '{fallback_name}'")
    
    return module_tree


def format_potential_core_components(leaf_nodes: List[str], components: Dict[str, Node]) -> tuple[str, str]:
    """
    Format the potential core components into a string that can be used in the prompt.
    """
    # Filter out any invalid leaf nodes that don't exist in components
    valid_leaf_nodes = []
    for leaf_node in leaf_nodes:
        if leaf_node in components:
            valid_leaf_nodes.append(leaf_node)
        else:
            logger.warning(f"Skipping invalid leaf node '{leaf_node}' - not found in components")
    
    #group leaf nodes by file
    leaf_nodes_by_file = defaultdict(list)
    for leaf_node in valid_leaf_nodes:
        leaf_nodes_by_file[components[leaf_node].relative_path].append(leaf_node)

    potential_core_components = ""
    potential_core_components_with_code = ""
    for file, leaf_nodes in dict(sorted(leaf_nodes_by_file.items())).items():
        potential_core_components += f"# {file}\n"
        potential_core_components_with_code += f"# {file}\n"
        for leaf_node in leaf_nodes:
            potential_core_components += f"\t{leaf_node}\n"
            potential_core_components_with_code += f"\t{leaf_node}\n"
            potential_core_components_with_code += f"{components[leaf_node].source_code}\n"

    return potential_core_components, potential_core_components_with_code


def _collect_ids_from_module_tree(tree: Dict[str, Any]) -> set[str]:
    """All component IDs referenced anywhere in the module tree."""
    seen: set[str] = set()

    def walk(t: Dict[str, Any]) -> None:
        for _name, info in t.items():
            for c in info.get("components") or []:
                seen.add(c)
            ch = info.get("children") or {}
            if isinstance(ch, dict) and ch:
                walk(ch)

    walk(tree)
    return seen


def _log_clustering_coverage(module_tree: Dict[str, Any], expected: set[str]) -> None:
    found = _collect_ids_from_module_tree(module_tree)
    missing = expected - found
    extra = found - expected
    if missing:
        logger.warning(
            f"[STAGE 2] Coverage: {len(found)}/{len(expected)} entry points assigned; "
            f"missing {len(missing)} (showing up to 5): {list(missing)[:5]}"
        )
    if extra:
        logger.warning(f"[STAGE 2] Coverage: {len(extra)} unknown IDs in tree (showing up to 5): {list(extra)[:5]}")
    if not missing and not extra:
        logger.info(f"[STAGE 2] Coverage: all {len(expected)} entry points appear exactly once in the tree")


def cluster_modules(
    leaf_nodes: List[str],
    components: Dict[str, Node],
    config: Config,
) -> Dict[str, Any]:
    """
    One-shot LLM clustering: build a two-level module tree (4–5 top-level, 3–5 sub-modules each).
    No recursive LLM calls; Stage 3 may split further during documentation.
    """
    import time
    cluster_start = time.time()

    logger.info("[STAGE 2: MODULE CLUSTERING] Starting one-shot clustering")
    logger.info(f"[STAGE 2] Input: {len(leaf_nodes)} leaf nodes, {len(components)} components")

    potential_core_components, _ = format_potential_core_components(leaf_nodes, components)

    # Don't try to cluster too few components
    if len(leaf_nodes) < MIN_COMPONENTS_FOR_CLUSTERING:
        logger.info(
            f"[STAGE 2] Too few components to cluster ({len(leaf_nodes)} < {MIN_COMPONENTS_FOR_CLUSTERING})"
        )
        cluster_duration = time.time() - cluster_start
        repo_name = "main"
        single_module = {
            repo_name: {
                "path": "",
                "components": leaf_nodes,
                "children": {},
            }
        }
        logger.info(
            f"[STAGE 2] Created single module '{repo_name}' with {len(leaf_nodes)} components"
        )
        logger.info(f"[STAGE 2: MODULE CLUSTERING] COMPLETE in {cluster_duration:.1f}s (too few to cluster)")
        return single_module

    logger.info("[STAGE 2] Formatting cluster prompt...")
    prompt = format_cluster_prompt(potential_core_components)
    
    # Check prompt size and chunk if needed
    prompt_tokens = count_tokens(prompt)
    
    # Dynamic token limit based on model context window
    max_tokens = get_max_clustering_tokens(config.cluster_model)
    
    logger.info(f"[STAGE 2] Prompt size: {prompt_tokens} tokens, {len(leaf_nodes)} leaf nodes, threshold: {max_tokens} (dynamic for {config.cluster_model})")
    
    if prompt_tokens > max_tokens:
        logger.warning(f"[STAGE 2] Prompt too large ({prompt_tokens} tokens), truncating component list to fit context window")
        original_line_count = len(potential_core_components.split('\n'))
        # Truncate potential_core_components to fit
        lines = potential_core_components.split('\n')
        truncated = []
        current_tokens = count_tokens('\n'.join(truncated))
        for line in lines:
            line_tokens = count_tokens(line)
            if current_tokens + line_tokens > max_tokens - 5000:  # Safety margin
                break
            truncated.append(line)
            current_tokens += line_tokens
        potential_core_components = '\n'.join(truncated)
        prompt = format_cluster_prompt(potential_core_components)
        new_token_count = count_tokens(prompt)
        logger.info(f"[STAGE 2] Truncated from {original_line_count} to {len(truncated)} lines, {new_token_count} tokens")
    
    prompt_tokens = count_tokens(prompt)
    logger.info("[STAGE 2] Calling LLM for clustering (one-shot)")
    logger.info(f"[STAGE 2]   - Model: {config.cluster_model}")
    logger.info(f"[STAGE 2]   - Prompt tokens: {prompt_tokens}")
    logger.info(f"[STAGE 2]   - Leaf nodes: {len(leaf_nodes)}")
    logger.info(f"[STAGE 2]   - Components: {len(components)}")
    logger.info(f"[STAGE 2]   - Thinking budget: {CLUSTERING_THINKING_BUDGET}")

    llm_start = time.time()
    
    # DYNAMIC ALGORITHM: Retry with node reduction on failure
    # 
    # 1. Try with current nodes (3 retries for transient failures)
    # 2. If all retries fail → reduce nodes by 30% and try again
    # 3. Continue until success or too few nodes
    #
    MAX_RETRIES_PER_SIZE = 3
    MAX_REDUCTION_ROUNDS = 5
    REDUCTION_FACTOR = 0.7  # Keep 70% of nodes on each reduction
    
    current_leaf_nodes = leaf_nodes.copy()
    current_prompt = prompt
    response = None
    response_tokens = 0
    
    for reduction_round in range(MAX_REDUCTION_ROUNDS):
        last_error = None
        
        # Regenerate prompt if we reduced nodes
        if reduction_round > 0:
            filtered_components, _ = format_potential_core_components(current_leaf_nodes, components)
            current_prompt = format_cluster_prompt(filtered_components)
            logger.info(f"[STAGE 2] Reduction round {reduction_round}: {len(current_leaf_nodes)} nodes")
        
        # Try with current node count
        for attempt in range(MAX_RETRIES_PER_SIZE):
            try:
                response = call_llm(
                    current_prompt,
                    config,
                    model=config.cluster_model,
                    thinking_budget=CLUSTERING_THINKING_BUDGET,
                )
                llm_duration = time.time() - llm_start
                response_tokens = count_tokens(response)
                
                # Check for garbage response (all whitespace)
                if response.strip() == "" or len(response.strip()) < 100:
                    logger.warning(f"[STAGE 2] Round {reduction_round+1} Attempt {attempt+1}/{MAX_RETRIES_PER_SIZE}: Empty/garbage response")
                    logger.warning(f"[STAGE 2] Response length: {len(response)} chars, stripped: {len(response.strip())} chars")
                    logger.warning(f"[STAGE 2] Response preview: {repr(response[:200])}")
                    last_error = "Empty or garbage response"
                    time.sleep(2 ** attempt)
                    continue
                
                # Check for missing tags
                if "<GROUPED_COMPONENTS>" not in response or "</GROUPED_COMPONENTS>" not in response:
                    logger.warning(f"[STAGE 2] Round {reduction_round+1} Attempt {attempt+1}/{MAX_RETRIES_PER_SIZE}: Missing GROUPED_COMPONENTS ({len(response)} chars)")
                    last_error = f"Missing GROUPED_COMPONENTS (response: {len(response)} chars)"
                    time.sleep(2 ** attempt)
                    continue
                    
                logger.info(f"[STAGE 2] LLM success! Round {reduction_round+1}, Attempt {attempt+1}, {len(current_leaf_nodes)} nodes, {llm_duration:.1f}s")
                logger.info(f"[STAGE 2] Response: {len(response)} chars, {response_tokens} tokens")
                break  # Success on this attempt
                
            except Exception as e:
                last_error = str(e)
                logger.warning(f"[STAGE 2] Round {reduction_round+1} Attempt {attempt+1}/{MAX_RETRIES_PER_SIZE} failed: {e}")
                time.sleep(2 ** attempt)
                continue
        else:
            # All retries for this size exhausted - reduce nodes and try again
            if len(current_leaf_nodes) <= 50:
                raise ClusteringError(
                    f"LLM failed even with {len(current_leaf_nodes)} nodes: {last_error}",
                    error_type="LLM_IRREDUCIBLE_FAILURE",
                    context={
                        "nodes": len(current_leaf_nodes),
                        "reduction_rounds": reduction_round + 1,
                        "last_error": last_error,
                        "module": "root",
                    }
                )
            
            # Reduce by keeping only top REDUCTION_FACTOR of nodes
            new_size = max(50, int(len(current_leaf_nodes) * REDUCTION_FACTOR))
            logger.warning(f"[STAGE 2] ⚠️ Reducing nodes: {len(current_leaf_nodes)} → {new_size} (keeping highest reachability)")
            current_leaf_nodes = current_leaf_nodes[:new_size]
            continue
        
        # If we get here, LLM succeeded
        break
    else:
        raise ClusteringError(
            f"LLM failed after {MAX_REDUCTION_ROUNDS} reduction rounds",
            error_type="LLM_MAX_REDUCTIONS",
            context={
                "reduction_rounds": MAX_REDUCTION_ROUNDS,
                "final_nodes": len(current_leaf_nodes),
                "module": "root",
            }
        )
    
    # CRITICAL: Detect if response was truncated (hit max_tokens limit)
    MAX_OUTPUT_TOKENS = 65536  # Gemini 2.5 Flash limit
    if response_tokens >= MAX_OUTPUT_TOKENS - 100:
        logger.error(f"[STAGE 2] ════════════════════════════════════════════════════════════")
        logger.error(f"[STAGE 2] CLUSTERING FAILED: RESPONSE TRUNCATED")
        logger.error(f"[STAGE 2] ════════════════════════════════════════════════════════════")
        logger.error(f"[STAGE 2] Response tokens ({response_tokens}) near max ({MAX_OUTPUT_TOKENS})")
        if "</GROUPED_COMPONENTS>" not in response:
            logger.error(f"[STAGE 2] Missing closing </GROUPED_COMPONENTS> tag")
            logger.error(f"[STAGE 2] Components: {len(leaf_nodes)}")
            logger.error("[STAGE 2] Module: root")
            raise ClusteringError(
                f"LLM response truncated - missing GROUPED_COMPONENTS tags",
                error_type="TRUNCATION",
                context={
                    "response_tokens": response_tokens,
                    "max_tokens": MAX_OUTPUT_TOKENS,
                    "leaf_nodes": len(leaf_nodes),
                    "module": "root",
                }
            )

    #parse the response
    logger.info(f"[STAGE 2] Parsing LLM response...")
    try:
        if "<GROUPED_COMPONENTS>" not in response or "</GROUPED_COMPONENTS>" not in response:
            logger.error(f"[STAGE 2] ════════════════════════════════════════════════════════════")
            logger.error(f"[STAGE 2] CLUSTERING FAILED: INVALID RESPONSE FORMAT")
            logger.error(f"[STAGE 2] ════════════════════════════════════════════════════════════")
            logger.error(f"[STAGE 2] Missing <GROUPED_COMPONENTS> tags")
            logger.error(f"[STAGE 2] Response length: {len(response)} chars")
            logger.error(f"[STAGE 2] Response preview: {response[:500]}...")
            raise ClusteringError(
                f"Invalid LLM response - missing GROUPED_COMPONENTS tags",
                error_type="INVALID_FORMAT",
                context={
                    "response_length": len(response),
                    "response_preview": response[:500],
                    "module": "root",
                }
            )
        
        response_content = response.split("<GROUPED_COMPONENTS>")[1].split("</GROUPED_COMPONENTS>")[0]
        logger.info(f"[STAGE 2] Extracted response content: {len(response_content)} chars")
        logger.debug(f"[STAGE 2] Response content preview: {response_content[:200]}...")
        
        module_tree = eval(response_content)
        logger.info(f"[STAGE 2] Parsed module tree type: {type(module_tree)}, length: {len(module_tree) if isinstance(module_tree, dict) else 'N/A'}")
        
        if not isinstance(module_tree, dict):
            logger.error(f"[STAGE 2] CRITICAL: Invalid module tree format - expected dict, got {type(module_tree)}")
            logger.error(f"[STAGE 2] Value: {str(module_tree)[:200]}...")
            return {}
            
    except SyntaxError as e:
        logger.error(f"[STAGE 2] ════════════════════════════════════════════════════════════")
        logger.error(f"[STAGE 2] CLUSTERING FAILED: SYNTAX ERROR IN RESPONSE")
        logger.error(f"[STAGE 2] ════════════════════════════════════════════════════════════")
        logger.error(f"[STAGE 2] Error: {e}")
        logger.error(f"[STAGE 2] Response content: {response_content[:500] if 'response_content' in locals() else 'N/A'}...")
        raise ClusteringError(
            f"Syntax error parsing LLM response: {e}",
            error_type="SYNTAX_ERROR",
            context={
                "response_content": response_content[:500] if 'response_content' in locals() else 'N/A',
                "module": "root",
            }
        ) from e
    except Exception as e:
        logger.error(f"[STAGE 2] ════════════════════════════════════════════════════════════")
        logger.error(f"[STAGE 2] CLUSTERING FAILED: PARSE ERROR")
        logger.error(f"[STAGE 2] ════════════════════════════════════════════════════════════")
        logger.error(f"[STAGE 2] Error: {type(e).__name__}: {str(e)}")
        logger.error(f"[STAGE 2] Response preview: {response[:500]}...")
        import traceback
        logger.error(f"[STAGE 2] Traceback:\n{traceback.format_exc()}")
        raise ClusteringError(
            f"Failed to parse LLM response: {type(e).__name__}: {str(e)}",
            error_type="PARSE_ERROR",
            context={
                "response_preview": response[:500],
                "response_length": len(response),
                "module": "root",
            }
        ) from e

    # check if the module tree is valid - only reject if truly empty
    if len(module_tree) == 0:
        logger.error(f"[STAGE 2] ════════════════════════════════════════════════════════════")
        logger.error(f"[STAGE 2] CLUSTERING FAILED: EMPTY MODULE TREE")
        logger.error(f"[STAGE 2] ════════════════════════════════════════════════════════════")
        logger.error(f"[STAGE 2] LLM returned empty module tree")
        logger.error(f"[STAGE 2] Input: {len(leaf_nodes)} leaf nodes, {len(components)} components")
        logger.error(f"[STAGE 2] Response length: {len(response)} chars")
        if len(response) > 500:
            logger.error(f"[STAGE 2] Response preview: {response[:500]}...")
        raise ClusteringError(
            f"LLM returned empty module tree",
            error_type="EMPTY_RESULT",
            context={
                "leaf_nodes": len(leaf_nodes),
                "components": len(components),
                "response_length": len(response),
                "module": "root",
            }
        )

    logger.info(f"[STAGE 2] Module tree validated: {len(module_tree)} top-level modules")
    logger.info(f"[STAGE 2] Module names: {list(module_tree.keys())}")

    expected_ids = {n for n in current_leaf_nodes if n in components}
    _log_clustering_coverage(module_tree, expected_ids)

    cluster_duration = time.time() - cluster_start
    logger.info(f"[STAGE 2: MODULE CLUSTERING] COMPLETE in {cluster_duration:.1f}s (one-shot)")
    logger.info(f"[STAGE 2] Result: {len(module_tree)} top-level modules")
    return module_tree