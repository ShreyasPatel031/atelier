#!/usr/bin/env python3
"""
Verify GEMINI_API_KEY (or .env) with a tiny REST call. Exit 0 on success, 1 on failure.
Usage: from repo root, `python scripts/verify_llm_key.py`
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

_REPO = Path(__file__).resolve().parent.parent


def main() -> int:
    try:
        from dotenv import load_dotenv
    except ImportError:
        print("Install python-dotenv: pip install python-dotenv", file=sys.stderr)
        return 1

    load_dotenv(_REPO / ".env")
    load_dotenv()

    key = (os.getenv("GEMINI_API_KEY") or "").strip()
    if not key:
        print(
            "No GEMINI_API_KEY. Set it in the repo .env (GEMINI_API_KEY=...) or export it, "
            "then rerun.",
            file=sys.stderr,
        )
        return 1

    import urllib.request
    import urllib.error

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={key}"
    body = json.dumps(
        {
            "contents": [{"role": "user", "parts": [{"text": 'Say "ok" only.'}]}],
            "generationConfig": {"maxOutputTokens": 8, "temperature": 0},
        }
    ).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            if resp.status == 200:
                print("OK: Gemini API accepted the key (minimal generateContent).")
                return 0
            print(f"Unexpected status: {resp.status}", file=sys.stderr)
            return 1
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(err_body)
            msg = detail.get("error", {}).get("message", err_body)
        except json.JSONDecodeError:
            msg = err_body[:500]
        print(f"HTTP {e.code}: {msg}", file=sys.stderr)
        return 1
    except Exception as ex:
        print(str(ex), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
