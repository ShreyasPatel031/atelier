#!/usr/bin/env python3
"""Compare Vertex AI vs Direct Gemini API latency under concurrency.

Also checks current quota limits.
"""
import asyncio, time, sys, os, statistics, random

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import requests as http_requests
import google.auth
import google.auth.transport.requests

from codewiki.src.be.utils import count_tokens

MODEL = "gemini-2.5-flash"
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

FILLER = (
    "The transformer architecture uses self-attention mechanisms to process "
    "input sequences in parallel. Each attention head computes query, key, and "
    "value projections from the input embeddings. The scaled dot-product "
    "attention score is computed as softmax(QK^T / sqrt(d_k)) V. "
    "Multi-head attention concatenates the outputs of h parallel attention "
    "heads and projects through a final linear layer.\n\n"
)


def build_prompt(target_tokens: int) -> str:
    base = "Document the following code module. Return JSON with title, summary.\n\n"
    filler_tokens = count_tokens(FILLER)
    repeats = max(1, (target_tokens - count_tokens(base)) // filler_tokens)
    return base + FILLER * repeats


def _get_token():
    creds, project = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token, project


def _call(url: str, body: dict, headers: dict) -> tuple[float, int, str]:
    """Single API call with retry. Returns (duration, status, error_info)."""
    start = time.time()
    for attempt in range(4):
        try:
            r = http_requests.post(url, json=body, headers=headers, timeout=120)
            dur = time.time() - start
            if r.status_code in (429, 503):
                err_text = r.text[:200]
                delay = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(delay)
                continue
            return dur, r.status_code, "" if r.status_code == 200 else r.text[:100]
        except Exception as e:
            if attempt < 3:
                delay = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(delay)
                continue
            return time.time() - start, -1, str(e)[:100]
    return time.time() - start, -2, "max retries"


def call_vertex(prompt: str, project: str, token: str, region: str = "us-central1"):
    url = (
        f"https://{region}-aiplatform.googleapis.com/v1/projects/{project}"
        f"/locations/{region}/publishers/google/models/{MODEL}:generateContent"
    )
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 256, "responseMimeType": "application/json"},
    }
    return _call(url, body, {"Authorization": f"Bearer {token}", "Content-Type": "application/json"})


def call_direct(prompt: str, api_key: str):
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={api_key}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 256, "responseMimeType": "application/json"},
    }
    return _call(url, body, {"Content-Type": "application/json"})


async def bench(label: str, fn, n: int) -> dict:
    tasks = [asyncio.to_thread(fn) for _ in range(n)]
    wall_start = time.time()
    results = await asyncio.gather(*tasks)
    wall = time.time() - wall_start
    durs = [r[0] for r in results]
    errs = sum(1 for r in results if r[1] != 200)
    err_info = [r[2] for r in results if r[1] != 200]
    return {
        "label": label, "n": n, "wall": round(wall, 1),
        "mean": round(statistics.mean(durs), 1), "min": round(min(durs), 1),
        "max": round(max(durs), 1), "errors": errs, "err_info": err_info[:3],
    }


async def main():
    token, project = _get_token()
    print(f"Project: {project}")
    print(f"Model: {MODEL}")
    print(f"Direct API key: {'yes' if GEMINI_API_KEY else 'NO'}")
    print()

    for prompt_tokens in [5_000, 20_000]:
        prompt = build_prompt(prompt_tokens)
        actual = count_tokens(prompt)
        print(f"\n{'='*70}")
        print(f"PROMPT SIZE: {actual:,} tokens")
        print(f"{'='*70}")
        print(f"{'endpoint':>25}  {'n':>3}  {'wall':>6}  {'mean':>6}  {'min':>6}  {'max':>6}  {'err':>3}")
        print("-" * 70)

        for n in [1, 4, 8, 16]:
            # Vertex AI
            token, _ = _get_token()
            r = await bench("vertex-us-central1", lambda: call_vertex(prompt, project, token), n)
            print(f"{'vertex-us-central1':>25}  {r['n']:>3}  {r['wall']:>5.1f}s  {r['mean']:>5.1f}s  "
                  f"{r['min']:>5.1f}s  {r['max']:>5.1f}s  {r['errors']:>3}  {' '.join(r['err_info'])}")

            # Direct Gemini API
            if GEMINI_API_KEY:
                r = await bench("direct-gemini", lambda: call_direct(prompt, GEMINI_API_KEY), n)
                print(f"{'direct-gemini':>25}  {r['n']:>3}  {r['wall']:>5.1f}s  {r['mean']:>5.1f}s  "
                      f"{r['min']:>5.1f}s  {r['max']:>5.1f}s  {r['errors']:>3}  {' '.join(r['err_info'])}")

            print()

    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
