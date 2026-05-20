#!/usr/bin/env python3
"""
Architectural Agent - Read-only agent for repository exploration and Q&A.

This agent has access to:
- Module tree + diagram JSON in the tree
- Opened-module Mermaid excerpts in the system prompt; full module markdown via the read_module_documentation tool
- Component metadata (IDs, paths, types, dependencies) where present in the tree

But does NOT have access to:
- Full source code reading (no read_code_components)
- Documentation editing (no str_replace_editor)
- Sub-module generation (no generate_sub_module_documentation)
"""

import asyncio
import logging
import json
import re
from pathlib import Path
from typing import Dict, Any, Optional, List

from pydantic_core import to_jsonable_python
from pydantic_ai import Agent, Tool
from pydantic_ai.messages import (
    ModelMessagesTypeAdapter,
    ModelRequest,
    ModelResponse,
    UserPromptPart,
    TextPart,
)

from codewiki.src.file_manager import file_manager

logger = logging.getLogger(__name__)


async def _run_architectural_agent_llm(
    agent: Agent,
    enhanced_message: str,
    history_messages: Optional[List[Any]],
):
    """Awaitable wrapper for pydantic-ai Agent.run (async)."""
    return await agent.run(
        enhanced_message,
        message_history=history_messages,
    )


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
- If **multiple** shapes are listed under viewer diagram selection, the user **multi-selected** those (⌘/Ctrl+Shift+click). Phrases like "the two groups", "between these", "common connections", or "edges between them" refer to **those selected logical ids**—use exact ids from VIEWER DIAGRAM SELECTION; do not invent different subgraph or node names.
- **Two clusters can sit under the same parent module doc** (same `module_id`) and still be **two distinct subgraphs** on the diagram. Treat them as **separate groups** with the **exact `logical_id` strings** from VIEWER DIAGRAM SELECTION.
- **Opened modules — Mermaid only:** The block **VIEWER OPENED MODULE MERMAID** below lists **all ```mermaid``` diagrams** from every opened module page (small prompt footprint). For **prose, lists, or full markdown**, call the tool **read_module_documentation** with the module id (e.g. `user_interface_and_integrations`).
- Diagram selection still adds only **logical id + label (+ kind)** for highlights.
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

        from codewiki.src.config import (
            CLUSTER_MODEL,
            Config,
            DEPENDENCY_GRAPHS_DIR,
            LLM_API_KEY,
            LLM_BASE_URL,
            MAIN_MODEL,
            MAX_DEPTH,
            OUTPUT_BASE_DIR,
        )
        from codewiki.src.be.llm_services import create_main_model

        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.main_model = main_model or os.getenv("MAIN_MODEL", MAIN_MODEL)

        self.module_tree = self._load_module_tree()
        self.metadata = self._load_metadata()

        llm_config = Config(
            repo_path=str(self.docs_path),
            output_dir=OUTPUT_BASE_DIR,
            dependency_graph_dir=os.path.join(OUTPUT_BASE_DIR, DEPENDENCY_GRAPHS_DIR),
            docs_dir=str(self.docs_path),
            max_depth=MAX_DEPTH,
            llm_base_url=llm_base_url or LLM_BASE_URL,
            llm_api_key=llm_api_key or LLM_API_KEY,
            main_model=self.main_model,
            cluster_model=os.getenv("CLUSTER_MODEL", CLUSTER_MODEL),
            use_vertex_ai=os.getenv("GOOGLE_USE_ADC", "").strip().lower() in ("1", "true", "yes")
            or os.getenv("USE_VERTEX_AI", "").strip().lower() in ("1", "true", "yes"),
            gcp_project=os.getenv("GCP_PROJECT", "") or os.getenv("GOOGLE_CLOUD_PROJECT", ""),
        )
        self.model = create_main_model(llm_config)
        
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

    @staticmethod
    def _normalize_diagram_selections_list(
        diagram_selection: Optional[Dict[str, Any]],
        diagram_selections: Optional[List[Dict[str, Any]]],
    ) -> List[Dict[str, Any]]:
        if diagram_selections and isinstance(diagram_selections, list):
            out = [x for x in diagram_selections if isinstance(x, dict)]
            if out:
                return out
        if diagram_selection and isinstance(diagram_selection, dict):
            return [diagram_selection]
        return []

    def _format_diagram_selections_system_block(self, selections: List[Dict[str, Any]]) -> str:
        """Multi-select on the canvas: zero, one, or many highlighted shapes."""
        if not selections:
            return (
                "VIEWER DIAGRAM SELECTION: None.\n"
                "No interactive diagram shape is reported as selected (or selection was cleared)."
            )
        if len(selections) == 1:
            return self._format_diagram_selection_system_block(selections[0])
        lines = [
            "VIEWER DIAGRAM SELECTION — MULTIPLE SHAPES (⌘/Ctrl/Shift+click in the viewer). "
            "These are the only diagram anchors for this question:",
        ]
        for i, ds in enumerate(selections, start=1):
            kind = str(ds.get("kind") or "none").lower().strip()
            lid = str(ds.get("logical_id") or "").strip()
            label = str(ds.get("label") or lid).strip()
            mod = str(ds.get("module_id") or "").strip()
            if kind == "none" or not lid:
                continue
            chunk = f'{i}. kind={kind}, logical id={lid}, label="{label}"'
            if mod:
                chunk += f", module context={mod}"
            lines.append(chunk)
        lines.append(
            "If the user asks what is selected on the diagram, list these items (or summarize the set)."
        )
        if len(selections) >= 2:
            lids = [
                str(ds.get("logical_id") or "").strip()
                for ds in selections
                if str(ds.get("kind") or "none").lower().strip() != "none"
                and str(ds.get("logical_id") or "").strip()
            ]
            lines.append(
                "Multi-select interpretation: If the user asks about **edges between** selected groups "
                "or similar, use the selected logical ids as anchors; ground answers in **VIEWER OPENED MODULE MERMAID** "
                "and call **read_module_documentation** if you need full markdown for a module."
            )
            if lids:
                lines.append(f"Selected logical ids (anchors): {', '.join(lids)}.")
        return "\n".join(lines)

    _MERMAID_FENCE_RE = re.compile(r"```mermaid\s*\r?\n[\s\S]*?```", re.IGNORECASE)
    # Total budget for all concatenated mermaid from opened tabs (whole fences only).
    _MAX_OPENED_MERMAID_CHARS = 120000
    _TOOL_READ_MODULE_MAX_CHARS = 80000

    def _safe_opened_module_stem(self, module_id: str) -> Optional[str]:
        """Reject path components; allow typical doc ids like overview, user_interface_and_integrations."""
        s = str(module_id).strip()
        if not s or ".." in s or "/" in s or "\\" in s:
            return None
        if not re.fullmatch(r"[A-Za-z0-9_-]+", s):
            return None
        return s

    def _read_module_markdown_raw(self, module_id: str) -> Optional[str]:
        stem = self._safe_opened_module_stem(module_id)
        if not stem:
            return None
        path = self.docs_path / f"{stem}.md"
        if not path.is_file():
            return None
        try:
            return path.read_text(encoding="utf-8", errors="replace")
        except OSError as e:
            logger.warning("[ARCH-AGENT] Could not read %s: %s", path, e)
            return None

    def _extract_mermaid_fences(self, markdown: str) -> List[str]:
        return self._MERMAID_FENCE_RE.findall(markdown or "")

    def read_module_documentation(self, module_id: str) -> str:
        """
        Tool: full markdown for one module (sync; called by pydantic-ai).
        Id must match a file `{id}.md` under the docs bundle.
        """
        mid = (module_id or "").strip()
        logger.info("[ARCH-AGENT] tool read_module_documentation(%r)", mid)
        text = self._read_module_markdown_raw(mid)
        if text is None:
            stem = self._safe_opened_module_stem(mid)
            if not stem:
                return (
                    "Invalid module_id. Use a single module key from the module tree "
                    "(letters, digits, underscores), e.g. `overview` or `user_interface_and_integrations`."
                )
            return f"No file `{stem}.md` in this documentation bundle."
        cap = self._TOOL_READ_MODULE_MAX_CHARS
        if len(text) > cap:
            return text[:cap] + "\n\n... [truncated for tool output size] ..."
        return text

    def _format_opened_modules_system_block(
        self, opened_modules: Optional[list[str]]
    ) -> str:
        """Only ```mermaid``` fences from each opened module .md (concatenated, budget-capped)."""
        if not opened_modules:
            return (
                "VIEWER OPENED MODULE MERMAID: none — no module pages opened in the viewer.\n"
            )
        uniq: List[str] = []
        seen: set = set()
        for x in opened_modules:
            s = str(x).strip()
            if s and s not in seen:
                seen.add(s)
                uniq.append(s)
        if not uniq:
            return (
                "VIEWER OPENED MODULE MERMAID: none — no module pages opened in the viewer.\n"
            )
        header = (
            "VIEWER OPENED MODULE MERMAID — ```mermaid``` blocks from opened docs (tab order; whole fences only). "
            "If truncated, use tool **read_module_documentation** for full markdown.\n"
            f"Opened module ids: {', '.join(uniq)}\n"
        )

        # Flatten (module_id, fence) preserving file order, then pack into char budget.
        queued: List[tuple[str, str]] = []
        notes: List[str] = []
        for mid in uniq:
            raw = self._read_module_markdown_raw(mid)
            if not raw:
                notes.append(f"- `{mid}.md`: (file missing)")
                continue
            fences = self._extract_mermaid_fences(raw)
            if not fences:
                notes.append(f"- `{mid}.md`: (no mermaid blocks)")
                continue
            for fence in fences:
                queued.append((mid, fence))

        budget = self._MAX_OPENED_MERMAID_CHARS
        used = 0
        omitted = 0
        body_parts: List[str] = []
        cur_mid: Optional[str] = None
        for mid, fence in queued:
            sep = 2 if body_parts else 0
            if used + sep + len(fence) > budget:
                omitted += 1
                continue
            if mid != cur_mid:
                body_parts.append(f"\n### `{mid}.md`\n")
                cur_mid = mid
            body_parts.append(fence)
            used += sep + len(fence)

        if notes:
            header += "Notes:\n" + "\n".join(notes) + "\n"

        if not body_parts and not queued:
            return (
                header
                + "No mermaid content to show. Use read_module_documentation(module_id) for full text.\n"
            )

        out = header + "\n".join(body_parts)
        if omitted:
            out += (
                f"\n\n... [{omitted} mermaid block(s) omitted — prompt size budget; "
                "use read_module_documentation for the relevant module.] ...\n"
            )
        return out + "\n"

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

    def _format_user_message_diagram_selections_prefix(self, selections: List[Dict[str, Any]]) -> str:
        """Prefix for zero, one, or many diagram highlights."""
        if not selections:
            return "[Viewer diagram selection: none]\n"
        if len(selections) == 1:
            return self._format_user_message_diagram_selection_prefix(selections[0])
        parts = []
        for ds in selections:
            kind = str(ds.get("kind") or "none").lower().strip()
            lid = str(ds.get("logical_id") or "").strip()
            if kind == "none" or not lid:
                continue
            label = str(ds.get("label") or lid).strip()
            parts.append(f'{kind} "{label}" ({lid})')
        if not parts:
            return "[Viewer diagram selection: none]\n"
        return "[Viewer diagram selection (multiple): " + "; ".join(parts) + "]\n"

    def _is_viewer_ui_meta_question(self, message: str) -> bool:
        """Questions about diagram highlight vs open doc — answer deterministically when clearly UI-meta."""
        t = message.strip().lower()
        if not t or len(t) > 280:
            return False
        if re.search(r"viewer\s+diagram\s+selection", t):
            return True
        # Word boundaries: avoid matching "graph" inside "subgraphs" or "select" inside "selected".
        dg = r"\b(?:diagram|graph|mermaid)\b"
        shc = r"\b(?:select|highlight|click)\b"
        if re.search(rf"(what|which).{{0,40}}{shc}.{{0,40}}{dg}", t):
            return True
        if re.search(rf"{dg}.{{0,40}}{shc}", t):
            return True
        if re.search(r"what\s+is\s+highlighted", t) and re.search(rf"{dg}", t):
            return True
        return False

    def _deterministic_viewer_ui_answer(
        self,
        diagram_selection: Optional[Dict[str, Any]] = None,
        diagram_selections: Optional[List[Dict[str, Any]]] = None,
    ) -> str:
        """Exact answer for interactive diagram UI state. Not codebase architecture."""
        selections = self._normalize_diagram_selections_list(diagram_selection, diagram_selections)
        lines = []
        if not selections:
            lines.append(
                "**Interactive diagram selection:** none — no node/cluster/edge is highlighted on the diagram."
            )
        elif len(selections) == 1:
            ds = selections[0]
            open_doc = str(ds.get("module_id") or "").strip() or None
            dkind = str(ds.get("kind") or "none").lower().strip()
            dlid = str(ds.get("logical_id") or "").strip()
            dlabel = str(ds.get("label") or dlid).strip()
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
        else:
            lines.append(
                f"**Interactive diagram selection:** {len(selections)} shapes highlighted (⌘/Ctrl/Shift+click multi-select):"
            )
            for i, ds in enumerate(selections, start=1):
                dkind = str(ds.get("kind") or "none").lower().strip()
                dlid = str(ds.get("logical_id") or "").strip()
                dlabel = str(ds.get("label") or dlid).strip()
                mod = str(ds.get("module_id") or "").strip()
                if dkind == "none" or not dlid:
                    continue
                extra = f", module `{mod}`" if mod else ""
                lines.append(f"{i}. **{dlabel}** — `{dlid}` ({dkind}){extra}.")
        lines.append(
            "*Diagram selection reports the highlighted shape(s) and module when applicable.*"
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

    async def chat_async(
        self,
        message: str,
        opened_modules: Optional[list[str]] = None,
        message_history: Optional[List[Any]] = None,
        diagram_selection: Optional[Dict[str, Any]] = None,
        diagram_selections: Optional[List[Dict[str, Any]]] = None,
    ) -> tuple[str, List[Any]]:
        """
        Async chat: run the LLM on the **current event loop**. Use this from FastAPI/async code.
        Do not wrap in asyncio.to_thread — nested loops break Google GenAI / pydantic-ai.
        """
        selections = self._normalize_diagram_selections_list(diagram_selection, diagram_selections)

        logger.info(f"[ARCH-AGENT] Processing chat message: {message[:100]}...")
        logger.info(f"[ARCH-AGENT] Opened modules: {opened_modules}")
        logger.info(f"[ARCH-AGENT] History length: {len(message_history) if message_history else 0}")
        logger.info(f"[ARCH-AGENT] diagram_selection: {diagram_selection!r}")
        logger.info(f"[ARCH-AGENT] diagram_selections count: {len(selections)}")

        module_tree_text = self._format_module_tree_for_prompt()
        system_prompt = ARCHITECTURAL_AGENT_SYSTEM_PROMPT_TEMPLATE.format(module_tree=module_tree_text)
        system_prompt = system_prompt + "\n\n" + self._format_diagram_selections_system_block(selections)
        system_prompt = system_prompt + "\n" + self._format_opened_modules_system_block(opened_modules)

        logger.info(f"[ARCH-AGENT] System prompt length: {len(system_prompt)} chars")
        logger.debug(f"[ARCH-AGENT] System prompt preview: {system_prompt[:500]}...")

        agent = Agent(
            self.model,
            retries=3,
            system_prompt=system_prompt,
            tools=[
                Tool(
                    function=self.read_module_documentation,
                    name="read_module_documentation",
                    description=(
                        "Load full markdown for one module from this docs bundle (`{module_id}.md`). "
                        "Use when you need prose, bullet lists, or sections not present in the opened Mermaid excerpts "
                        "or the module tree (e.g. details about a submodule the user asked about)."
                    ),
                )
            ],
        )

        diagram_prefix = self._format_user_message_diagram_selections_prefix(selections)
        enhanced_message = diagram_prefix + message

        if self._is_viewer_ui_meta_question(message):
            ans = self._deterministic_viewer_ui_answer(diagram_selection, diagram_selections)
            logger.info("[ARCH-AGENT] Viewer UI meta question — deterministic answer (no LLM)")
            updated = self._append_turn_to_history(
                message_history, enhanced_message, ans
            )
            return (ans, updated)

        history_messages = None
        if message_history:
            try:
                history_messages = ModelMessagesTypeAdapter.validate_python(message_history)
                logger.info(f"[ARCH-AGENT] Loaded {len(history_messages)} messages from history")
            except Exception as e:
                logger.warning(f"[ARCH-AGENT] Invalid message_history, starting fresh: {e}")
                history_messages = None

        try:
            result = await _run_architectural_agent_llm(agent, enhanced_message, history_messages)
            if hasattr(result, 'data'):
                response = str(result.data)
            else:
                response = getattr(result, 'output', str(result))
            logger.info(f"[ARCH-AGENT] Response generated: {len(response)} chars")

            all_messages = result.all_messages()
            updated_history = to_jsonable_python(all_messages)
            logger.info(f"[ARCH-AGENT] Updated history: {len(updated_history)} messages")
            return (response, updated_history)
        except Exception as e:
            logger.error(f"[ARCH-AGENT] Agent execution failed: {e}")
            return (f"Error processing request: {str(e)}", message_history or [])

    def chat(
        self,
        message: str,
        opened_modules: Optional[list[str]] = None,
        message_history: Optional[List[Any]] = None,
        diagram_selection: Optional[Dict[str, Any]] = None,
        diagram_selections: Optional[List[Dict[str, Any]]] = None,
    ) -> tuple[str, List[Any]]:
        """
        Synchronous chat for non-async callers. Uses asyncio.run (own event loop).
        From async servers (FastAPI), prefer await chat_async() instead of asyncio.to_thread(chat).
        """
        return asyncio.run(
            self.chat_async(
                message=message,
                opened_modules=opened_modules,
                message_history=message_history,
                diagram_selection=diagram_selection,
                diagram_selections=diagram_selections,
            )
        )
