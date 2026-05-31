"""
Architectural Agent help pill (?): demo repo resolution, CORS for port 9891, chat payload.
"""

from __future__ import annotations

import os
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

REPO_ROOT = Path(__file__).resolve().parent.parent
PERSONA_JOB_ID = "persona-selection-model"
PERSONA_DEV_NODE_ID = "persona_development_and_evaluation"
HELP_PILL_MESSAGE = (
    'Give a brief explanation of what "Persona Development & Evaluation" is '
    "in the context of this architecture diagram."
)


def _gemini_available() -> bool:
    if (os.getenv("GEMINI_API_KEY") or "").strip():
        return True
    try:
        from api.chat import _gemini_ready

        return _gemini_ready()
    except Exception:
        return False


@pytest.fixture
def arch_agent_client() -> TestClient:
    from codewiki.src.fe.web_app import app

    return TestClient(app)


def test_cors_preflight_allows_demo_port_9891(arch_agent_client: TestClient) -> None:
    res = arch_agent_client.options(
        "/api/arch-agent/chat",
        headers={
            "Origin": "http://127.0.0.1:9891",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert res.status_code == 200
    assert res.headers.get("access-control-allow-origin") == "http://127.0.0.1:9891"


def test_arch_agent_chat_resolves_persona_demo_repo(arch_agent_client: TestClient) -> None:
    mock_response = (
        "Persona Development & Evaluation covers experiment runners, steering demos, and SAE analysis.",
        [],
    )

    with patch(
        "codewiki.src.be.architectural_agent.ArchitecturalAgentRunner.chat_async",
        new_callable=AsyncMock,
        return_value=mock_response,
    ) as chat_async:
        res = arch_agent_client.post(
            "/api/arch-agent/chat",
            json={
                "job_id": PERSONA_JOB_ID,
                "message": HELP_PILL_MESSAGE,
                "opened_modules": ["overview"],
                "diagram_selection": {
                    "kind": "node",
                    "logical_id": PERSONA_DEV_NODE_ID,
                    "label": "Persona Development & Evaluation",
                    "module_id": None,
                },
                "diagram_selections": [
                    {
                        "kind": "node",
                        "logical_id": PERSONA_DEV_NODE_ID,
                        "label": "Persona Development & Evaluation",
                        "module_id": None,
                    }
                ],
            },
        )

    assert res.status_code == 200, res.text
    body = res.json()
    assert "Persona Development & Evaluation" in body["response"]
    assert chat_async.await_count == 1
    call_kwargs = chat_async.await_args.kwargs
    assert call_kwargs["message"] == HELP_PILL_MESSAGE
    assert call_kwargs["diagram_selection"]["logical_id"] == PERSONA_DEV_NODE_ID


@pytest.mark.integration
@pytest.mark.skipif(not _gemini_available(), reason="GEMINI_API_KEY or gcloud ADC required")
def test_arch_agent_brief_explanation_persona_dev_eval_live() -> None:
    import asyncio

    from codewiki.src.be.architectural_agent import ArchitecturalAgentRunner

    docs = REPO_ROOT / "demo" / "repos" / PERSONA_JOB_ID
    assert (docs / "module_tree.json").is_file()

    runner = ArchitecturalAgentRunner(str(docs))
    response, _history = asyncio.run(
        runner.chat_async(
            HELP_PILL_MESSAGE,
            opened_modules=["overview"],
            diagram_selection={
                "kind": "node",
                "logical_id": PERSONA_DEV_NODE_ID,
                "label": "Persona Development & Evaluation",
                "module_id": None,
            },
        )
    )
    assert response.strip()
    assert "error" not in response.lower()[:40]
