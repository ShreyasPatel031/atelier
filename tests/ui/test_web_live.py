"""
Live browser UI test: real Chromium, same HTML/JS as when you run ``python codewiki/run_web_app.py``.

By default pytest **starts a second server** on a random port (isolated for CI). To drive
**the exact server you already started** (e.g. http://127.0.0.1:8000):

  export E2E_BASE_URL=http://127.0.0.1:8000
  pytest tests/ui/

This is NOT mocked: real form POST, real clone, real pipeline (LLM). Needs network + keys
(``.env`` is loaded automatically in ``conftest.py``).

  export E2E_REPO_URL=https://github.com/pypa/sampleproject
  export E2E_UI_TIMEOUT_MS=900000   # 15 minutes default
"""

from __future__ import annotations

import os

import pytest

pytest.importorskip("playwright.sync_api")

from playwright.sync_api import expect, sync_playwright


def test_live_browser_form_submits_and_pipeline_completes(live_server_url: str) -> None:
    repo = os.environ.get("E2E_REPO_URL", "https://github.com/pypa/sampleproject").strip()
    timeout_ms = int(os.environ.get("E2E_UI_TIMEOUT_MS", str(15 * 60 * 1000)))

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=os.environ.get("E2E_UI_HEADED", "") != "1")
        page = browser.new_page()
        try:
            page.goto(live_server_url + "/", wait_until="domcontentloaded", timeout=60_000)
            page.fill("#repo_url", repo)
            page.click('button[type="submit"]')

            expect(page.locator("#pipeline-viewer-root")).to_be_visible(timeout=120_000)
            expect(page.locator("#step-3-status")).to_have_text("Complete", timeout=timeout_ms)
            expect(page.locator("#viewer-iframe")).to_be_visible(timeout=120_000)
            expect(page.locator("#viewer-error")).not_to_be_visible()
        finally:
            browser.close()
