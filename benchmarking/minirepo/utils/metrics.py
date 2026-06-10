"""Simple metrics collection."""
from __future__ import annotations
import time
from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class Counter:
    name: str
    value: int = 0

    def inc(self, amount: int = 1) -> None:
        self.value += amount


@dataclass
class Gauge:
    name: str
    value: float = 0.0

    def set(self, val: float) -> None:
        self.value = val


@dataclass
class MetricsCollector:
    counters: Dict[str, Counter] = field(default_factory=dict)
    gauges: Dict[str, Gauge] = field(default_factory=dict)
    _start: float = field(default_factory=time.time)

    def counter(self, name: str) -> Counter:
        if name not in self.counters:
            self.counters[name] = Counter(name)
        return self.counters[name]

    def gauge(self, name: str) -> Gauge:
        if name not in self.gauges:
            self.gauges[name] = Gauge(name)
        return self.gauges[name]

    def snapshot(self) -> Dict[str, object]:
        return {
            "uptime_seconds": time.time() - self._start,
            "counters": {k: v.value for k, v in self.counters.items()},
            "gauges": {k: v.value for k, v in self.gauges.items()},
        }
