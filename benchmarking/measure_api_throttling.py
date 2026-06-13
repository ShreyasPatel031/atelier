#!/usr/bin/env python3
"""Measure Gemini API throttling: per-call latency under different concurrency levels.

Tests:
1. Sequential baseline (1 call at a time)
2. Increasing concurrency (2, 4, 8, 16)
3. Multi-region (us-central1 vs us-east4 vs europe-west1)
4. API key vs Vertex AI endpoint differences
"""
import asyncio, time, sys, os, json, statistics

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import google.auth
import google.auth.transport.requests

PROMPT = (
    "Document the following code module. Return a JSON object with keys: "
    "title (string), summary (string), nodes (array of {id, label}), edges (array of {source, target}).\n\n"
    "The transformer architecture uses self-attention mechanisms to process "
    "input sequences in parallel. Each attention head computes query, key, and "
    "value projections from the input embeddings.\n" * 30
)

MODEL = "gemini-2.5-flash"
REGIONS = ["us-central1", "us-east4", "europe-west1", "us-west1"]


def _get_bearer_token():
    creds, project = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token, project


def call_vertex(region: str, project: str, token: str) -> tuple[float, int]:
    """Single Vertex AI call. Returns (duration_seconds, status_code)."""
    import requests
    url = (
        f"https://{region}-aiplatform.googleapis.com/v1/projects/{project}"
        f"/locations/{region}/publishers/google/models/{MODEL}:generateContent"
    )
    body = {
        "contents": [{"role": "user", "parts": [{"text": PROMPT}]}],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": 256,
            "responseMimeType": "application/json",
        },
    }
    start = time.time()
    r = requests.post(url, json=body, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }, timeout=120)
    dur = time.time() - start
    return dur, r.status_code


async def measure_concurrency(region: str, project: str, token: str, n: int) -> dict:
    """Fire n calls in parallel, return per-call timings."""
    tasks = [asyncio.to_thread(call_vertex, region, project, token) for _ in range(n)]
    wall_start = time.time()
    results = await asyncio.gather(*tasks)
    wall = time.time() - wall_start
    durations = [r[0] for r in results]
    statuses = [r[1] for r in results]
    errors = sum(1 for s in statuses if s != 200)
    return {
        "concurrency": n,
        "region": region,
        "wall_time": round(wall, 2),
        "per_call_mean": round(statistics.mean(durations), 2),
        "per_call_min": round(min(durations), 2),
        "per_call_max": round(max(durations), 2),
        "errors": errors,
        "error_codes": [s for s in statuses if s != 200],
    }


async def main():
    token, project = _get_bearer_token()
    print(f"Project: {project}")
    print(f"Model: {MODEL}")
    print(f"Prompt tokens: ~{len(PROMPT.split()) * 4 // 3}")
    print()

    all_results = []

    # Experiment 1: Concurrency scaling on us-central1
    print("=" * 60)
    print("EXPERIMENT 1: Concurrency scaling (us-central1)")
    print("=" * 60)
    for n in [1, 2, 4, 8, 16]:
        # refresh token if needed
        token, _ = _get_bearer_token()
        r = await measure_concurrency("us-central1", project, token, n)
        all_results.append(r)
        print(f"  n={n:2d}  wall={r['wall_time']:6.2f}s  "
              f"per_call: min={r['per_call_min']:.2f}s mean={r['per_call_mean']:.2f}s max={r['per_call_max']:.2f}s  "
              f"errors={r['errors']} {r['error_codes']}")

    # Experiment 2: Multi-region (4 concurrent calls)
    print()
    print("=" * 60)
    print("EXPERIMENT 2: Multi-region comparison (4 concurrent calls)")
    print("=" * 60)
    for region in REGIONS:
        token, _ = _get_bearer_token()
        try:
            r = await measure_concurrency(region, project, token, 4)
            all_results.append(r)
            print(f"  {region:20s}  wall={r['wall_time']:6.2f}s  "
                  f"per_call: min={r['per_call_min']:.2f}s mean={r['per_call_mean']:.2f}s max={r['per_call_max']:.2f}s  "
                  f"errors={r['errors']} {r['error_codes']}")
        except Exception as e:
            print(f"  {region:20s}  FAILED: {e}")

    # Experiment 3: Multi-region scatter (1 call per region, all parallel)
    print()
    print("=" * 60)
    print("EXPERIMENT 3: Scatter across regions (1 per region, all parallel)")
    print("=" * 60)
    token, _ = _get_bearer_token()
    tasks = [asyncio.to_thread(call_vertex, region, project, token) for region in REGIONS]
    wall_start = time.time()
    results = await asyncio.gather(*tasks, return_exceptions=True)
    wall = time.time() - wall_start
    for region, result in zip(REGIONS, results):
        if isinstance(result, Exception):
            print(f"  {region:20s}  FAILED: {result}")
        else:
            dur, status = result
            print(f"  {region:20s}  {dur:.2f}s  status={status}")
    print(f"  Total wall time: {wall:.2f}s")

    # Experiment 4: Round-robin across regions (8 calls, 2 per region)
    print()
    print("=" * 60)
    print("EXPERIMENT 4: Round-robin 8 calls across 4 regions")
    print("=" * 60)
    token, _ = _get_bearer_token()
    rr_regions = (REGIONS * 3)[:8]
    tasks = [asyncio.to_thread(call_vertex, reg, project, token) for reg in rr_regions]
    wall_start = time.time()
    results = await asyncio.gather(*tasks, return_exceptions=True)
    wall = time.time() - wall_start
    durations = []
    for reg, result in zip(rr_regions, results):
        if isinstance(result, Exception):
            print(f"  {reg:20s}  FAILED: {result}")
        else:
            dur, status = result
            durations.append(dur)
            print(f"  {reg:20s}  {dur:.2f}s  status={status}")
    if durations:
        print(f"  Wall: {wall:.2f}s  Mean per-call: {statistics.mean(durations):.2f}s  "
              f"Max: {max(durations):.2f}s")

    # Compare: 8 calls to 1 region vs 8 calls round-robin
    print()
    exp1_8 = next((r for r in all_results if r['concurrency'] == 8 and r['region'] == 'us-central1'), None)
    if exp1_8 and durations:
        print("COMPARISON: 8 calls to us-central1 vs 8 calls round-robin across 4 regions")
        print(f"  Single region:  wall={exp1_8['wall_time']:.2f}s  per_call_mean={exp1_8['per_call_mean']:.2f}s")
        print(f"  Round-robin:    wall={wall:.2f}s  per_call_mean={statistics.mean(durations):.2f}s")

    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
