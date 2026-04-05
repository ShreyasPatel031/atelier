"""
Parametrized UI E2E for large public GitHub repos (same flow as the browser).

**Not run by default** — set ``E2E_BIG_REPOS=1`` so normal ``make test`` stays fast.

Large clones often exceed the default 5-minute git timeout in the web worker. Before a
full matrix run, set a higher clone budget (seconds), e.g.::

  export E2E_BIG_REPOS=1
  export CODEWIKI_CLONE_TIMEOUT=7200
  export E2E_UI_TIMEOUT_MS=14400000
  export E2E_WAIT_IDLE_S=7200
  export E2E_BASE_URL=http://127.0.0.1:8000
  pytest tests/ui/test_big_repos.py -v -s

If documentation is already cached for a repo, the UI completes quickly (cache hit) —
that still exercises the submit → pipeline → viewer path.

Requires: ``GEMINI_API_KEY`` / ``OPENAI_API_KEY`` / ``LLM_API_KEY`` (see ``conftest.py``).
"""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request

import pytest

pytest.importorskip("playwright.sync_api")

from playwright.sync_api import expect, sync_playwright


def _wait_for_worker_idle(base_url: str, timeout_s: float) -> None:
    """Avoid stacking a new submission behind a timed-out Playwright run still processing."""
    base = base_url.rstrip("/")
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(base + "/api/jobs", timeout=30) as resp:
                data = json.loads(resp.read().decode())
        except urllib.error.HTTPError as e:
            if e.code == 404:
                pytest.fail(
                    "GET /api/jobs not found — restart the web app so the idle-wait hook is available."
                )
            raise
        active = [
            j
            for j in data.get("jobs", [])
            if j.get("status") in ("queued", "processing")
        ]
        if not active:
            return
        time.sleep(5)
    raise AssertionError(
        f"Worker still had queued/processing jobs after {timeout_s:.0f}s "
        f"(increase E2E_WAIT_IDLE_S or let the previous job finish)."
    )

# Mirrors the user’s list (rough sizes are informational only).
BIG_REPOS = [
    "https://github.com/crewaiinc/crewai",
    "https://github.com/stanfordnlp/dspy",
    "https://github.com/ollama/ollama",
    "https://github.com/huggingface/transformers",
    "https://github.com/langchain-ai/langchain",
    "https://github.com/pydantic/pydantic-ai",
]


def _big_repos_enabled() -> bool:
    return os.environ.get("E2E_BIG_REPOS", "").strip() in ("1", "true", "yes")


@pytest.mark.parametrize(
    "big_repo_url",
    BIG_REPOS,
    ids=[u.rstrip("/").split("/")[-1] for u in BIG_REPOS],
)
def test_big_repo_pipeline_completes_in_ui(live_server_url: str, big_repo_url: str) -> None:
    if not _big_repos_enabled():
        pytest.skip("Set E2E_BIG_REPOS=1 to run the large-repo UI matrix (long-running).")

    # Default 4h per repo for clone + LLM; override with E2E_UI_TIMEOUT_MS (do not set this low for uncached runs).
    timeout_ms = int(os.environ.get("E2E_UI_TIMEOUT_MS", str(4 * 60 * 60 * 1000)))
    idle_wait_s = float(os.environ.get("E2E_WAIT_IDLE_S", str(2 * 60 * 60)))
    _wait_for_worker_idle(live_server_url, timeout_s=idle_wait_s)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=os.environ.get("E2E_UI_HEADED", "") != "1")
        page = browser.new_page()
        try:
            page.goto(live_server_url + "/", wait_until="domcontentloaded", timeout=120_000)
            page.fill("#repo_url", big_repo_url)
            page.click('button[type="submit"]')

            expect(page.locator("#pipeline-viewer-root")).to_be_visible(timeout=180_000)
            expect(page.locator("#step-3-status")).to_have_text("Complete", timeout=timeout_ms)
            expect(page.locator("#viewer-iframe")).to_be_visible(timeout=120_000)
            expect(page.locator("#viewer-error")).not_to_be_visible()
        finally:
            browser.close()
