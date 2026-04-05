"""
Guardrail: the web generation pipeline must never call ``signal`` — it runs in a worker thread.
"""

from pathlib import Path


def test_cli_equivalent_pipeline_has_no_signal_calls():
    root = Path(__file__).resolve().parent.parent
    path = root / "codewiki/src/fe/cli_equivalent_pipeline.py"
    text = path.read_text(encoding="utf-8")
    assert "import signal" not in text
    assert "signal.signal(" not in text
    assert "signal.alarm(" not in text
