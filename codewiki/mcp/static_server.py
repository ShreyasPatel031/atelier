"""
Lazy-spawn singleton static HTTP server rooted at ``demo/``.

Used by the MCP ``open_viewer`` tool so the user gets a clickable URL the
moment they ask for a render. The server runs in a background thread inside
the MCP process; we use ``ThreadingHTTPServer`` so multi-asset page loads
don't block on each other.
"""

from __future__ import annotations

import atexit
import json
import re
import socket
import threading
import urllib.parse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional

import logging
import os
import subprocess
import time
import traceback

_log = logging.getLogger(__name__)

_REPO_ID_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$")
_VIEWER_STATE_MAX_BYTES = 524_288
_CHAT_MAX_BYTES = 1_048_576

_PORT_TRY_COUNT = 48  # preferred port + this many fallbacks

_llm_health_cache: dict = {"ts": 0.0, "payload": None}
_LLM_HEALTH_TTL_SEC = 120.0


class _ReusableThreadingHTTPServer(ThreadingHTTPServer):
    """Avoid bind failures right after a crashed MCP (TIME_WAIT)."""

    allow_reuse_address = True


class _StaticServer:
    def __init__(self, root: Path, port: int) -> None:
        self.root = root.resolve()
        self.port = port
        self._httpd: Optional[ThreadingHTTPServer] = None
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

    @property
    def is_running(self) -> bool:
        return self._httpd is not None and self._thread is not None and self._thread.is_alive()

    def url_for(self, repo_id: str) -> str:
        return f"http://localhost:{self.port}/?repo={repo_id}"

    def ensure_running(self) -> None:
        with self._lock:
            if self.is_running:
                return

            handler = partial(_CodewikiDemoHandler, directory=str(self.root))
            preferred = self.port
            httpd: Optional[_ReusableThreadingHTTPServer] = None
            bound_port: Optional[int] = None
            last_err: Optional[OSError] = None
            for port in range(preferred, preferred + _PORT_TRY_COUNT):
                try:
                    httpd = _ReusableThreadingHTTPServer(("127.0.0.1", port), handler)
                    bound_port = port
                    break
                except OSError as exc:
                    last_err = exc
                    continue
            if httpd is None or bound_port is None:
                raise RuntimeError(
                    f"Could not bind static viewer on 127.0.0.1:{preferred}-"
                    f"{preferred + _PORT_TRY_COUNT - 1}: {last_err}. "
                    f"Free a port in that range or set CODEWIKI_MCP_PORT."
                ) from last_err

            self.port = bound_port

            thread = threading.Thread(
                target=httpd.serve_forever,
                name=f"codewiki-mcp-static:{self.port}",
                daemon=True,
            )
            thread.start()
            self._httpd = httpd
            self._thread = thread
            atexit.register(self.shutdown)

    def shutdown(self) -> None:
        with self._lock:
            httpd = self._httpd
            thread = self._thread
            self._httpd = None
            self._thread = None
        if httpd is not None:
            try:
                httpd.shutdown()
                httpd.server_close()
            except Exception:
                pass
        if thread is not None and thread.is_alive():
            thread.join(timeout=2.0)


class _QuietHandler(SimpleHTTPRequestHandler):
    """SimpleHTTPRequestHandler that doesn't spam stdout (which is the MCP transport)."""

    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".mjs": "application/javascript",
    }

    def log_message(self, format: str, *args) -> None:  # noqa: A002 - matches stdlib signature
        return  # silence access logs to keep stdio clean

    def end_headers(self) -> None:
        # Avoid stale repo JSON/MD when MCP writes while the viewer stays open.
        path_only = (self.path.split("?", 1)[0] if self.path else "").rstrip("/") or "/"
        if (
            path_only == "/index.html"
            or path_only.endswith(".html")
            or path_only.startswith("/repos/")
        ):
            self.send_header("Cache-Control", "no-store, max-age=0, must-revalidate")
        super().end_headers()


class _CodewikiDemoHandler(_QuietHandler):
    """Serves ``demo/``, viewer state, and architectural-agent chat API."""

    # ---- helpers ----

    def _cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json_response(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self._cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self, max_bytes: int) -> Optional[dict]:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._json_response(400, {"ok": False, "error": "Bad Content-Length"})
            return None
        if length < 0 or length > max_bytes:
            self._json_response(413, {"ok": False, "error": "Body too large"})
            return None
        raw = self.rfile.read(length) if length else b""
        try:
            data = json.loads(raw.decode("utf-8") if raw else "{}")
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._json_response(400, {"ok": False, "error": "Invalid JSON"})
            return None
        if not isinstance(data, dict):
            self._json_response(400, {"ok": False, "error": "JSON must be an object"})
            return None
        return data

    def _resolve_docs_path(self, repo_id: str) -> Optional[Path]:
        """Find docs dir for a repo: demo/repos/<id> or ~/.cache/atelier-mcp/repos/<id>."""
        demo_root = Path(self.directory).resolve()
        for base in [demo_root / "repos", Path.home() / ".cache" / "atelier-mcp" / "repos"]:
            candidate = (base / repo_id).resolve()
            try:
                candidate.relative_to(base)
            except ValueError:
                continue
            if candidate.is_dir() and (candidate / "module_tree.json").exists():
                return candidate
        return None

    # ---- routing ----

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        raw_path = urllib.parse.urlparse(self.path).path or "/"
        if raw_path == "/api/llm-health":
            self._handle_llm_health()
        else:
            super().do_GET()

    def do_POST(self) -> None:  # noqa: N802
        raw_path = urllib.parse.urlparse(self.path).path or "/"

        if raw_path == "/api/arch-agent/chat":
            self._handle_arch_agent_chat()
            return

        parts = raw_path.strip("/").split("/")
        if len(parts) == 3 and parts[0] == "repos" and parts[2] == "viewer_state.json":
            self._handle_viewer_state_post(parts[1])
            return

        self._json_response(404, {"ok": False, "error": "Not found"})

    # ---- /api/llm-health ----

    def _handle_llm_health(self) -> None:
        now = time.time()
        if (
            _llm_health_cache["payload"] is not None
            and now - _llm_health_cache["ts"] < _LLM_HEALTH_TTL_SEC
        ):
            self._json_response(200, _llm_health_cache["payload"])
            return

        from codewiki.src.fe.background_worker import resolve_codewiki_cli

        cmd = resolve_codewiki_cli() + ["config", "validate", "--quick"]
        try:
            p = subprocess.run(cmd, capture_output=True, text=True, env=os.environ.copy(), timeout=30)
        except (subprocess.TimeoutExpired, OSError) as e:
            payload = {"ok": False, "detail": str(e)[:400]}
            self._json_response(503, payload)
            return

        ok = p.returncode == 0
        detail = (p.stdout or p.stderr or "").strip()[:400]
        payload = {"ok": ok, "detail": detail} if not ok else {"ok": True}
        _llm_health_cache["ts"] = now
        _llm_health_cache["payload"] = payload
        self._json_response(200, payload)

    # ---- /api/arch-agent/chat ----

    def _handle_arch_agent_chat(self) -> None:
        data = self._read_json_body(_CHAT_MAX_BYTES)
        if data is None:
            return

        repo_id = data.get("job_id", "")
        message = data.get("message", "").strip()
        if not repo_id or not message:
            self._json_response(400, {"ok": False, "error": "job_id and message required"})
            return

        docs_path = self._resolve_docs_path(repo_id)
        if docs_path is None:
            self._json_response(404, {"ok": False, "error": f"Docs not found for {repo_id}"})
            return

        try:
            from codewiki.src.be.architectural_agent import ArchitecturalAgentRunner

            runner = ArchitecturalAgentRunner(str(docs_path))
            opened = data.get("opened_modules") or ["overview"]
            if "overview" not in opened:
                opened = ["overview"] + opened

            response_text, updated_history = runner.chat(
                message=message,
                opened_modules=opened,
                message_history=data.get("history"),
                diagram_selection=data.get("diagram_selection"),
                diagram_selections=data.get("diagram_selections"),
            )
            self._json_response(200, {"response": response_text, "history": updated_history})
        except Exception as e:
            _log.error("[CHAT] arch-agent error: %s", traceback.format_exc())
            self._json_response(500, {"ok": False, "error": str(e)[:400]})

    # ---- /repos/<id>/viewer_state.json ----

    def _handle_viewer_state_post(self, repo_id: str) -> None:
        if not _REPO_ID_RE.match(repo_id):
            self._json_response(400, {"ok": False, "error": "Invalid repo id"})
            return

        demo_root = Path(self.directory).resolve()
        repo_dir = (demo_root / "repos" / repo_id).resolve()
        try:
            repo_dir.relative_to(demo_root / "repos")
        except ValueError:
            self._json_response(400, {"ok": False, "error": "Bad path"})
            return
        if not repo_dir.is_dir():
            self._json_response(404, {"ok": False, "error": "Unknown repo"})
            return

        data = self._read_json_body(_VIEWER_STATE_MAX_BYTES)
        if data is None:
            return

        out_path = repo_dir / "viewer_state.json"
        tmp_path = out_path.with_suffix(".json.tmp")
        try:
            tmp_path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
            tmp_path.replace(out_path)
        except OSError:
            try:
                if tmp_path.exists():
                    tmp_path.unlink()
            except OSError:
                pass
            self._json_response(500, {"ok": False, "error": "Write failed"})
            return

        self._json_response(200, {"ok": True})


def _is_port_free(port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind(("127.0.0.1", port))
        except OSError:
            return False
    return True


def make_static_server(demo_root: Path, port: int) -> _StaticServer:
    """Factory that returns a non-running server bound to ``demo_root``."""
    return _StaticServer(root=demo_root, port=port)


__all__ = ["make_static_server"]
