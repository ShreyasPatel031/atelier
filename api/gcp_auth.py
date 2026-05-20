"""
GCP credentials for Vercel serverless (no GEMINI_API_KEY).

Loads ADC from env JSON (authorized_user or service_account), optional SA impersonation,
refreshes OAuth token for Vertex AI REST calls.
"""

from __future__ import annotations

import json
import os
from typing import Any, Optional, Tuple

_CLOUD_PLATFORM_SCOPE = "https://www.googleapis.com/auth/cloud-platform"


def _adc_json_from_env() -> Optional[dict[str, Any]]:
    raw = (
        (os.getenv("GOOGLE_ADC_JSON") or "").strip()
        or (os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON") or "").strip()
    )
    if not raw:
        return None
    return json.loads(raw)


def _use_adc_on_vercel() -> bool:
    if os.getenv("GOOGLE_USE_ADC", "").strip().lower() in ("1", "true", "yes"):
        return True
    if os.getenv("USE_VERTEX_AI", "").strip().lower() in ("1", "true", "yes"):
        return True
    return _adc_json_from_env() is not None


def get_vertex_access_token() -> Tuple[str, str]:
    """
    Return (bearer_token, project_id) for Vertex AI.
    Uses user ADC JSON and/or GOOGLE_IMPERSONATE_SERVICE_ACCOUNT.
    """
    import google.auth.transport.requests

    info = _adc_json_from_env()
    if info is None:
        import google.auth

        creds, project = google.auth.default(scopes=[_CLOUD_PLATFORM_SCOPE])
    elif info.get("type") == "authorized_user":
        from google.oauth2.credentials import Credentials

        creds = Credentials.from_authorized_user_info(info, scopes=[_CLOUD_PLATFORM_SCOPE])
        project = (
            info.get("quota_project_id")
            or os.getenv("GOOGLE_CLOUD_PROJECT")
            or os.getenv("GCP_PROJECT")
            or ""
        )
    elif info.get("type") == "service_account":
        from google.oauth2 import service_account

        creds = service_account.Credentials.from_service_account_info(
            info, scopes=[_CLOUD_PLATFORM_SCOPE]
        )
        project = info.get("project_id") or os.getenv("GOOGLE_CLOUD_PROJECT") or ""
    else:
        raise ValueError(f"Unsupported credential type: {info.get('type')!r}")

    target = (os.getenv("GOOGLE_IMPERSONATE_SERVICE_ACCOUNT") or "").strip()
    if target:
        from google.auth import impersonated_credentials

        creds = impersonated_credentials.Credentials(
            source_credentials=creds,
            target_principal=target,
            target_scopes=[_CLOUD_PLATFORM_SCOPE],
        )

    project = (
        (os.getenv("GOOGLE_CLOUD_PROJECT") or "").strip()
        or (os.getenv("GCP_PROJECT") or "").strip()
        or project
        or "applied-ai-practice00"
    )
    creds.refresh(google.auth.transport.requests.Request())
    token = getattr(creds, "token", None)
    if not token:
        raise RuntimeError("Failed to obtain GCP access token from ADC")
    return str(token), project


def vertex_ready() -> bool:
    if (os.getenv("GEMINI_API_KEY") or "").strip() and not _use_adc_on_vercel():
        return True
    if not _use_adc_on_vercel():
        return False
    try:
        get_vertex_access_token()
        return True
    except Exception:
        return False
