"""Structural diagram IR validation (generation boundary). Run: pytest tests/test_diagram_ir_validator.py -q"""

from codewiki.src.be.diagram_ir_validator import validate_diagram_ir


def test_valid_minimal_diagram():
    d = {
        "direction": "TD",
        "nodes": [
            {"id": "a", "label": "A human readable", "title": "A node", "description": "First test node."},
            {"id": "b", "label": "B human readable", "title": "B node", "description": "Second test node."},
        ],
        "edges": [{"source": "a", "target": "b", "label": "x"}],
        "groups": [
            {
                "id": "g1",
                "label": "G group",
                "title": "G group",
                "description": "Groups node A in this structural test.",
                "nodes": ["a"],
            }
        ],
    }
    assert validate_diagram_ir(d) == []


def test_rejects_empty_group():
    d = {
        "direction": "TD",
        "nodes": [{"id": "a", "label": "A human readable", "title": "A", "description": "One node."}],
        "edges": [],
        "groups": [
            {
                "id": "g1",
                "label": "G",
                "title": "G",
                "description": "Group with no members.",
                "nodes": [],
            }
        ],
    }
    codes = {x["code"] for x in validate_diagram_ir(d)}
    assert "group_empty" in codes


def test_rejects_edge_to_unknown_node():
    d = {
        "direction": "TD",
        "nodes": [{"id": "a", "label": "A human readable", "title": "A", "description": "Sole node."}],
        "edges": [{"source": "a", "target": "missing", "label": "x"}],
        "groups": [],
    }
    codes = {x["code"] for x in validate_diagram_ir(d)}
    assert "edge_endpoint_unknown" in codes


def test_rejects_node_group_id_collision():
    d = {
        "direction": "TD",
        "nodes": [{"id": "same", "label": "N human", "title": "N", "description": "Node colliding id."}],
        "edges": [],
        "groups": [
            {
                "id": "same",
                "label": "G",
                "title": "G",
                "description": "Group with same id as node.",
                "nodes": ["same"],
            }
        ],
    }
    codes = {x["code"] for x in validate_diagram_ir(d)}
    assert "node_id_collides_with_group_id" in codes


def test_rejects_missing_node_description():
    d = {
        "direction": "TD",
        "nodes": [{"id": "a", "label": "A human readable", "title": "Has title only"}],
        "edges": [],
        "groups": [],
    }
    codes = {x["code"] for x in validate_diagram_ir(d)}
    assert "node_missing_description" in codes


if __name__ == "__main__":
    test_valid_minimal_diagram()
    test_rejects_empty_group()
    test_rejects_edge_to_unknown_node()
    test_rejects_node_group_id_collision()
    test_rejects_missing_node_description()
    print("diagram_ir_validator tests: ok")
