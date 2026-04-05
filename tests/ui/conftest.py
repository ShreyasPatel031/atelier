"""
Session-scoped CodeWiki server for Playwright UI tests (real HTTP, real worker).
"""

from __future__ import annotations

import os

# So `make test` picks up GEMINI_API_KEY / OPENAI_API_KEY from repo .env without manual `source`.
try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None  # type: ignore[misc, assignment]
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

import pytest

# tests/ui/conftest.py -> repo root is three levels up
REPO_ROOT = Path(__file__).resolve().parent.parent.parent

if load_dotenv is not None:
    load_dotenv(REPO_ROOT / ".env")


def _has_llm_keys() -> bool:
    return bool(
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("OPENAI_API_KEY")
        or os.environ.get("LLM_API_KEY")
    )


def _free_port() -> int:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def _probe_base(url: str, timeout_s: float = 2.0) -> None:
    urllib.request.urlopen(url.rstrip("/") + "/", timeout=timeout_s)


@pytest.fixture(scope="session")
def live_server_url() -> str:
    if not _has_llm_keys():
        pytest.skip(
            "Set GEMINI_API_KEY, OPENAI_API_KEY, or LLM_API_KEY for live UI E2E (real clone + LLM)."
        )

    # Same UI as `python codewiki/run_web_app.py` — point Playwright at *your* tab's server:
    #   E2E_BASE_URL=http://127.0.0.1:8000 pytest tests/ui/
    # (No second process; uses the server you already started.)
    existing = (os.environ.get("E2E_BASE_URL") or "").strip().rstrip("/")
    if existing:
        try:
            _probe_base(existing)
        except (urllib.error.URLError, OSError) as e:
            pytest.fail(
                f"E2E_BASE_URL={existing!r} is not reachable ({e!r}). "
                "Start the app first: python codewiki/run_web_app.py"
            )
        yield existing
        return

    port = int(os.environ.get("E2E_UI_PORT", "0"))
    if port == 0:
        port = _free_port()

    env = os.environ.copy()
    env["PYTHONPATH"] = str(REPO_ROOT) + os.pathsep + env.get("PYTHONPATH", "")

    proc = subprocess.Popen(
        [
            sys.executable,
            str(REPO_ROOT / "codewiki/run_web_app.py"),
            "--host",
            "127.0.0.1",
            "--port",
            str(port),
        ],
        cwd=str(REPO_ROOT),
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
    )

    base = f"http://127.0.0.1:{port}"
    deadline = time.time() + 90
    last_err: Exception | None = None
    while time.time() < deadline:
        if proc.poll() is not None:
            err = proc.stderr.read().decode(errors="replace") if proc.stderr else ""
            raise RuntimeError(f"CodeWiki server exited before ready (code {proc.returncode}):\n{err}")
        try:
            _probe_base(base)
            break
        except (urllib.error.URLError, OSError) as e:
            last_err = e
            time.sleep(0.4)
    else:
        proc.terminate()
        err = proc.stderr.read().decode(errors="replace") if proc.stderr else ""
        raise RuntimeError(f"Server did not become ready: {last_err!r}\nstderr:\n{err}") from last_err

    yield base

    proc.terminate()
    try:
        proc.wait(timeout=20)
    except subprocess.TimeoutExpired:
        proc.kill()
