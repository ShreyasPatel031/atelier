#!/usr/bin/env python3
"""Re-test API throttling with LARGE prompts (matching real doc gen sizes)."""
import asyncio, time, sys, os, statistics

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import google.auth
import google.auth.transport.requests
import requests as http_requests

from codewiki.src.be.utils import count_tokens

MODEL = "gemini-2.5-flash"
REGION = "us-central1"

FILLER = (
    "The transformer architecture uses self-attention mechanisms to process "
    "input sequences in parallel. Each attention head computes query, key, and "
    "value projections from the input embeddings. The scaled dot-product "
    "attention score is computed as softmax(QK^T / sqrt(d_k)) V. "
    "Multi-head attention concatenates the outputs of h parallel attention "
    "heads and projects through a final linear layer. Layer normalization and "
    "residual connections stabilize training. The feed-forward network applies "
    "two linear transformations with a ReLU activation in between.\n\n"
)


def build_prompt(target_tokens: int) -> str:
    base = "Document the following code module. Return JSON with title, summary, nodes, edges.\n\n"
    filler_tokens = count_tokens(FILLER)
    repeats = max(1, (target_tokens - count_tokens(base)) // filler_tokens)
    return base + FILLER * repeats


def _get_token():
    creds, project = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token, project


def call_vertex(prompt: str, project: str, token: str) -> tuple[float, int]:
    import random
    url = (
        f"https://{REGION}-aiplatform.googleapis.com/v1/projects/{project}"
        f"/locations/{REGION}/publishers/google/models/{MODEL}:generateContent"
    )
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 512,
            "responseMimeType": "application/json",
        },
    }
    start = time.time()
    for attempt in range(4):
        try:
            r = http_requests.post(url, json=body, headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
            }, timeout=120)
            dur = time.time() - start
            if r.status_code in (429, 503):
                delay = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(delay)
                continue
            return dur, r.status_code
        except (http_requests.exceptions.ConnectionError, ConnectionResetError) as e:
            dur = time.time() - start
            if attempt < 3:
                delay = (2 ** attempt) + random.uniform(0, 1)
                time.sleep(delay)
                continue
            return dur, -1
    return time.time() - start, -2


async def test_concurrency(prompt_tokens: int, concurrency: int, project: str, token: str):
    prompt = build_prompt(prompt_tokens)
    actual_tokens = count_tokens(prompt)
    tasks = [asyncio.to_thread(call_vertex, prompt, project, token) for _ in range(concurrency)]
    wall_start = time.time()
    results = await asyncio.gather(*tasks)
    wall = time.time() - wall_start
    durations = [r[0] for r in results]
    errors = sum(1 for r in results if r[1] != 200)
    return {
        "tokens": actual_tokens,
        "n": concurrency,
        "wall": round(wall, 1),
        "mean": round(statistics.mean(durations), 1),
        "max": round(max(durations), 1),
        "min": round(min(durations), 1),
        "errors": errors,
    }


async def main():
    token, project = _get_token()
    print(f"Project: {project}  Model: {MODEL}  Region: {REGION}\n")

    print(f"{'tokens':>8}  {'n':>3}  {'wall':>6}  {'mean':>6}  {'min':>6}  {'max':>6}  {'err':>3}")
    print("-" * 55)

    for prompt_tokens in [5_000, 20_000, 50_000]:
        for n in [1, 4, 8]:
            token, _ = _get_token()
            r = await test_concurrency(prompt_tokens, n, project, token)
            print(f"{r['tokens']:>8}  {r['n']:>3}  {r['wall']:>5.1f}s  {r['mean']:>5.1f}s  "
                  f"{r['min']:>5.1f}s  {r['max']:>5.1f}s  {r['errors']:>3}")
        print()


if __name__ == "__main__":
    asyncio.run(main())
