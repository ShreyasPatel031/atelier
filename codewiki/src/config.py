from dataclasses import dataclass
import argparse
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# `config.py` lives at `codewiki/src/config.py` — repo root is three levels up.
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
# `override=True`: a stale `export GEMINI_API_KEY=...` in the shell must not win over the repo .env
load_dotenv(_REPO_ROOT / ".env", override=True)
load_dotenv()

# Constants
OUTPUT_BASE_DIR = 'output'
DEPENDENCY_GRAPHS_DIR = 'dependency_graphs'
DOCS_DIR = 'docs'
FIRST_MODULE_TREE_FILENAME = 'first_module_tree.json'
MODULE_TREE_FILENAME = 'module_tree.json'
OVERVIEW_FILENAME = 'overview.json'
MODULE_DOC_EXT = '.json'
GENERATION_METRICS_FILENAME = 'generation_metrics.json'


def module_doc_filename(stem: str) -> str:
    """Per-module documentation filename (e.g. ``user_auth.json``)."""
    return f"{stem}{MODULE_DOC_EXT}"


def module_doc_path(docs_dir: os.PathLike | str, stem: str) -> Path:
    """Absolute path to a module's JSON documentation file."""
    return Path(docs_dir) / module_doc_filename(stem)

# =============================================================================
# CONSOLIDATED THRESHOLDS - All size/token limits in one place
# =============================================================================

# Clustering Thresholds (Stage 2)
# Agent delegation: depth starts at 1 per module; sub-agents increment. Submodule tool is omitted when
# current_depth >= MAX_DEPTH. Default 2 = one parent→sub-agent round (set MAX_DEPTH=1 for no delegation).
MAX_DEPTH = int(os.getenv("MAX_DEPTH", "2"))
MIN_DEPTH = int(os.getenv("MIN_DEPTH", "1"))   # Minimum depth - force sub-agents until this depth
CLUSTERING_THINKING_BUDGET = int(os.getenv("CLUSTERING_THINKING_BUDGET", "2048"))  # Gemini thinking tokens for one-shot clustering (REST API)
MAX_TOKEN_PER_LEAF_MODULE = 16_000      # Threshold for sub-module delegation in Stage 4
MIN_COMPONENTS_FOR_CLUSTERING = 3       # Don't try to cluster fewer than this many components
                                        # Fixes infinite nesting bug when 2 components have large files
MAX_ENTRY_POINTS = 300                  # Max entry points for clustering (top N by reachability)

# LLM Context Thresholds - Dynamic based on model
# Model context windows (INPUT tokens)
MODEL_CONTEXT_WINDOWS = {
    'gemini-2.5-flash': 1_000_000,
    'gemini-2.0-flash': 1_000_000,
    'gemini-1.5-flash': 1_000_000,
    'gemini-1.5-pro': 2_000_000,
    'gpt-4o': 128_000,
    'gpt-4-turbo': 128_000,
    'claude-3-opus': 200_000,
    'claude-3-sonnet': 200_000,
    'claude-3-haiku': 200_000,
    'glm-4p5': 128_000,
}
DEFAULT_CONTEXT_WINDOW = 128_000  # Fallback for unknown models

# Model OUTPUT token limits
# TESTED: 16K works reliably, 20K+ times out on large repos
# 16K tokens / 40 tokens per node = ~360 nodes max
MODEL_OUTPUT_LIMITS = {
    'gemini-2.5-flash': 16_000,  # TESTED: max reliable limit
    'gemini-2.0-flash': 16_000,
    'gemini-1.5-flash': 8_000,
    'gemini-1.5-pro': 8_000,
    'gpt-4o': 16_000,
    'gpt-4-turbo': 4_000,
    'claude-3-opus': 4_000,
    'claude-3-sonnet': 4_000,
    'claude-3-haiku': 4_000,
    'glm-4p5': 4_000,
}
DEFAULT_OUTPUT_LIMIT = 8_000

# System prompt overhead (approximate)
SYSTEM_PROMPT_TOKENS = 3_000  # Clustering system prompt size
SAFETY_BUFFER_PERCENT = 0.10  # 10% buffer

# Tokens per node estimates for clustering
TOKENS_PER_NODE_INPUT = 25   # Node name in prompt
TOKENS_PER_NODE_OUTPUT = 40  # Node name + JSON structure in response

def get_max_clustering_tokens(model_name: str) -> int:
    """Calculate max INPUT tokens for clustering based on model context window."""
    context = MODEL_CONTEXT_WINDOWS.get(model_name, DEFAULT_CONTEXT_WINDOW)
    usable = context - SYSTEM_PROMPT_TOKENS
    return int(usable * (1 - SAFETY_BUFFER_PERCENT))

def get_max_clustering_nodes(model_name: str) -> int:
    """Calculate max nodes for clustering based on OUTPUT token limit."""
    output_limit = MODEL_OUTPUT_LIMITS.get(model_name, DEFAULT_OUTPUT_LIMIT)
    usable = int(output_limit * (1 - SAFETY_BUFFER_PERCENT))
    return usable // TOKENS_PER_NODE_OUTPUT

MAX_LLM_OUTPUT_TOKENS = 16_384          # Legacy - use get_max_clustering_nodes instead

# Module Tree Tiering Thresholds (for large repos)
LARGE_REPO_COMPONENT_THRESHOLD = 500    # Switch to tiered module tree above this
BEHEMOTH_REPO_COMPONENT_THRESHOLD = 2000 # Use on-demand loading above this
MAX_MODULE_TREE_TOKENS = 10_000         # Max tokens for module tree in prompt
                                        # If exceeded, switch to summaries + tools

# CLI context detection
_CLI_CONTEXT = False

def set_cli_context(enabled: bool = True):
    """Set whether we're running in CLI context (vs web app)."""
    global _CLI_CONTEXT
    _CLI_CONTEXT = enabled

def is_cli_context() -> bool:
    """Check if running in CLI context."""
    return _CLI_CONTEXT

# LLM services
# In CLI mode, these will be loaded from ~/.codewiki/config.json + keyring
# In web app mode, use environment variables
MAIN_MODEL = os.getenv('MAIN_MODEL', 'gemini-2.5-flash')
FALLBACK_MODEL_1 = os.getenv('FALLBACK_MODEL_1', 'glm-4p5')
CLUSTER_MODEL = os.getenv('CLUSTER_MODEL', MAIN_MODEL)
LLM_BASE_URL = os.getenv('LLM_BASE_URL', 'http://0.0.0.0:4000/')
# OPENAI_API_KEY is a common convention; LLM_API_KEY overrides when set.
LLM_API_KEY = os.getenv('LLM_API_KEY') or os.getenv('OPENAI_API_KEY') or 'sk-1234'

@dataclass
class Config:
    """Configuration class for CodeWiki."""
    repo_path: str
    output_dir: str
    dependency_graph_dir: str
    docs_dir: str
    max_depth: int
    # LLM configuration
    llm_base_url: str
    llm_api_key: str
    main_model: str
    cluster_model: str
    fallback_model: str = FALLBACK_MODEL_1
    # Google Cloud / Vertex AI ADC mode (no expiring API key)
    use_vertex_ai: bool = False
    gcp_project: str = ""
    
    @classmethod
    def from_args(cls, args: argparse.Namespace) -> 'Config':
        """Create configuration from parsed arguments."""
        repo_name = os.path.basename(os.path.normpath(args.repo_path))
        sanitized_repo_name = ''.join(c if c.isalnum() else '_' for c in repo_name)
        
        return cls(
            repo_path=args.repo_path,
            output_dir=OUTPUT_BASE_DIR,
            dependency_graph_dir=os.path.join(OUTPUT_BASE_DIR, DEPENDENCY_GRAPHS_DIR),
            docs_dir=os.path.join(OUTPUT_BASE_DIR, DOCS_DIR, f"{sanitized_repo_name}-docs"),
            max_depth=MAX_DEPTH,
            llm_base_url=LLM_BASE_URL,
            llm_api_key=LLM_API_KEY,
            main_model=MAIN_MODEL,
            cluster_model=CLUSTER_MODEL,
            fallback_model=FALLBACK_MODEL_1
        )
    
    @classmethod
    def from_cli(
        cls,
        repo_path: str,
        output_dir: str,
        llm_base_url: str,
        llm_api_key: str,
        main_model: str,
        cluster_model: str,
        fallback_model: str = FALLBACK_MODEL_1,
        use_vertex_ai: bool = False,
        gcp_project: str = "",
    ) -> 'Config':
        """
        Create configuration for CLI context.
        
        Args:
            repo_path: Repository path
            output_dir: Output directory for generated docs
            llm_base_url: LLM API base URL
            llm_api_key: LLM API key
            main_model: Primary model
            cluster_model: Clustering model
            fallback_model: Fallback model
            
        Returns:
            Config instance
        """
        repo_name = os.path.basename(os.path.normpath(repo_path))
        base_output_dir = os.path.join(output_dir, "temp")
        
        return cls(
            repo_path=repo_path,
            output_dir=base_output_dir,
            dependency_graph_dir=os.path.join(base_output_dir, DEPENDENCY_GRAPHS_DIR),
            docs_dir=output_dir,
            max_depth=MAX_DEPTH,
            llm_base_url=llm_base_url,
            llm_api_key=llm_api_key,
            main_model=main_model,
            cluster_model=cluster_model,
            fallback_model=fallback_model,
            use_vertex_ai=use_vertex_ai,
            gcp_project=gcp_project,
        )