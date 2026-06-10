"""
Core data models for the pipeline.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum
import json
import time


class Status(Enum):
    PENDING = "pending"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class Priority(Enum):
    LOW = 1
    MEDIUM = 5
    HIGH = 10
    CRITICAL = 100


@dataclass
class Record:
    id: str
    payload: Dict[str, Any]
    status: Status = Status.PENDING
    priority: Priority = Priority.MEDIUM
    created_at: float = field(default_factory=time.time)
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "payload": self.payload,
            "status": self.status.value,
            "priority": self.priority.value,
            "created_at": self.created_at,
            "tags": self.tags,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> Record:
        return cls(
            id=data["id"],
            payload=data["payload"],
            status=Status(data.get("status", "pending")),
            priority=Priority(data.get("priority", 5)),
            created_at=data.get("created_at", time.time()),
            tags=data.get("tags", []),
            metadata=data.get("metadata", {}),
        )

    def to_json(self) -> str:
        return json.dumps(self.to_dict())


@dataclass
class Batch:
    batch_id: str
    records: List[Record] = field(default_factory=list)
    max_size: int = 100

    def add(self, record: Record) -> bool:
        if len(self.records) >= self.max_size:
            return False
        self.records.append(record)
        return True

    def is_full(self) -> bool:
        return len(self.records) >= self.max_size

    def filter_by_status(self, status: Status) -> List[Record]:
        return [r for r in self.records if r.status == status]

    def filter_by_priority(self, min_priority: Priority) -> List[Record]:
        return [r for r in self.records if r.priority.value >= min_priority.value]


@dataclass
class PipelineResult:
    success: bool
    records_processed: int
    records_failed: int
    duration_seconds: float
    errors: List[str] = field(default_factory=list)

    @property
    def throughput(self) -> float:
        if self.duration_seconds == 0:
            return 0.0
        return self.records_processed / self.duration_seconds
