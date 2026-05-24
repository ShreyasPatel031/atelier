#!/usr/bin/env python3
"""Entry: exercise metrics and logging."""
from utils.logging_utils import setup_logging, get_logger
from utils.metrics import MetricsCollector


def run_metrics() -> int:
    setup_logging("INFO", "minipipe.metrics")
    log = get_logger("minipipe.metrics")
    m = MetricsCollector()
    m.counter("events").inc(3)
    m.gauge("queue_depth").set(7.5)
    snap = m.snapshot()
    log.info("metrics snapshot: %s", snap)
    return 0 if m.counters["events"].value == 3 else 1


if __name__ == "__main__":
    raise SystemExit(run_metrics())
