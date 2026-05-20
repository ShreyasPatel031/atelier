"""
Vercel serverless: all /api/* routes land here (see vercel.json).
Implements POST /api/arch-agent/chat (same JSON as FastAPI version).

On Vercel, uses a lightweight Gemini REST path (stdlib only). Locally, uses
ArchitecturalAgentRunner when codewiki is available.
"""

from __future__ import annotations

import json
import os
import sys
import traceback
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from typing import Any, Dict, List, Optional

_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

_ALLOWED_ORIGINS = frozenset(
    {
        "https://atelier-inc.net",
        "https://app.atelier-inc.net",
        "https://www.atelier-inc.net",
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        "http://localhost:9891",
        "http://127.0.0.1:9891",
    }
)

_MAX_TREE_CHARS = 14_000


def _docs_path(job_id: str) -> Optional[Path]:
    p = _ROOT / "demo" / "repos" / job_id
    if p.is_dir() and (p / "module_tree.json").is_file():
        return p
    return None


def _json_response(handler: BaseHTTPRequestHandler, status: int, body: dict) -> None:
    raw = json.dumps(body).encode("utf-8")
    origin = handler.headers.get("Origin", "")
    allow = _cors_allow_origin(origin)
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(raw)))
    handler.send_header("Access-Control-Allow-Origin", allow)
    handler.send_header("Access-Control-Allow-Credentials", "true")
    handler.end_headers()
    handler.wfile.write(raw)


def _cors_allow_origin(origin: str) -> str:
    if origin in _ALLOWED_ORIGINS:
        return origin
    if origin.startswith("https://") and origin.endswith(".vercel.app"):
        return origin
    return "https://app.atelier-inc.net"


def _gemini_ready() -> bool:
    if (os.getenv("GEMINI_API_KEY") or "").strip():
        return True
    if os.getenv("VERCEL"):
        return False
    try:
        from codewiki.src.config import (
            CLUSTER_MODEL,
            Config,
            DEPENDENCY_GRAPHS_DIR,
            DOCS_DIR,
            LLM_API_KEY,
            LLM_BASE_URL,
            MAIN_MODEL,
            MAX_DEPTH,
            OUTPUT_BASE_DIR,
        )
        from codewiki.src.be.llm_services import _get_adc_credentials, _use_adc_mode

        cfg = Config(
            repo_path=".",
            output_dir=OUTPUT_BASE_DIR,
            dependency_graph_dir=os.path.join(OUTPUT_BASE_DIR, DEPENDENCY_GRAPHS_DIR),
            docs_dir=os.path.join(OUTPUT_BASE_DIR, DOCS_DIR, "demo-docs"),
            max_depth=MAX_DEPTH,
            llm_base_url=LLM_BASE_URL,
            llm_api_key=LLM_API_KEY,
            main_model=os.getenv("MAIN_MODEL", MAIN_MODEL),
            cluster_model=os.getenv("CLUSTER_MODEL", CLUSTER_MODEL),
            use_vertex_ai=os.getenv("GOOGLE_USE_ADC", "").strip().lower() in ("1", "true", "yes")
            or os.getenv("USE_VERTEX_AI", "").strip().lower() in ("1", "true", "yes"),
            gcp_project=os.getenv("GCP_PROJECT", "") or os.getenv("GOOGLE_CLOUD_PROJECT", ""),
        )
        if _use_adc_mode(cfg):
            _get_adc_credentials()
            return True
    except Exception:
        pass
    try:
        import subprocess

        proc = subprocess.run(
            ["gcloud", "auth", "application-default", "print-access-token"],
            capture_output=True,
            text=True,
            timeout=8,
        )
        return proc.returncode == 0 and bool((proc.stdout or "").strip())
    except Exception:
        return False


def _compact_module_tree(node: Any, lines: List[str], depth: int = 0) -> None:
    if depth > 8 or len("\n".join(lines)) > _MAX_TREE_CHARS:
        return
    if isinstance(node, dict):
        nid = node.get("id") or node.get("name") or ""
        label = node.get("label") or node.get("title") or nid
        desc = (node.get("description") or "")[:200]
        if nid or label:
            lines.append(f"{'  ' * depth}- {label} ({nid})" + (f": {desc}" if desc else ""))
        for key in ("children", "modules", "submodules"):
            ch = node.get(key)
            if isinstance(ch, list):
                for c in ch:
                    _compact_module_tree(c, lines, depth + 1)
            elif isinstance(ch, dict):
                for c in ch.values():
                    _compact_module_tree(c, lines, depth + 1)
    elif isinstance(node, list):
        for item in node:
            _compact_module_tree(item, lines, depth)


def _format_diagram_block(payload: dict) -> str:
    parts: List[str] = []
    dss = payload.get("diagram_selections")
    if isinstance(dss, list) and dss:
        for ds in dss:
            if isinstance(ds, dict):
                parts.append(
                    f"  - {ds.get('kind', 'node')}: {ds.get('label') or ds.get('logical_id')}"
                )
    else:
        ds = payload.get("diagram_selection")
        if isinstance(ds, dict):
            parts.append(
                f"  - {ds.get('kind', 'node')}: {ds.get('label') or ds.get('logical_id')}"
            )
    if not parts:
        return ""
    return "VIEWER DIAGRAM SELECTION:\n" + "\n".join(parts) + "\n\n"


def _run_chat_vercel(payload: dict, docs: Path) -> dict:
    api_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not api_key:
        return {
            "error": "Gemini not configured. Set GEMINI_API_KEY in Vercel project Environment Variables.",
            "status": 503,
        }

    model = os.getenv("MAIN_MODEL", "gemini-2.5-flash")
    message = (payload.get("message") or "").strip()

    try:
        tree_raw = json.loads((docs / "module_tree.json").read_text(encoding="utf-8"))
    except Exception as e:
        return {"error": f"module_tree.json: {e}", "status": 500}

    lines: List[str] = []
    root = tree_raw.get("module_tree") if isinstance(tree_raw, dict) else tree_raw
    _compact_module_tree(root if root is not None else tree_raw, lines)
    tree_text = "\n".join(lines)[:_MAX_TREE_CHARS]

    overview_md = docs / "overview.md"
    overview_snip = ""
    if overview_md.is_file():
        overview_snip = overview_md.read_text(encoding="utf-8", errors="replace")[:4000]

    system = (
        "You are an architectural navigation assistant for a software repository diagram.\n"
        "Keep answers under 3–4 sentences. Be direct. Reference module names when relevant.\n"
        "MODULE TREE (compact):\n"
        f"{tree_text}\n"
    )
    if overview_snip:
        system += f"\nOVERVIEW EXCERPT:\n{overview_snip}\n"

    user = _format_diagram_block(payload) + message

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 512},
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=55) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:800]
        return {"error": f"Gemini HTTP {e.code}: {err_body}", "status": 502}
    except Exception as e:
        return {"error": f"Gemini request failed: {e}", "status": 502}

    text = ""
    for cand in data.get("candidates") or []:
        content = cand.get("content") or {}
        for part in content.get("parts") or []:
            if part.get("text"):
                text += part["text"]
    text = text.strip() or "No response."
    return {"response": text, "history": None, "status": 200}


def _run_chat_codewiki(payload: dict, docs: Path) -> dict:
    from codewiki.src.be.architectural_agent import ArchitecturalAgentRunner

    try:
        runner = ArchitecturalAgentRunner(str(docs))
    except Exception as e:
        return {
            "error": f"Agent init: {e}",
            "trace": traceback.format_exc(),
            "status": 500,
        }

    opened = payload.get("opened_modules") or ["overview"]
    if "overview" not in opened:
        opened = ["overview"] + list(opened)

    ds = payload.get("diagram_selection")
    dss = payload.get("diagram_selections")
    dss_list = dss if isinstance(dss, list) else None

    try:
        text, history = runner.chat(
            message=(payload.get("message") or "").strip(),
            opened_modules=opened,
            message_history=payload.get("history"),
            diagram_selection=ds if isinstance(ds, dict) else None,
            diagram_selections=[x for x in (dss_list or []) if isinstance(x, dict)] or None,
        )
        return {"response": text, "history": history, "status": 200}
    except Exception as e:
        return {
            "error": f"Agent: {e}",
            "trace": traceback.format_exc(),
            "status": 500,
        }


def _run_chat(payload: dict) -> dict:
    if not _gemini_ready():
        return {
            "error": "Gemini not configured. Set GEMINI_API_KEY in Vercel project Environment Variables.",
            "status": 503,
        }

    job_id = payload.get("job_id") or ""
    message = (payload.get("message") or "").strip()
    if not job_id or not message:
        return {"error": "job_id and message are required", "status": 400}

    docs = _docs_path(job_id)
    if docs is None:
        return {
            "error": f"No docs for job_id={job_id}",
            "status": 404,
        }

    if os.getenv("VERCEL"):
        return _run_chat_vercel(payload, docs)
    return _run_chat_codewiki(payload, docs)


class handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

    def do_OPTIONS(self):
        origin = self.headers.get("Origin", "")
        allow = _cors_allow_origin(origin)
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", allow)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Credentials", "true")
        self.end_headers()

    def do_GET(self):
        p = self.path.split("?", 1)[0].rstrip("/")
        if p.endswith("/api/health") or p == "/api" or p.endswith("/health"):
            gem = _gemini_ready()
            persona = _docs_path("persona-selection-model")
            _json_response(
                self,
                200,
                {
                    "ok": True,
                    "gemini_configured": gem,
                    "demo_persona_bundle": persona is not None,
                    "repo_root": str(_ROOT),
                    "vercel_lightweight_chat": bool(os.getenv("VERCEL")),
                },
            )
            return
        _json_response(self, 404, {"error": "not found", "path": self.path})

    def do_POST(self):
        path = self.path.split("?", 1)[0].rstrip("/")
        if "arch-agent/chat" not in path and not path.endswith("chat"):
            _json_response(self, 404, {"error": "use POST /api/arch-agent/chat"})
            return

        try:
            ln = int(self.headers.get("Content-Length", "0") or 0)
        except ValueError:
            ln = 0
        raw = self.rfile.read(ln) if ln else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError as e:
            _json_response(self, 400, {"error": f"invalid json: {e}"})
            return

        result = _run_chat(payload)
        st = int(result.pop("status", 500))
        if st == 200:
            _json_response(
                self,
                200,
                {"response": result.get("response", ""), "history": result.get("history")},
            )
        else:
            err = result.get("error", "error")
            trace = result.get("trace")
            body = {"detail": err}
            if trace:
                body["trace"] = trace[-4000:] if len(trace) > 4000 else trace
            _json_response(self, st if st >= 400 else 500, body)
