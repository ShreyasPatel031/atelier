"""Record transforms."""
from __future__ import annotations
from typing import Any, Callable, Dict, List

from core.models import Record, Status


def normalize(record: Record) -> Record:
  """Lowercase string fields in payload."""
  payload = {}
  for k, v in record.payload.items():
    payload[k] = v.lower() if isinstance(v, str) else v
  record.payload = payload
  return record


def filter_records(records: List[Record], predicate: Callable[[Record], bool]) -> List[Record]:
  return [r for r in records if predicate(r)]


def enrich(record: Record, extra: Dict[str, Any]) -> Record:
  record.metadata.update(extra)
  return record


def mark_done(record: Record) -> Record:
  record.status = Status.DONE
  return record
