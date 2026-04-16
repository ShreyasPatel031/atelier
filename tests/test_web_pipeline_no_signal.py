"""
Guardrail: DocumentationGenerator.run() must never call ``signal`` — the web worker
invokes it from a background thread where signal APIs are not available.
"""

from pathlib import Path


def test_documentation_generator_has_no_signal_calls():
    root = Path(__file__).resolve().parent.parent
    path = root / "codewiki/src/be/documentation_generator.py"
    text = path.read_text(encoding="utf-8")
    assert "import signal" not in text, (
        "documentation_generator.py must not use the signal module — "
        "it is called from a worker thread by the web UI"
    )
    assert "signal.signal(" not in text
    assert "signal.alarm(" not in text
