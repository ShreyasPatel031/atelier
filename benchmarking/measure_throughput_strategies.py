"""
Benchmark: Measure actual TPM throughput at Tier 3 and test alternative strategies.

Tests:
1. Baseline single-call latency for different prompt sizes
2. Concurrent throughput saturation (what TPM do we actually achieve?)
3. gemini-2.5-flash-lite — faster model, same tier
4. Context caching — send shared system prompt once, reuse across calls
5. gemini-2.0-flash — older but potentially faster
"""
import asyncio
import os
import sys
import time
import json
import random
import statistics

import dotenv
dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'), override=True)

import requests
import aiohttp

API_KEY = os.environ.get('GEMINI_API_KEY', '')
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


def make_prompt(token_count: int) -> str:
    """Generate a prompt of approximately token_count tokens."""
    base = "Summarize the following code documentation:\n\n"
    word = "function_name parameter_type return_value class_definition module_import "
    repeats = max(1, (token_count * 4 // len(word)))
    return base + (word * repeats)[:token_count * 4]


def sync_call(model: str, prompt: str, max_output: int = 200) -> dict:
    """Single synchronous API call. Returns timing and token info."""
    url = f"{BASE_URL}/{model}:generateContent?key={API_KEY}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": max_output,
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }
    t0 = time.time()
    r = requests.post(url, json=body, timeout=300)
    elapsed = time.time() - t0
    if r.status_code != 200:
        return {"error": r.json().get("error", {}).get("message", r.text)[:200], "elapsed": elapsed}
    data = r.json()
    um = data.get("usageMetadata", {})
    return {
        "elapsed": elapsed,
        "prompt_tokens": um.get("promptTokenCount", 0),
        "completion_tokens": um.get("candidatesTokenCount", 0),
        "thoughts_tokens": um.get("thoughtsTokenCount", 0),
        "total_tokens": um.get("totalTokenCount", 0),
    }


async def async_call(session: aiohttp.ClientSession, model: str, prompt: str,
                     max_output: int = 200) -> dict:
    """Single async API call."""
    url = f"{BASE_URL}/{model}:generateContent?key={API_KEY}"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.0,
            "maxOutputTokens": max_output,
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }
    t0 = time.time()
    try:
        async with session.post(url, json=body, timeout=aiohttp.ClientTimeout(total=300)) as r:
            elapsed = time.time() - t0
            data = await r.json()
            if r.status != 200:
                return {"error": data.get("error", {}).get("message", str(data))[:200], "elapsed": elapsed}
            um = data.get("usageMetadata", {})
            return {
                "elapsed": elapsed,
                "prompt_tokens": um.get("promptTokenCount", 0),
                "completion_tokens": um.get("candidatesTokenCount", 0),
                "thoughts_tokens": um.get("thoughtsTokenCount", 0),
                "total_tokens": um.get("totalTokenCount", 0),
            }
    except Exception as e:
        return {"error": str(e)[:200], "elapsed": time.time() - t0}


async def run_concurrent(model: str, prompt: str, n: int, max_output: int = 200) -> dict:
    """Run n concurrent calls and measure wall time + throughput."""
    async with aiohttp.ClientSession() as session:
        t0 = time.time()
        tasks = [async_call(session, model, prompt, max_output) for _ in range(n)]
        results = await asyncio.gather(*tasks)
        wall_time = time.time() - t0

    errors = [r for r in results if "error" in r]
    successes = [r for r in results if "error" not in r]
    total_input = sum(r["prompt_tokens"] for r in successes)
    total_output = sum(r["completion_tokens"] for r in successes)
    total_all = sum(r["total_tokens"] for r in successes)
    latencies = [r["elapsed"] for r in successes]

    return {
        "model": model,
        "concurrency": n,
        "wall_time": wall_time,
        "successes": len(successes),
        "errors": len(errors),
        "error_msgs": [r["error"] for r in errors][:3],
        "total_input_tokens": total_input,
        "total_output_tokens": total_output,
        "total_tokens": total_all,
        "effective_input_tpm": total_input / wall_time * 60 if wall_time > 0 else 0,
        "effective_total_tpm": total_all / wall_time * 60 if wall_time > 0 else 0,
        "avg_latency": statistics.mean(latencies) if latencies else 0,
        "p50_latency": statistics.median(latencies) if latencies else 0,
        "max_latency": max(latencies) if latencies else 0,
    }


async def test_context_caching(prompt_size: int) -> dict:
    """Test if using cachedContent reduces latency."""
    prompt = make_prompt(prompt_size)

    # First: create a cached content object with a system-level context
    system_context = make_prompt(30000)  # 30K token shared context
    cache_url = f"https://generativelanguage.googleapis.com/v1beta/cachedContents?key={API_KEY}"
    cache_body = {
        "model": f"models/gemini-2.5-flash",
        "contents": [{"parts": [{"text": system_context}], "role": "user"}],
        "ttl": "300s",
    }
    t0 = time.time()
    r = requests.post(cache_url, json=cache_body, timeout=120)
    cache_create_time = time.time() - t0

    if r.status_code != 200:
        return {"error": f"Cache creation failed: {r.status_code} {r.text[:200]}", "cache_create_time": cache_create_time}

    cache_data = r.json()
    cache_name = cache_data.get("name", "")
    cached_token_count = cache_data.get("usageMetadata", {}).get("totalTokenCount", 0)

    # Now call with cached content
    gen_url = f"{BASE_URL}/gemini-2.5-flash:generateContent?key={API_KEY}"
    cached_body = {
        "cachedContent": cache_name,
        "contents": [{"parts": [{"text": f"Now process this additional context:\n{prompt}"}], "role": "user"}],
        "generationConfig": {"temperature": 0.0, "maxOutputTokens": 200, "thinkingConfig": {"thinkingBudget": 0}},
    }

    t0 = time.time()
    r2 = requests.post(gen_url, json=cached_body, timeout=300)
    cached_latency = time.time() - t0

    # Compare with non-cached call (full context)
    full_prompt = system_context + "\n\n" + prompt
    t0 = time.time()
    non_cached = sync_call("gemini-2.5-flash", full_prompt, max_output=200)
    non_cached_latency = time.time() - t0

    result = {
        "cache_create_time": cache_create_time,
        "cached_tokens": cached_token_count,
        "cached_call_latency": cached_latency,
        "non_cached_call_latency": non_cached.get("elapsed", non_cached_latency),
        "speedup": non_cached.get("elapsed", non_cached_latency) / cached_latency if cached_latency > 0 else 0,
    }

    if r2.status_code == 200:
        um = r2.json().get("usageMetadata", {})
        result["cached_prompt_tokens"] = um.get("promptTokenCount", 0)
        result["cached_cached_tokens"] = um.get("cachedContentTokenCount", 0)
    else:
        result["cache_call_error"] = r2.text[:300]

    # Cleanup cache
    try:
        requests.delete(f"https://generativelanguage.googleapis.com/v1beta/{cache_name}?key={API_KEY}", timeout=30)
    except Exception:
        pass

    return result


async def main():
    print("=" * 70)
    print("GEMINI THROUGHPUT STRATEGY BENCHMARK")
    print(f"API Key: {API_KEY[:15]}... | Tier: 3")
    print("=" * 70)

    models = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"]
    prompt_sizes = [5000, 20000, 50000]
    concurrency_levels = [1, 4, 8, 16]

    all_results = {}

    # --- Test 1: Single-call latency by model and prompt size ---
    print("\n--- TEST 1: Single-call latency (per model, per prompt size) ---")
    for model in models:
        for size in prompt_sizes:
            prompt = make_prompt(size)
            result = sync_call(model, prompt)
            key = f"{model}_{size}tok"
            all_results[key] = result
            if "error" in result:
                print(f"  {model:30s} | {size:6d} tok | ERROR: {result['error'][:80]}")
            else:
                tps = result['prompt_tokens'] / result['elapsed'] if result['elapsed'] > 0 else 0
                print(f"  {model:30s} | {size:6d} tok | {result['elapsed']:6.1f}s | "
                      f"in={result['prompt_tokens']:,} out={result['completion_tokens']:,} "
                      f"think={result['thoughts_tokens']:,} | {tps:.0f} tok/s")

    # --- Test 2: Concurrent throughput ---
    print("\n--- TEST 2: Concurrent throughput (gemini-2.5-flash, 20K prompt) ---")
    prompt_20k = make_prompt(20000)
    for n in concurrency_levels:
        result = await run_concurrent("gemini-2.5-flash", prompt_20k, n)
        key = f"concurrent_{n}"
        all_results[key] = result
        print(f"  n={n:2d} | wall={result['wall_time']:6.1f}s | "
              f"ok={result['successes']} err={result['errors']} | "
              f"input_tpm={result['effective_input_tpm']:,.0f} | "
              f"total_tpm={result['effective_total_tpm']:,.0f} | "
              f"avg_lat={result['avg_latency']:.1f}s max={result['max_latency']:.1f}s")
        if result['error_msgs']:
            for msg in result['error_msgs']:
                print(f"       ERROR: {msg[:100]}")

    # --- Test 3: Flash-Lite concurrent throughput ---
    print("\n--- TEST 3: Flash-Lite concurrent throughput (20K prompt) ---")
    for n in [1, 4, 8, 16]:
        result = await run_concurrent("gemini-2.5-flash-lite", prompt_20k, n)
        key = f"flash_lite_concurrent_{n}"
        all_results[key] = result
        print(f"  n={n:2d} | wall={result['wall_time']:6.1f}s | "
              f"ok={result['successes']} err={result['errors']} | "
              f"input_tpm={result['effective_input_tpm']:,.0f} | "
              f"total_tpm={result['effective_total_tpm']:,.0f} | "
              f"avg_lat={result['avg_latency']:.1f}s max={result['max_latency']:.1f}s")

    # --- Test 4: Flash 2.0 concurrent throughput ---
    print("\n--- TEST 4: Flash 2.0 concurrent throughput (20K prompt) ---")
    for n in [1, 4, 8]:
        result = await run_concurrent("gemini-2.0-flash", prompt_20k, n)
        key = f"flash_2_concurrent_{n}"
        all_results[key] = result
        print(f"  n={n:2d} | wall={result['wall_time']:6.1f}s | "
              f"ok={result['successes']} err={result['errors']} | "
              f"input_tpm={result['effective_input_tpm']:,.0f} | "
              f"total_tpm={result['effective_total_tpm']:,.0f} | "
              f"avg_lat={result['avg_latency']:.1f}s max={result['max_latency']:.1f}s")

    # --- Test 5: Context caching ---
    print("\n--- TEST 5: Context caching (30K cached + 5K new) ---")
    cache_result = await test_context_caching(5000)
    all_results["context_caching"] = cache_result
    if "error" in cache_result:
        print(f"  ERROR: {cache_result['error']}")
    else:
        print(f"  Cache creation: {cache_result['cache_create_time']:.1f}s ({cache_result['cached_tokens']:,} tokens)")
        print(f"  Cached call:     {cache_result['cached_call_latency']:.1f}s")
        print(f"  Non-cached call: {cache_result['non_cached_call_latency']:.1f}s")
        print(f"  Speedup:         {cache_result['speedup']:.2f}x")
        if 'cached_prompt_tokens' in cache_result:
            print(f"  Billed tokens:   {cache_result['cached_prompt_tokens']:,} (cached: {cache_result.get('cached_cached_tokens', 0):,})")

    # --- Test 6: Large prompt (95K) single-call — the actual bottleneck ---
    print("\n--- TEST 6: Large prompt single-call (the actual bottleneck) ---")
    for model in models:
        prompt_95k = make_prompt(95000)
        result = sync_call(model, prompt_95k)
        key = f"large_{model}"
        all_results[key] = result
        if "error" in result:
            print(f"  {model:30s} | 95K tok | ERROR: {result['error'][:100]}")
        else:
            tps = result['prompt_tokens'] / result['elapsed'] if result['elapsed'] > 0 else 0
            print(f"  {model:30s} | 95K tok | {result['elapsed']:6.1f}s | "
                  f"in={result['prompt_tokens']:,} out={result['completion_tokens']:,} | {tps:.0f} tok/s")

    # Save results
    out_path = os.path.join(os.path.dirname(__file__), "throughput_strategy_results.json")
    with open(out_path, "w") as f:
        json.dump(all_results, f, indent=2, default=str)
    print(f"\nResults saved to {out_path}")


if __name__ == "__main__":
    asyncio.run(main())
