"""JSON and CSV readers."""
from __future__ import annotations
import csv
import json
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional


class JsonReader:
    def __init__(self, path: Path):
        self.path = path

    def read(self) -> Any:
        return json.loads(self.path.read_text(encoding="utf-8"))

    def read_lines(self) -> Iterator[Dict[str, Any]]:
        for line in self.path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                yield json.loads(line)


class CsvReader:
    def __init__(self, path: Path, delimiter: str = ","):
        self.path = path
        self.delimiter = delimiter

    def read_rows(self) -> List[Dict[str, str]]:
        with self.path.open(newline="", encoding="utf-8") as f:
            return list(csv.DictReader(f, delimiter=self.delimiter))

    def read_column(self, name: str) -> List[str]:
        return [row[name] for row in self.read_rows() if name in row]
