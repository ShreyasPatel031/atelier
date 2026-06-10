#!/usr/bin/env python3
"""Entry: exercise core models and config."""
from core.config import Config
from core.models import Record, Batch, Status


def run_core() -> int:
    cfg = Config.from_env()
    errors = cfg.validate()
    if errors:
        return 1
    batch = Batch(batch_id="core-demo")
    batch.add(Record(id="c1", payload={"source": "run_core"}))
    return 0


if __name__ == "__main__":
    raise SystemExit(run_core())
