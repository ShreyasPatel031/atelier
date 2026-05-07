"""
Lazy-spawn singleton static HTTP server rooted at ``demo/``.

Used by the MCP ``open_viewer`` tool so the user gets a clickable URL the
moment they ask for a render. The server runs in a background thread inside
the MCP process; we use ``ThreadingHTTPServer`` so multi-asset page loads
don't block on each other.
"""

from __future__ import annotations

import atexit
import socket
import threading
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Optional

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

            handler = partial(_QuietHandler, directory=str(self.root))
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
