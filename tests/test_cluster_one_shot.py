"""Unit tests for one-shot module clustering (no live LLM)."""

import pytest

from codewiki.src.be.cluster_modules import cluster_modules
from codewiki.src.be.dependency_analyzer.models.core import Node
from codewiki.src.config import Config, CLUSTERING_THINKING_BUDGET


def _make_config(repo_path: str = "/tmp/fake") -> Config:
    return Config(
        repo_path=repo_path,
        output_dir="output",
        dependency_graph_dir="output/dependency_graphs",
        docs_dir="/tmp/docs",
        max_depth=10,
        llm_base_url="http://0.0.0.0:1/",
        llm_api_key="sk-test",
        main_model="gpt-4o",
        cluster_model="gpt-4o",
    )


def _node(cid: str) -> Node:
    return Node(
        id=cid,
        name=cid,
        component_type="function",
        file_path="/x.py",
        relative_path="x.py",
        source_code="def x(): pass",
    )


def test_cluster_modules_too_few_returns_single_main():
    components = {"a": _node("a"), "b": _node("b")}
    leaf_nodes = ["a", "b"]
    tree = cluster_modules(leaf_nodes, components, _make_config())
    assert len(tree) == 1
    assert "main" in tree
    assert set(tree["main"]["components"]) == {"a", "b"}
    assert tree["main"]["children"] == {}


def test_cluster_modules_one_shot_parses_nested_tree(monkeypatch):
    components = {f"c{i}": _node(f"c{i}") for i in range(5)}
    leaf_nodes = list(components.keys())

    def fake_llm(prompt, config, model=None, temperature=0.0, thinking_budget=None):
        assert "TWO-LEVEL" in prompt or "GROUPED_COMPONENTS" in prompt
        # OpenAI path ignores thinking_budget
        return """<GROUPED_COMPONENTS>
{
    "top_a": {
        "path": "",
        "components": [],
        "children": {
            "sub1": {"path": "", "components": ["c0", "c1"]},
            "sub2": {"path": "", "components": ["c2", "c3", "c4"]}
        }
    }
}
</GROUPED_COMPONENTS>"""

    monkeypatch.setattr("codewiki.src.be.cluster_modules.call_llm", fake_llm)

    tree = cluster_modules(leaf_nodes, components, _make_config())
    assert len(tree) == 1
    assert "top_a" in tree
    children = tree["top_a"]["children"]
    assert len(children) == 2
    assert set(children["sub1"]["components"]) == {"c0", "c1"}
    assert set(children["sub2"]["components"]) == {"c2", "c3", "c4"}


def test_cluster_modules_gemini_passes_thinking_budget(monkeypatch):
    components = {f"c{i}": _node(f"c{i}") for i in range(5)}
    leaf_nodes = list(components.keys())
    cfg = _make_config()
    cfg.cluster_model = "gemini-2.5-flash"

    captured = {}

    def fake_llm(prompt, config, model=None, temperature=0.0, thinking_budget=None):
        captured["thinking_budget"] = thinking_budget
        return """<GROUPED_COMPONENTS>
{
    "m": {"path": "", "components": [], "children": {"s": {"path": "", "components": ["c0", "c1", "c2", "c3", "c4"]}}}
}
</GROUPED_COMPONENTS>"""

    monkeypatch.setattr("codewiki.src.be.cluster_modules.call_llm", fake_llm)

    cluster_modules(leaf_nodes, components, cfg)
    assert captured.get("thinking_budget") == CLUSTERING_THINKING_BUDGET
