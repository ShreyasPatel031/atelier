"""Tests for doc audit metrics: missing .md vs tree and auto-generated placeholder files."""

import json
import tempfile
from pathlib import Path

from codewiki.src.be.doc_file_sync import (
    AUTO_GENERATED_PLACEHOLDER_MARKER,
    audit_docs_state,
)


def test_audit_docs_state_counts_placeholder_md_files():
    """audit_docs_state reports how many *.md files are sync placeholders (not LLM output)."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        tree = {
            "leaf_a": {
                "components": ["pkg.mod.A"],
                "children": {},
                "title": "A",
                "description": "D",
            },
            "leaf_b": {
                "components": ["pkg.mod.B"],
                "children": {},
                "title": "B",
                "description": "D",
            },
        }
        (root / "module_tree.json").write_text(json.dumps(tree), encoding="utf-8")
        (root / "leaf_a.md").write_text(
            f"<!-- {AUTO_GENERATED_PLACEHOLDER_MARKER}\n reason: test\n-->\n# A\n",
            encoding="utf-8",
        )
        (root / "leaf_b.md").write_text("# Real doc\n## Overview\n", encoding="utf-8")

        r = audit_docs_state(td)
        assert r["modules_total"] == 2
        assert r["missing_md"] == 0
        assert r["placeholder_md_files"] == 1


def test_audit_docs_state_no_placeholders():
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        tree = {
            "only": {"components": ["x"], "children": {}, "title": "T", "description": "D"},
        }
        (root / "module_tree.json").write_text(json.dumps(tree), encoding="utf-8")
        (root / "only.md").write_text("# Only\n", encoding="utf-8")
        r = audit_docs_state(td)
        assert r["placeholder_md_files"] == 0


def test_audit_docs_state_missing_md_is_separate_from_placeholder():
    """Missing file on disk is missing_md; a present file can still be a placeholder."""
    with tempfile.TemporaryDirectory() as td:
        root = Path(td)
        tree = {
            "gone": {"components": [], "children": {}, "title": "G", "description": "D"},
            "here": {"components": [], "children": {}, "title": "H", "description": "D"},
        }
        (root / "module_tree.json").write_text(json.dumps(tree), encoding="utf-8")
        (root / "here.md").write_text(
            f"<!-- {AUTO_GENERATED_PLACEHOLDER_MARKER}\n-->\n",
            encoding="utf-8",
        )
        r = audit_docs_state(td)
        assert r["missing_md"] == 1
        assert r["placeholder_md_files"] == 1
