#!/usr/bin/env python3
"""
Web UI E2E tests (FastAPI TestClient): form submit → pipeline stages → /repos + /viewer.

Uses monkeypatched clone + DocumentationGenerator.run so tests run without network or LLM.
"""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path

import pytest
from fastapi.testclient import TestClient


def _drain_worker_queue(worker) -> None:
    from queue import Empty

    while True:
        try:
            worker.processing_queue.get_nowait()
        except Empty:
            break


def _reset_web_app_state(web_app_mod, tmp_cache: Path, tmp_temp: Path) -> None:
    """Point worker/cache at tmp dirs and clear in-memory queue + jobs."""
    web_app_mod.WebAppConfig.CACHE_DIR = str(tmp_cache)
    web_app_mod.WebAppConfig.TEMP_DIR = str(tmp_temp)
    tmp_cache.mkdir(parents=True, exist_ok=True)
    tmp_temp.mkdir(parents=True, exist_ok=True)

    w = web_app_mod.background_worker
    w.temp_dir = str(tmp_temp)
    w.jobs_file = tmp_cache / "jobs.json"
    w.job_status.clear()
    _drain_worker_queue(w)

    cm = web_app_mod.cache_manager
    cm.cache_dir = tmp_cache
    cm.cache_index.clear()


@pytest.fixture
def isolated_web_app(tmp_path, monkeypatch):
    """Point worker/cache at ``tmp_path`` and reset in-memory job state."""
    cache = tmp_path / "cache"
    temp = tmp_path / "temp"
    base = str(tmp_path.resolve())
    monkeypatch.setattr("os.getcwd", lambda: base)
    import codewiki.src.fe.web_app as wa

    _reset_web_app_state(wa, cache, temp)
    yield wa
    _reset_web_app_state(wa, cache, temp)


def _fake_clone_factory():
    def fake_clone(clone_url: str, target_dir: str, commit_id: str | None = None) -> bool:
        p = Path(target_dir)
        p.mkdir(parents=True, exist_ok=True)
        (p / "main.py").write_text("def hello():\n    return 1\n", encoding="utf-8")
        return True

    return fake_clone


async def _fake_run(self):
    """Stand-in for DocumentationGenerator.run() — writes minimal artifacts and emits stages."""
    import asyncio
    import os

    wd = Path(os.path.abspath(self.config.docs_dir))
    wd.mkdir(parents=True, exist_ok=True)
    tree = {"main": {"path": "", "components": [], "children": {}}}
    (wd / "module_tree.json").write_text(json.dumps(tree), encoding="utf-8")
    (wd / "first_module_tree.json").write_text(json.dumps(tree), encoding="utf-8")
    (wd / "overview.md").write_text(
        '# Test\n\n```mermaid\ngraph TD\nA["A"] --> B["B"]\nclick A "main.md"\n```\n',
        encoding="utf-8",
    )
    (wd / "main.md").write_text("# main\n", encoding="utf-8")

    self._emit_stage(1)
    await asyncio.sleep(0.08)
    self._emit_stage(2)
    await asyncio.sleep(0.08)
    self.create_documentation_metadata(str(wd), {}, 0)
    await asyncio.sleep(0.08)
    self._emit_stage(3)


def _poll_job_until(
    client: TestClient, job_id: str, timeout_s: float = 15.0
) -> tuple[dict, set[int]]:
    deadline = time.time() + timeout_s
    stages_seen: set[int] = set()
    last: dict = {}
    while time.time() < deadline:
        r = client.get(f"/api/job/{job_id}")
        if r.status_code == 404:
            time.sleep(0.02)
            continue
        last = r.json()
        stages_seen.add(last.get("generation_stage", -1))
        if last.get("status") == "completed":
            return last, stages_seen
        if last.get("status") == "failed":
            pytest.fail(f"job failed: {last}")
        time.sleep(0.03)
    pytest.fail(f"timeout waiting for job {job_id}; last={last}")


class TestWebUiGenerationE2E:
    def test_submit_repo_hits_three_pipeline_stages_and_serves_viewer_assets(
        self, isolated_web_app, monkeypatch
    ):
        """
        Mirrors UI flow: POST / with repo URL → worker runs stages 1–3 → docs served like the viewer expects.
        """
        monkeypatch.setattr(
            "codewiki.src.fe.github_processor.GitHubRepoProcessor.clone_repository",
            staticmethod(_fake_clone_factory()),
        )
        monkeypatch.setattr(
            "codewiki.src.be.documentation_generator.DocumentationGenerator.run",
            _fake_run,
        )

        suffix = uuid.uuid4().hex[:10]
        repo_url = f"https://github.com/e2e-test-org/doc-pipeline-{suffix}"
        job_id = f"e2e-test-org--doc-pipeline-{suffix}"

        with TestClient(isolated_web_app.app) as client:
            post = client.post(
                "/",
                data={"repo_url": repo_url, "commit_id": ""},
                follow_redirects=True,
            )
            assert post.status_code == 200
            assert job_id in post.text or "Job ID" in post.text

            final, stages_seen = _poll_job_until(client, job_id)
            assert final["status"] == "completed"
            assert final["generation_stage"] == 3
            assert final.get("docs_path")
            assert Path(final["docs_path"]).is_dir()
            assert {1, 2, 3}.issubset(stages_seen), (
                f"expected stages 1–3 observed, got {stages_seen}"
            )

            mt = client.get(f"/repos/{job_id}/module_tree.json")
            assert mt.status_code == 200
            body = mt.json()
            assert "main" in body

            idx = client.get("/repos/index.json")
            assert idx.status_code == 200
            payload = idx.json()
            assert isinstance(payload, list)
            ids = [
                x if isinstance(x, str) else (x.get("id") if isinstance(x, dict) else None)
                for x in payload
            ]
            assert job_id in ids

            viewer = client.get("/viewer")
            assert viewer.status_code == 200
            assert len(viewer.text) > 100

            home = client.get("/", params={"job": job_id})
            assert home.status_code == 200
            assert "/viewer?repo=" in home.text

    def test_web_ui_uses_documentation_generator_run_directly(self):
        """Web UI calls DocumentationGenerator.run() — no separate pipeline copy to drift."""
        import inspect
        from codewiki.src.fe import background_worker as bw

        src = inspect.getsource(bw.BackgroundWorker._process_job)
        assert "doc_generator.run()" in src, (
            "background_worker should call doc_generator.run() directly, "
            "not a separate pipeline function"
        )
