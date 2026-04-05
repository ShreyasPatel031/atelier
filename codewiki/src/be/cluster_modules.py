from typing import List, Dict, Any
from collections import defaultdict
import logging
logger = logging.getLogger(__name__)

from codewiki.src.be.dependency_analyzer.models.core import Node
from codewiki.src.be.llm_services import call_llm
from codewiki.src.be.utils import count_tokens, count_module_tokens
from codewiki.src.config import (
    MAX_TOKEN_PER_MODULE, 
    MAX_DEPTH,
    MIN_COMPONENTS_FOR_CLUSTERING,
    get_max_clustering_tokens,
    Config
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


def cluster_modules(
    leaf_nodes: List[str],
    components: Dict[str, Node],
    config: Config,
    current_module_tree: dict[str, Any] = {},
    current_module_name: str = None,
    current_module_path: List[str] = []
) -> Dict[str, Any]:
    """
    Cluster the potential core components into modules.
    """
    import time
    cluster_start = time.time()
    depth = len(current_module_path)
    module_path_str = ".".join(current_module_path) if current_module_path else "root"
    
    logger.info(f"[STAGE 2: MODULE CLUSTERING] Starting clustering (depth={depth}, path={module_path_str})")
    logger.info(f"[STAGE 2] Input: {len(leaf_nodes)} leaf nodes, {len(components)} components")
    if current_module_name:
        logger.info(f"[STAGE 2] Current module: {current_module_name}")
    
    potential_core_components, potential_core_components_with_code = format_potential_core_components(leaf_nodes, components)
    
    # Use centralized token counting that matches the actual LLM prompt format (full file contents)
    # This ensures consistent threshold checking with what actually gets sent to the LLM
    token_count = count_module_tokens(leaf_nodes, components)
    logger.info(f"[STAGE 2] Module token count (full files): {token_count}, MAX_TOKEN_PER_MODULE: {MAX_TOKEN_PER_MODULE}")

    # FIX: Don't try to cluster too few components (prevents infinite nesting bug)
    # Even if files are large, 2 components can't be meaningfully clustered further
    if len(leaf_nodes) < MIN_COMPONENTS_FOR_CLUSTERING:
        logger.info(f"[STAGE 2] Too few components to cluster ({len(leaf_nodes)} < {MIN_COMPONENTS_FOR_CLUSTERING})")
        cluster_duration = time.time() - cluster_start
        
        if current_module_name is not None:
            logger.info(f"[STAGE 2] Recursive call - returning empty children (too few components)")
            logger.info(f"[STAGE 2: MODULE CLUSTERING] COMPLETE in {cluster_duration:.1f}s (leaf module)")
            return {}
        
        # Root level with very few components
        repo_name = "main"
        single_module = {
            repo_name: {
                "path": "",
                "components": leaf_nodes,
                "children": {}
            }
        }
        logger.info(f"[STAGE 2] Root level - created single module '{repo_name}' with {len(leaf_nodes)} components")
        logger.info(f"[STAGE 2: MODULE CLUSTERING] COMPLETE in {cluster_duration:.1f}s (too few to cluster)")
        return single_module

    # Enforce MAX_DEPTH to prevent unbounded recursion.
    # MAX_DEPTH (config.py) is the existing constant; we treat the module as a
    # leaf when we reach it.  This is a hard guard — the "no-progress" check
    # below catches the common case much earlier.
    if depth >= MAX_DEPTH:
        logger.warning(f"[STAGE 2] Hit MAX_DEPTH ({MAX_DEPTH}) at path={module_path_str} — treating as leaf")
        cluster_duration = time.time() - cluster_start
        if current_module_name is not None:
            logger.info(f"[STAGE 2: MODULE CLUSTERING] COMPLETE in {cluster_duration:.1f}s (max depth reached)")
            return {}
        return {
            "main": {"path": "", "components": leaf_nodes, "children": {}}
        }

    if token_count <= MAX_TOKEN_PER_MODULE:
        # Module fits in single module - no further clustering needed
        logger.info(f"[STAGE 2] Module fits in single module ({token_count} <= {MAX_TOKEN_PER_MODULE})")
        logger.info(f"[STAGE 2]   - Token count: {token_count}")
        logger.info(f"[STAGE 2]   - Threshold: {MAX_TOKEN_PER_MODULE}")
        logger.info(f"[STAGE 2]   - Leaf nodes: {len(leaf_nodes)}")
        logger.info(f"[STAGE 2]   - Module: {current_module_name or 'root'}")
        
        cluster_duration = time.time() - cluster_start
        
        # If this is a recursive call (not root level), return empty dict
        # The parent module already exists in the tree with its components
        # We don't need to create a nested child - just signal no further clustering needed
        if current_module_name is not None:
            logger.info(f"[STAGE 2] Recursive call - returning empty children (no further clustering)")
            logger.info(f"[STAGE 2: MODULE CLUSTERING] COMPLETE in {cluster_duration:.1f}s (leaf module, no children)")
            return {}
        
        # Root level with small token count - create a single module
        # LLM clustering is not needed for small codebases
        repo_name = "main"
        single_module = {
            repo_name: {
                "path": "",
                "components": leaf_nodes,
                "children": {}
            }
        }
        logger.info(f"[STAGE 2] Root level - created single module '{repo_name}' with {len(leaf_nodes)} components")
        logger.info(f"[STAGE 2] Token count {token_count} <= threshold {MAX_TOKEN_PER_MODULE}, no LLM clustering needed")
        logger.info(f"[STAGE 2: MODULE CLUSTERING] COMPLETE in {cluster_duration:.1f}s (single module, no LLM needed)")
        return single_module

    # Use only component names (not full code) for clustering to avoid context length issues
    # The LLM only needs names to group them, not full source code
    logger.info(f"[STAGE 2] Formatting cluster prompt...")
    prompt = format_cluster_prompt(potential_core_components, current_module_tree, current_module_name)
    
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
        prompt = format_cluster_prompt(potential_core_components, current_module_tree, current_module_name)
        new_token_count = count_tokens(prompt)
        logger.info(f"[STAGE 2] Truncated from {original_line_count} to {len(truncated)} lines, {new_token_count} tokens")
    
    prompt_tokens = count_tokens(prompt)
    logger.info(f"[STAGE 2] Calling LLM for clustering")
    logger.info(f"[STAGE 2]   - Model: {config.cluster_model}")
    logger.info(f"[STAGE 2]   - Prompt tokens: {prompt_tokens}")
    logger.info(f"[STAGE 2]   - Leaf nodes: {len(leaf_nodes)}")
    logger.info(f"[STAGE 2]   - Components: {len(components)}")
    logger.info(f"[STAGE 2]   - Module: {current_module_name or 'root'}")
    
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
            # Filter potential_core_components to only include current_leaf_nodes
            filtered_components = format_potential_core_components(current_leaf_nodes, components)
            current_prompt = format_cluster_prompt(filtered_components, current_module_tree, current_module_name)
            logger.info(f"[STAGE 2] Reduction round {reduction_round}: {len(current_leaf_nodes)} nodes")
        
        # Try with current node count
        for attempt in range(MAX_RETRIES_PER_SIZE):
            try:
                response = call_llm(current_prompt, config, model=config.cluster_model)
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
                        "module": current_module_name or "root"
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
                "module": current_module_name or "root"
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
            logger.error(f"[STAGE 2] Module: {current_module_name or 'root'}")
            raise ClusteringError(
                f"LLM response truncated - missing GROUPED_COMPONENTS tags",
                error_type="TRUNCATION",
                context={
                    "response_tokens": response_tokens,
                    "max_tokens": MAX_OUTPUT_TOKENS,
                    "leaf_nodes": len(leaf_nodes),
                    "module": current_module_name or "root"
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
                    "module": current_module_name or "root"
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
                "module": current_module_name or "root"
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
                "module": current_module_name or "root"
            }
        ) from e

    # check if the module tree is valid - only reject if truly empty
    # Single module results (len=1) are valid and should be accepted
    if len(module_tree) == 0:
        logger.error(f"[STAGE 2] ════════════════════════════════════════════════════════════")
        logger.error(f"[STAGE 2] CLUSTERING FAILED: EMPTY MODULE TREE")
        logger.error(f"[STAGE 2] ════════════════════════════════════════════════════════════")
        logger.error(f"[STAGE 2] LLM returned empty module tree")
        logger.error(f"[STAGE 2] Input: {len(leaf_nodes)} leaf nodes, {len(components)} components")
        logger.error(f"[STAGE 2] Token count: {token_count}")
        logger.error(f"[STAGE 2] Response length: {len(response)} chars")
        if len(response) > 500:
            logger.error(f"[STAGE 2] Response preview: {response[:500]}...")
        raise ClusteringError(
            f"LLM returned empty module tree",
            error_type="EMPTY_RESULT",
            context={
                "leaf_nodes": len(leaf_nodes),
                "components": len(components),
                "token_count": token_count,
                "response_length": len(response),
                "module": current_module_name or "root"
            }
        )
    elif len(module_tree) == 1:
        # Single module is valid, but check for "no-progress": the LLM put all
        # the same components into one child.  When this happens the recursive
        # call will see the exact same token count and try to split again,
        # looping forever.  Detect it and treat this module as a leaf instead.
        only_key = list(module_tree.keys())[0]
        child_components = set(module_tree[only_key].get("components", []))
        parent_components = set(leaf_nodes)
        if child_components == parent_components:
            logger.warning(
                f"[STAGE 2] No-progress: LLM returned single child '{only_key}' "
                f"with identical {len(child_components)} components — treating as leaf"
            )
            cluster_duration = time.time() - cluster_start
            if current_module_name is not None:
                logger.info(f"[STAGE 2: MODULE CLUSTERING] COMPLETE in {cluster_duration:.1f}s (no-progress, leaf)")
                return {}
            # Root level: wrap in a single module
            module_tree[only_key]["children"] = {}
            return module_tree
        logger.info(f"[STAGE 2] LLM returned single module: {list(module_tree.keys())}")
        logger.info(f"[STAGE 2] Single module is valid - proceeding with it")

    if current_module_tree == {}:
        current_module_tree = module_tree
    else:
        value = current_module_tree
        for key in current_module_path:
            value = value[key]["children"]
        for module_name, module_info in module_tree.items():
            del module_info["path"]
            value[module_name] = module_info

    logger.info(f"[STAGE 2] Module tree validated: {len(module_tree)} modules created")
    logger.info(f"[STAGE 2] Module names: {list(module_tree.keys())}")
    
    # Recursively cluster sub-modules
    for module_name, module_info in module_tree.items():
        sub_leaf_nodes = module_info.get("components", [])
        logger.info(f"[STAGE 2] Processing sub-modules for '{module_name}' with {len(sub_leaf_nodes)} components")
        
        # Filter sub_leaf_nodes to ensure they exist in components
        valid_sub_leaf_nodes = []
        invalid_count = 0
        for node in sub_leaf_nodes:
            if node in components:
                valid_sub_leaf_nodes.append(node)
            else:
                logger.warning(f"[STAGE 2] Skipping invalid sub leaf node '{node}' in module '{module_name}' - not found in components")
                invalid_count += 1
        
        if invalid_count > 0:
            logger.warning(f"[STAGE 2] Module '{module_name}': {invalid_count} invalid sub leaf nodes filtered out, {len(valid_sub_leaf_nodes)} valid")
        
        current_module_path.append(module_name)
        try:
            module_info["children"] = {}
            module_info["children"] = cluster_modules(valid_sub_leaf_nodes, components, config, current_module_tree, module_name, current_module_path)
            logger.info(f"[STAGE 2] Sub-modules for '{module_name}': {len(module_info['children'])} children created")
        except Exception as e:
            logger.error(f"[STAGE 2] Failed to cluster sub-modules for '{module_name}': {type(e).__name__}: {str(e)}")
            module_info["children"] = {}
        finally:
            current_module_path.pop()

    cluster_duration = time.time() - cluster_start
    logger.info(f"[STAGE 2: MODULE CLUSTERING] COMPLETE in {cluster_duration:.1f}s (depth={depth}, path={module_path_str})")
    logger.info(f"[STAGE 2] Result: {len(module_tree)} modules at this level")
    return module_tree