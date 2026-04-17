#!/usr/bin/env python3
"""
Data models and classes for the CodeWiki web application.
"""

from datetime import datetime
from typing import List, Optional
from dataclasses import dataclass
from pydantic import BaseModel, HttpUrl


class RepositorySubmission(BaseModel):
    """Pydantic model for repository submission form."""
    repo_url: HttpUrl


class JobStatusResponse(BaseModel):
    """Pydantic model for job status API response."""
    job_id: str
    repo_url: str
    status: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    progress: str = ""
    docs_path: Optional[str] = None
    main_model: Optional[str] = None
    commit_id: Optional[str] = None
    # 0 = not started / queued; 1–3 = pipeline stages; 3 also means docs phase done before job completion
    generation_stage: int = 0
    force_regenerate: Optional[bool] = None


class JobListResponse(BaseModel):
    """List of all tracked jobs (for UI polling / E2E idle wait)."""

    jobs: List[JobStatusResponse]


@dataclass
class JobStatus:
    """Tracks the status of a documentation generation job."""
    job_id: str
    repo_url: str
    status: str  # 'queued', 'processing', 'completed', 'failed'
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    progress: str = ""
    docs_path: Optional[str] = None
    main_model: Optional[str] = None
    commit_id: Optional[str] = None
    generation_stage: int = 0
    # If True, skip cache and re-run generation; worker may reuse temp clone under TEMP_DIR/job_id
    force_regenerate: bool = False


@dataclass
class CacheEntry:
    """Represents a cached documentation result."""
    repo_url: str
    repo_url_hash: str
    docs_path: str
    created_at: datetime
    last_accessed: datetime