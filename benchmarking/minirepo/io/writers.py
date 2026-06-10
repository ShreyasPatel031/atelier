"""JSON and CSV writers."""
from __future__ import annotations
import csv
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List


class JsonWriter:
    def __init__(self, path: Path, indent: int = 2):
        self.path = path
        self.indent = indent

    def write(self, data: Any) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(data, indent=self.indent), encoding="utf-8")

    def append_line(self, record: Dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")


class CsvWriter:
    def __init__(self, path: Path, fieldnames: List[str]):
        self.path = path
        self.fieldnames = fieldnames

    def write_rows(self, rows: Iterable[Dict[str, str]]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.path.open("w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=self.fieldnames)
            writer.writeheader()
            writer.writerows(rows)
