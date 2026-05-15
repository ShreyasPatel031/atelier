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

_REPO_ID_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$")
_VIEWER_STATE_MAX_BYTES = 524_288

_PORT_TRY_COUNT = 48  # preferred port + this many fallbacks


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
    """Serves ``demo/`` and accepts POST ``/repos/<repo_id>/viewer_state.json`` from the viewer."""

    @staticmethod
    def _viewer_state_target(raw_path: str) -> bool:
        parts = raw_path.strip("/").split("/")
        return (
            len(parts) == 3
            and parts[0] == "repos"
            and parts[2] == "viewer_state.json"
        )

    def _viewer_state_cors(self) -> None:
        """Allow the viewer on another localhost port (e.g. :18765) to POST state here."""
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _viewer_state_json_fail(self, code: int, msg: str) -> None:
        body = json.dumps({"ok": False, "error": msg}).encode("utf-8")
        self.send_response(code)
        self._viewer_state_cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802 — stdlib API
        raw_path = urllib.parse.urlparse(self.path).path or "/"
        if not self._viewer_state_target(raw_path):
            self.send_error(501, "Unsupported method ('OPTIONS')")
            return
        self.send_response(204)
        self._viewer_state_cors()
        self.end_headers()

    def do_POST(self) -> None:  # noqa: N802 — stdlib API
        raw_path = urllib.parse.urlparse(self.path).path or "/"
        parts = raw_path.strip("/").split("/")
        if (
            len(parts) != 3
            or parts[0] != "repos"
            or parts[2] != "viewer_state.json"
        ):
            self.send_error(404, "Not found")
            return
        repo_id = parts[1]
        if not _REPO_ID_RE.match(repo_id):
            self._viewer_state_json_fail(400, "Invalid repo id")
            return

        demo_root = Path(self.directory).resolve()
        repo_dir = (demo_root / "repos" / repo_id).resolve()
        try:
            repo_dir.relative_to(demo_root / "repos")
        except ValueError:
            self._viewer_state_json_fail(400, "Bad path")
            return
        if not repo_dir.is_dir():
            self._viewer_state_json_fail(404, "Unknown repo")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self._viewer_state_json_fail(400, "Bad Content-Length")
            return
        if length < 0:
            self._viewer_state_json_fail(400, "Bad Content-Length")
            return
        if length > _VIEWER_STATE_MAX_BYTES:
            self._viewer_state_json_fail(413, "Body too large")
            return
        body = self.rfile.read(length) if length else b""
        try:
            data = json.loads(body.decode("utf-8") if body else "{}")
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._viewer_state_json_fail(400, "Invalid JSON")
            return
        if not isinstance(data, dict):
            self._viewer_state_json_fail(400, "JSON must be an object")
            return

        out_path = repo_dir / "viewer_state.json"
        tmp_path = out_path.with_suffix(".json.tmp")
        serialized = json.dumps(data, indent=2) + "\n"
        try:
            tmp_path.write_text(serialized, encoding="utf-8")
            tmp_path.replace(out_path)
        except OSError:
            try:
                if tmp_path.exists():
                    tmp_path.unlink()
            except OSError:
                pass
            self._viewer_state_json_fail(500, "Write failed")
            return

        payload = json.dumps({"ok": True}).encode("utf-8")
        self.send_response(200)
        self._viewer_state_cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


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
