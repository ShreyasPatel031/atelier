"""Tests for Mermaid syntax audit (same pattern as test_doc_audit_placeholders)."""

import tempfile
from pathlib import Path

import pytest

from codewiki.src.be.doc_file_sync import audit_mermaid_syntax_state, mermaid_validator_operational


VALID_MERMAID = """# Doc

```mermaid
flowchart TD
    A["Start"] --> B["End"]
```
"""

# Triggers parser failure: unclosed quoted node text (similar to CLI label issues).
INVALID_MERMAID = """# Bad

```mermaid
flowchart TD
    n[ "CLI Entry Point (cli
```
"""


def test_audit_mermaid_syntax_state_no_mermaid():
    """No ```mermaid blocks → validator never runs; works without mermaid-py installed."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        (root / "plain.md").write_text("# No diagram\n", encoding="utf-8")
        r = audit_mermaid_syntax_state(td)
        assert r["md_files_scanned"] == 1
        assert r["mermaid_diagrams_total"] == 0
        if r["mermaid_validator_operational"]:
            assert r["mermaid_diagrams_syntax_errors"] == 0
        else:
            assert r["mermaid_diagrams_syntax_errors"] is None
        assert "mermaid_validator_operational" in r


@pytest.mark.skipif(
    not mermaid_validator_operational(),
    reason="Mermaid validator not operational (install mermaid-parser-py and mermaid-py)",
)
def test_audit_mermaid_syntax_state_valid_only():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        (root / "ok.md").write_text(VALID_MERMAID, encoding="utf-8")
        r = audit_mermaid_syntax_state(td)
        assert r["mermaid_diagrams_total"] == 1
        assert r["mermaid_diagrams_syntax_errors"] == 0


@pytest.mark.skipif(
    not mermaid_validator_operational(),
    reason="Mermaid validator not operational (install mermaid-parser-py and mermaid-py)",
)
def test_audit_mermaid_syntax_state_counts_invalid():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        (root / "bad.md").write_text(INVALID_MERMAID, encoding="utf-8")
        r = audit_mermaid_syntax_state(td)
        assert r["mermaid_diagrams_total"] == 1
        assert r["mermaid_diagrams_syntax_errors"] == 1
