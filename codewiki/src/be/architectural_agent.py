#!/usr/bin/env python3
"""
Architectural Agent - Read-only agent for repository exploration and Q&A.

This agent has access to:
- Module tree + canonical diagram JSON
- Documentation markdown
- Component metadata (IDs, paths, types, dependencies)

But does NOT have access to:
- Full source code reading (no read_code_components)
- Documentation editing (no str_replace_editor)
- Sub-module generation (no generate_sub_module_documentation)
"""

import logging
import json
import re
from pathlib import Path
from typing import Dict, Any, Optional, List

from pydantic_core import to_jsonable_python
from pydantic_ai import Agent
from pydantic_ai import ModelMessagesTypeAdapter
from pydantic_ai.messages import ModelRequest, ModelResponse, UserPromptPart, TextPart

from codewiki.src.file_manager import file_manager

logger = logging.getLogger(__name__)


ARCHITECTURAL_AGENT_SYSTEM_PROMPT_TEMPLATE = """You are an architectural navigation assistant for exploring software repositories.

You have access to: module tree, documentation markdown, diagram JSON, component metadata. You do NOT have full source code.

When answering:
- Keep answers under 3–4 sentences. Never exceed one short paragraph.
- Be direct and to the point. No fluff, no "Here's...", no lengthy introductions.
- Use bullet points or short lists when listing multiple items.
- Reference module names when relevant.
- If you can't answer (e.g. no source access), say so briefly and suggest what you can provide instead.

Viewer vs module diagrams:
- A block labeled "VIEWER DIAGRAM SELECTION" describes which **node, cluster, or edge** is highlighted on the **interactive Mermaid diagram** (logical id from the viewer registry). Questions like "which diagram node is selected", "what did I click on the graph", "what's highlighted on the diagram" refer to **that** selection—not the open doc page title alone.
- "[Context: Currently viewing module: …]" is which **documentation page** is open. That is separate from the diagram highlight.

COMPLETE MODULE TREE (all modules in repository):
{module_tree}
"""


class ArchitecturalAgentRunner:
    """Runner for the architectural exploration agent."""
    
    def __init__(self, docs_path: str, llm_base_url: str = None, llm_api_key: str = None, main_model: str = None):
        """
        Initialize the architectural agent.
        
        Args:
            docs_path: Path to the generated documentation folder
            llm_base_url: LLM API base URL (defaults to env var)
            llm_api_key: LLM API key (defaults to env var)
            main_model: Main model name (defaults to env var)
        """
        import os
        
        self.docs_path = Path(docs_path)
        
        # Get Gemini API key from environment (optional if using gcloud auth)
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        self.main_model = main_model or os.getenv('MAIN_MODEL', 'gemini-2.5-flash')
        
        # Load artifacts
        self.module_tree = self._load_module_tree()
        self.metadata = self._load_metadata()
        
        # Create Gemini model using pydantic-ai
        # If GEMINI_API_KEY is set, use it; otherwise rely on gcloud application-default credentials
        from pydantic_ai.models.google import GoogleModel
        
        if self.gemini_api_key:
            # Set environment variable for GoogleModel
            os.environ['GEMINI_API_KEY'] = self.gemini_api_key
            self.model = GoogleModel(
                model_name=self.main_model,
                provider='google-gla'
            )
        else:
            # Use gcloud application-default credentials
            # GoogleModel should automatically use ADC if no API key is provided
            try:
                # Verify gcloud auth is available
                import subprocess
                result = subprocess.run(['gcloud', 'auth', 'application-default', 'print-access-token'], 
                                      capture_output=True, text=True, timeout=5)
                if result.returncode != 0:
                    raise ValueError("GEMINI_API_KEY not set and gcloud application-default credentials not available. "
                                   "Run: gcloud auth application-default login")
            except (FileNotFoundError, subprocess.TimeoutExpired):
                raise ValueError("GEMINI_API_KEY not set and gcloud not available. "
                               "Either set GEMINI_API_KEY or install/configure gcloud")
            
            # GoogleModel with google-gla provider should use ADC automatically
            self.model = GoogleModel(
                model_name=self.main_model,
                provider='google-gla'
            )
        
    def _load_module_tree(self) -> Dict[str, Any]:
        """Load module tree from docs."""
        tree_path = self.docs_path / "module_tree.json"
        if tree_path.exists():
            return file_manager.load_json(tree_path) or {}
        return {}
    
    def _load_metadata(self) -> Dict[str, Any]:
        """Load metadata from docs."""
        metadata_path = self.docs_path / "metadata.json"
        if metadata_path.exists():
            return file_manager.load_json(metadata_path) or {}
        return {}
    
    def _format_module_tree_for_prompt(self) -> str:
        """Format the full module tree as text for the system prompt."""
        import json
        try:
            # Convert to JSON string with indentation for readability
            tree_json = json.dumps(self.module_tree, indent=2)
            
            # Count modules and components for logging
            total_modules = self._count_modules(self.module_tree)
            total_components = self._count_components(self.module_tree)
            
            logger.info(f"[ARCH-AGENT] Module tree formatted: {total_modules} modules, {total_components} total components")
            logger.debug(f"[ARCH-AGENT] Module tree JSON length: {len(tree_json)} chars")
            
            return tree_json
        except Exception as e:
            logger.error(f"[ARCH-AGENT] Error formatting module tree: {e}")
            return "{}"
    
    def _count_modules(self, tree: Dict[str, Any]) -> int:
        """Recursively count total modules in tree."""
        count = len(tree)
        for module_data in tree.values():
            if isinstance(module_data.get('children'), dict):
                count += self._count_modules(module_data['children'])
        return count
    
    def _count_components(self, tree: Dict[str, Any]) -> int:
        """Recursively count total components in tree."""
        count = 0
        for module_data in tree.values():
            count += len(module_data.get('components', []))
            if isinstance(module_data.get('children'), dict):
                count += self._count_components(module_data['children'])
        return count
    
    def _format_diagram_selection_system_block(
        self, diagram_selection: Optional[Dict[str, Any]]
    ) -> str:
        """Interactive diagram highlight (node/cluster/edge)."""
        if not diagram_selection:
            return (
                "VIEWER DIAGRAM SELECTION: None.\n"
                "No interactive diagram shape is reported as selected (or selection was cleared)."
            )
        kind = str(diagram_selection.get("kind") or "none").lower().strip()
        lid = str(diagram_selection.get("logical_id") or "").strip()
        if kind == "none" or not lid:
            return (
                "VIEWER DIAGRAM SELECTION: None.\n"
                "No node/cluster/edge is highlighted on the Mermaid diagram."
            )
        label = str(diagram_selection.get("label") or lid).strip()
        mod = str(diagram_selection.get("module_id") or "").strip()
        lines = [
            "VIEWER DIAGRAM SELECTION (authoritative for 'what is selected on the diagram graph' questions):",
            f"- Kind: {kind}",
            f'- Logical id (registry / data-logical-id): {lid}',
            f'- Visible label: "{label}"',
        ]
        if mod:
            lines.append(f"- Module context (viewer page): {mod}")
        lines.append(
            "If the user asks which diagram node/cluster is selected or what is highlighted on the graph: "
            f'state this logical id ({lid}) and label ("{label}").'
        )
        return "\n".join(lines)

    def _format_user_message_diagram_selection_prefix(
        self, diagram_selection: Optional[Dict[str, Any]]
    ) -> str:
        """Short prefix: interactive diagram highlight."""
        if not diagram_selection:
            return "[Viewer diagram selection: none]\n"
        kind = str(diagram_selection.get("kind") or "none").lower().strip()
        lid = str(diagram_selection.get("logical_id") or "").strip()
        if kind == "none" or not lid:
            return "[Viewer diagram selection: none]\n"
        label = str(diagram_selection.get("label") or lid).strip()
        return f'[Viewer diagram selection: {kind} "{label}" (logical id: {lid})]\n'

    def _is_viewer_ui_meta_question(self, message: str) -> bool:
        """Questions about diagram highlight vs open doc — answer deterministically when clearly UI-meta."""
        t = message.strip().lower()
        if not t or len(t) > 280:
            return False
        if re.search(r"viewer\s+diagram\s+selection", t):
            return True
        if re.search(
            r"(what|which).{0,40}(select|highlight).{0,40}(diagram|graph|mermaid)",
            t,
        ):
            return True
        if re.search(
            r"(diagram|graph|mermaid).{0,40}(select|highlight|click)",
            t,
        ):
            return True
        if re.search(r"what\s+is\s+highlighted", t) and re.search(
            r"diagram|graph|mermaid", t
        ):
            return True
        return False

    def _deterministic_viewer_ui_answer(
        self,
        diagram_selection: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Exact answer for interactive diagram UI state. Not codebase architecture."""
        ds = diagram_selection or {}
        open_doc = str(ds.get("module_id") or "").strip() or None
        dkind = str(ds.get("kind") or "none").lower().strip()
        dlid = str(ds.get("logical_id") or "").strip()
        dlabel = str(ds.get("label") or dlid).strip()
        lines = []
        if dkind != "none" and dlid:
            lines.append(
                f'**Interactive diagram selection** (highlighted on the Mermaid graph): **"{dlabel}"** '
                f"(logical id: `{dlid}`, kind: {dkind})."
            )
        else:
            lines.append(
                "**Interactive diagram selection:** none — no node/cluster/edge is highlighted on the diagram."
            )
        if open_doc:
            lines.append(
                f"**Diagram module context** (from selection): `{open_doc}`."
            )
        else:
            lines.append(
                "**Diagram module context:** not reported on this selection (or nothing selected)."
            )
        lines.append(
            "*Diagram selection reports the highlighted shape and its module when applicable.*"
        )
        return "\n\n".join(lines)

    def _append_turn_to_history(
        self,
        message_history: Optional[List[Any]],
        enhanced_message: str,
        assistant_text: str,
    ) -> List[Any]:
        """Append this user/assistant pair so multi-turn chat stays consistent."""
        prior: List = []
        if message_history:
            try:
                prior = list(ModelMessagesTypeAdapter.validate_python(message_history))
            except Exception as e:
                logger.warning("[ARCH-AGENT] Could not parse history for append: %s", e)
                prior = []
        req = ModelRequest(parts=[UserPromptPart(content=enhanced_message)])
        resp = ModelResponse(parts=[TextPart(content=assistant_text)])
        combined = prior + [req, resp]
        return to_jsonable_python(combined)

    def chat(
        self,
        message: str,
        opened_modules: Optional[list[str]] = None,
        message_history: Optional[List[Any]] = None,
        diagram_selection: Optional[Dict[str, Any]] = None,
    ) -> tuple[str, List[Any]]:
        """
        Process a chat message and return a response plus updated message history.

        Args:
            message: User's question/message
            opened_modules: List of opened module IDs (overview is always included)
            message_history: Optional list of prior messages (JSON-serializable form from
                a previous chat() return). When provided, the agent continues the conversation.
            diagram_selection: Optional dict with kind, logical_id, label, module_id from the interactive diagram.

        Returns:
            Tuple of (assistant_response_text, updated_history). The client should store
            updated_history and send it back as message_history on the next turn.
        """
        logger.info(f"[ARCH-AGENT] Processing chat message: {message[:100]}...")
        logger.info(f"[ARCH-AGENT] Opened modules: {opened_modules}")
        logger.info(f"[ARCH-AGENT] History length: {len(message_history) if message_history else 0}")
        logger.info(f"[ARCH-AGENT] diagram_selection: {diagram_selection!r}")

        # Format full module tree for prompt (used when no history, or for context in user message)
        module_tree_text = self._format_module_tree_for_prompt()
        system_prompt = ARCHITECTURAL_AGENT_SYSTEM_PROMPT_TEMPLATE.format(module_tree=module_tree_text)
        system_prompt = system_prompt + "\n\n" + self._format_diagram_selection_system_block(diagram_selection)

        logger.info(f"[ARCH-AGENT] System prompt length: {len(system_prompt)} chars")
        logger.debug(f"[ARCH-AGENT] System prompt preview: {system_prompt[:500]}...")

        # Create agent (no tools - conversational only)
        agent = Agent(
            self.model,
            system_prompt=system_prompt
        )

        # Restate diagram selection on every turn
        diagram_prefix = self._format_user_message_diagram_selection_prefix(diagram_selection)
        enhanced_message = diagram_prefix + message

        # Deterministic answers for diagram UI questions. LLMs often confuse highlight vs open doc.
        if self._is_viewer_ui_meta_question(message):
            ans = self._deterministic_viewer_ui_answer(diagram_selection)
            logger.info("[ARCH-AGENT] Viewer UI meta question — deterministic answer (no LLM)")
            updated = self._append_turn_to_history(
                message_history, enhanced_message, ans
            )
            return (ans, updated)

        # Parse history for pydantic-ai (list of dicts -> list[ModelMessage])
        history_messages = None
        if message_history:
            try:
                history_messages = ModelMessagesTypeAdapter.validate_python(message_history)
                logger.info(f"[ARCH-AGENT] Loaded {len(history_messages)} messages from history")
            except Exception as e:
                logger.warning(f"[ARCH-AGENT] Invalid message_history, starting fresh: {e}")
                history_messages = None

        try:
            # run_sync avoids asyncio event-loop issues on reused serverless workers (e.g. Vercel).
            result = agent.run_sync(
                enhanced_message,
                message_history=history_messages,
            )
            # Extract the actual text response from pydantic-ai result
            if hasattr(result, 'data'):
                response = str(result.data)
            else:
                response = getattr(result, 'output', str(result))
            logger.info(f"[ARCH-AGENT] Response generated: {len(response)} chars")

            # Serialize full conversation so client can send it back next time
            all_messages = result.all_messages()
            updated_history = to_jsonable_python(all_messages)
            logger.info(f"[ARCH-AGENT] Updated history: {len(updated_history)} messages")
            return (response, updated_history)
        except Exception as e:
            logger.error(f"[ARCH-AGENT] Agent execution failed: {e}")
            return (f"Error processing request: {str(e)}", message_history or [])
