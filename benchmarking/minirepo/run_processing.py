#!/usr/bin/env python3
"""Entry: exercise processing pipeline."""
from core.config import Config
from core.models import Record, Batch
from processing.pipeline import Pipeline


def run_processing() -> int:
    cfg = Config.from_env()
    pipeline = Pipeline(cfg)
    batch = Batch(batch_id="proc-demo")
    for i in range(5):
        batch.add(Record(id=f"p{i}", payload={"name": f"Item{i}"}))
    result = pipeline.run_batch(batch)
    return 0 if result.success else 1


if __name__ == "__main__":
    raise SystemExit(run_processing())
