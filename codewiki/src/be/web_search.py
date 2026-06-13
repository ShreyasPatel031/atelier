"""
Gemini Grounding with Google Search for the architectural chat agent.

Invoked as a pydantic-ai function tool (separate generateContent call with googleSearch)
so it can coexist with read_module_documentation on GoogleModel.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, List, Optional

from codewiki.src.config import Config

logger = logging.getLogger(__name__)


def _extract_grounding_sources(candidate: dict) -> List[Dict[str, str]]:
    sources: List[Dict[str, str]] = []
    seen: set[str] = set()
    meta = candidate.get("groundingMetadata") or {}
    for chunk in meta.get("groundingChunks") or []:
        web = chunk.get("web") if isinstance(chunk, dict) else None
        if not isinstance(web, dict):
            continue
        uri = str(web.get("uri") or "").strip()
        if not uri or uri in seen:
            continue
        seen.add(uri)
        sources.append(
            {
                "uri": uri,
                "title": str(web.get("title") or uri).strip(),
                "domain": str(web.get("domain") or "").strip(),
            }
        )
    return sources


def _format_search_result(query: str, answer: str, sources: List[Dict[str, str]], queries: List[str]) -> str:
    lines = [f'Web search query: "{query.strip()}"']
    if queries:
        lines.append("Google search queries used: " + "; ".join(queries))
    lines.append("")
    if answer.strip():
        lines.append(answer.strip())
    else:
        lines.append("(No summary text returned from search.)")
    if sources:
        lines.append("")
        lines.append("Sources:")
        for s in sources:
            title = s.get("title") or s.get("uri") or "link"
            uri = s.get("uri") or ""
            lines.append(f"- {title}: {uri}")
    return "\n".join(lines)


def gemini_google_search(query: str, config: Config, *, model: Optional[str] = None) -> str:
    """
    Run Gemini generateContent with googleSearch grounding.

    Returns formatted text (summary + source URLs) for the agent tool output.
    """
    import requests

    from codewiki.src.be.llm_services import (
        _get_adc_bearer_token,
        _resolve_gemini_api_key,
        _use_adc_mode,
    )

    q = (query or "").strip()
    if not q:
        return "Provide a non-empty search query."

    model_name = (model or config.main_model or "gemini-2.5-flash").strip()
    prompt = (
        "Find authoritative public documentation or references for the following. "
        "Prefer official docs, papers, and source repos. Be concise.\n\n"
        f"{q}"
    )
    body: Dict[str, Any] = {
        "contents": [{"parts": [{"text": prompt}]}],
        "tools": [{"googleSearch": {}}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 8192},
    }

    if _use_adc_mode(config):
        bearer_token = _get_adc_bearer_token(config)
        project = getattr(config, "gcp_project", "") or "applied-ai-practice00"
        url = (
            f"https://us-central1-aiplatform.googleapis.com/v1/projects/{project}"
            f"/locations/us-central1/publishers/google/models/{model_name}:generateContent"
        )
        vertex_body = dict(body)
        vertex_body["contents"] = [{"role": "user", **c} for c in body["contents"]]
        req_kwargs: dict = {
            "json": vertex_body,
            "headers": {"Authorization": f"Bearer {bearer_token}", "Content-Type": "application/json"},
            "timeout": 120,
        }
    else:
        api_key = _resolve_gemini_api_key(config)
        if not api_key:
            return "Web search unavailable: set GEMINI_API_KEY or use Vertex ADC (GOOGLE_USE_ADC=1)."
        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}"
            f":generateContent?key={api_key}"
        )
        req_kwargs = {"json": body, "timeout": 120}

    logger.info("[WEB-SEARCH] Gemini googleSearch: %r", q[:120])
    t0 = time.time()
    try:
        r = requests.post(url, **req_kwargs)
    except requests.exceptions.RequestException as e:
        logger.warning("[WEB-SEARCH] request failed: %s", e)
        return f"Web search request failed: {e}"

    try:
        data = r.json()
    except ValueError:
        return f"Web search failed: invalid JSON (HTTP {r.status_code})"

    if r.status_code != 200:
        err = (data.get("error") or {}).get("message") or r.text
        logger.warning("[WEB-SEARCH] HTTP %s: %s", r.status_code, str(err)[:200])
        return f"Web search failed (HTTP {r.status_code}): {str(err)[:300]}"

    cands = data.get("candidates") or []
    if not cands:
        return "Web search returned no results."

    cand = cands[0]
    parts = (cand.get("content") or {}).get("parts") or []
    answer = "".join(p.get("text", "") for p in parts if isinstance(p, dict))
    meta = cand.get("groundingMetadata") or {}
    queries = [str(x) for x in (meta.get("webSearchQueries") or []) if x]
    sources = _extract_grounding_sources(cand)

    logger.info(
        "[WEB-SEARCH] done in %.1fs — %d sources, %d chars",
        time.time() - t0,
        len(sources),
        len(answer),
    )
    return _format_search_result(q, answer, sources, queries)
