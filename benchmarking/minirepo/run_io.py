#!/usr/bin/env python3
"""Entry: exercise I/O readers and writers."""
from pathlib import Path
import tempfile

from io.readers import JsonReader, CsvReader
from io.writers import JsonWriter, CsvWriter


def run_io() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        base = Path(tmp)
        jpath = base / "out.json"
        JsonWriter(jpath).write({"ok": True})
        data = JsonReader(jpath).read()
        cpath = base / "out.csv"
        CsvWriter(cpath, ["a", "b"]).write_rows([{"a": "1", "b": "2"}])
        rows = CsvReader(cpath).read_rows()
        return 0 if data.get("ok") and len(rows) == 1 else 1


if __name__ == "__main__":
    raise SystemExit(run_io())
