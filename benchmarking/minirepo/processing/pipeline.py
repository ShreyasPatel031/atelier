"""Pipeline orchestration."""
from __future__ import annotations
import logging
import time
from dataclasses import dataclass, field
from typing import Callable, List, Optional

from core.config import Config
from core.models import Batch, PipelineResult, Record, Status
from processing.transforms import normalize, mark_done

logger = logging.getLogger(__name__)


@dataclass
class PipelineStage:
    name: str
    handler: Callable[[Record], Record]
    enabled: bool = True


class Pipeline:
    def __init__(self, config: Config, stages: Optional[List[PipelineStage]] = None):
        self.config = config
        self.stages = stages or [
            PipelineStage("normalize", normalize),
            PipelineStage("mark_done", mark_done),
        ]

    def run(self, records: List[Record]) -> PipelineResult:
        start = time.time()
        processed = 0
        failed = 0
        errors: List[str] = []

        for record in records:
            try:
                for stage in self.stages:
                    if stage.enabled:
                        record = stage.handler(record)
                processed += 1
            except Exception as exc:
                failed += 1
                record.status = Status.FAILED
                errors.append(f"{record.id}: {exc}")
                logger.error("Record %s failed: %s", record.id, exc)

        duration = time.time() - start
        return PipelineResult(
            success=failed == 0,
            records_processed=processed,
            records_failed=failed,
            duration_seconds=duration,
            errors=errors,
        )

    def run_batch(self, batch: Batch) -> PipelineResult:
        return self.run(batch.records)
