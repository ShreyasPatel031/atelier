"""
Benchmark: Measure impact of output size and thinking on latency.

The previous benchmark showed 95K input processed in 2.7s with 200 output tokens.
But codewiki calls take 100-190s. The difference must be output generation + thinking.
"""
import asyncio
import os
import sys
import time
import json
import statistics

import dotenv
dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'), override=True)

import aiohttp

API_KEY = os.environ.get('GEMINI_API_KEY', '')
BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"


def make_doc_prompt(input_tokens: int) -> str:
    """Simulate a codewiki documentation prompt that demands long output."""
    base = (
        "You are a documentation generator. Generate comprehensive documentation "
        "for the following code module. Include:\n"
        "1. A detailed description (at least 500 words)\n"
        "2. A list of all components with descriptions\n"
        "3. Mermaid diagrams showing relationships\n"
        "4. Edge definitions between all components\n\n"
        "Code context:\n\n"
    )
    word = "def process_data(input_path: str, output_path: str, config: Config) -> Result: "
    repeats = max(1, (input_tokens * 4 // len(word)))
    return base + (word * repeats)[:input_tokens * 4]


async def timed_call(session: aiohttp.ClientSession, model: str, prompt: str,
                     max_output: int, thinking_budget: int = 0,
                     json_mode: bool = False) -> dict:
    url = f"{BASE_URL}/{model}:generateContent?key={API_KEY}"
    gen_config = {
        "temperature": 0.0,
        "maxOutputTokens": max_output,
        "thinkingConfig": {"thinkingBudget": thinking_budget},
    }
    if json_mode:
        gen_config["responseMimeType"] = "application/json"
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": gen_config,
    }
    t0 = time.time()
    try:
        async with session.post(url, json=body, timeout=aiohttp.ClientTimeout(total=600)) as r:
            elapsed = time.time() - t0
            data = await r.json()
            if r.status != 200:
                return {"error": data.get("error", {}).get("message", str(data))[:200], "elapsed": elapsed}
            um = data.get("usageMetadata", {})
            cands = data.get("candidates", [{}])
            parts = cands[0].get("content", {}).get("parts", []) if cands else []
            text = "".join(p.get("text", "") for p in parts)
            return {
                "elapsed": elapsed,
                "prompt_tokens": um.get("promptTokenCount", 0),
                "completion_tokens": um.get("candidatesTokenCount", 0),
                "thoughts_tokens": um.get("thoughtsTokenCount", 0),
                "total_tokens": um.get("totalTokenCount", 0),
                "output_chars": len(text),
            }
    except Exception as e:
        return {"error": str(e)[:200], "elapsed": time.time() - t0}


async def main():
    print("=" * 80)
    print("OUTPUT SIZE & THINKING BOTTLENECK BENCHMARK")
    print("=" * 80)

    prompt_20k = make_doc_prompt(20000)
    prompt_50k = make_doc_prompt(50000)

    async with aiohttp.ClientSession() as session:
        # Test 1: Same input, different max output tokens
        print("\n--- TEST 1: Impact of maxOutputTokens (20K input, no thinking) ---")
        for max_out in [200, 2000, 8000, 16000, 32000]:
            r = await timed_call(session, "gemini-2.5-flash", prompt_20k, max_out, thinking_budget=0)
            if "error" in r:
                print(f"  max_out={max_out:6d} | ERROR: {r['error'][:100]}")
            else:
                out_tps = r['completion_tokens'] / r['elapsed'] if r['elapsed'] > 0 else 0
                print(f"  max_out={max_out:6d} | {r['elapsed']:6.1f}s | "
                      f"in={r['prompt_tokens']:,} out={r['completion_tokens']:,} "
                      f"think={r['thoughts_tokens']:,} | out_tok/s={out_tps:.0f}")

        # Test 2: Same input, different thinking budgets
        print("\n--- TEST 2: Impact of thinking budget (20K input, 8K max output) ---")
        for think in [0, 1024, 4096, 8192, 16384]:
            r = await timed_call(session, "gemini-2.5-flash", prompt_20k, 8000, thinking_budget=think)
            if "error" in r:
                print(f"  think={think:6d} | ERROR: {r['error'][:100]}")
            else:
                total_gen = r['completion_tokens'] + r['thoughts_tokens']
                gen_tps = total_gen / r['elapsed'] if r['elapsed'] > 0 else 0
                print(f"  think={think:6d} | {r['elapsed']:6.1f}s | "
                      f"in={r['prompt_tokens']:,} out={r['completion_tokens']:,} "
                      f"think={r['thoughts_tokens']:,} | gen_tok/s={gen_tps:.0f}")

        # Test 3: Flash vs Flash-Lite with realistic output
        print("\n--- TEST 3: Flash vs Flash-Lite (20K input, 8K output, no thinking) ---")
        for model in ["gemini-2.5-flash", "gemini-2.5-flash-lite"]:
            r = await timed_call(session, model, prompt_20k, 8000, thinking_budget=0)
            if "error" in r:
                print(f"  {model:30s} | ERROR: {r['error'][:100]}")
            else:
                out_tps = r['completion_tokens'] / r['elapsed'] if r['elapsed'] > 0 else 0
                print(f"  {model:30s} | {r['elapsed']:6.1f}s | "
                      f"in={r['prompt_tokens']:,} out={r['completion_tokens']:,} "
                      f"think={r['thoughts_tokens']:,} | out_tok/s={out_tps:.0f}")

        # Test 4: JSON mode vs text mode
        print("\n--- TEST 4: JSON mode vs text mode (20K input, 8K output) ---")
        for jm, label in [(False, "text"), (True, "json")]:
            r = await timed_call(session, "gemini-2.5-flash", prompt_20k, 8000, thinking_budget=0, json_mode=jm)
            if "error" in r:
                print(f"  {label:6s} | ERROR: {r['error'][:100]}")
            else:
                out_tps = r['completion_tokens'] / r['elapsed'] if r['elapsed'] > 0 else 0
                print(f"  {label:6s} | {r['elapsed']:6.1f}s | "
                      f"in={r['prompt_tokens']:,} out={r['completion_tokens']:,} "
                      f"think={r['thoughts_tokens']:,} | out_tok/s={out_tps:.0f}")

        # Test 5: Concurrent realistic calls (8 calls, 20K input, 8K output)
        print("\n--- TEST 5: Concurrent realistic calls (20K input, 8K output, no thinking) ---")
        for model in ["gemini-2.5-flash", "gemini-2.5-flash-lite"]:
            for n in [1, 4, 8]:
                t0 = time.time()
                tasks = [timed_call(session, model, prompt_20k, 8000, thinking_budget=0) for _ in range(n)]
                results = await asyncio.gather(*tasks)
                wall = time.time() - t0
                ok = [r for r in results if "error" not in r]
                errs = [r for r in results if "error" in r]
                total_out = sum(r['completion_tokens'] for r in ok)
                total_in = sum(r['prompt_tokens'] for r in ok)
                avg_lat = statistics.mean(r['elapsed'] for r in ok) if ok else 0
                out_tpm = total_out / wall * 60 if wall > 0 else 0
                in_tpm = total_in / wall * 60 if wall > 0 else 0
                print(f"  {model:30s} n={n:2d} | wall={wall:6.1f}s | "
                      f"ok={len(ok)} err={len(errs)} | "
                      f"in_tpm={in_tpm:,.0f} out_tpm={out_tpm:,.0f} | "
                      f"avg_lat={avg_lat:.1f}s")

        # Test 6: The actual bottleneck — large input + realistic output
        print("\n--- TEST 6: Large input + realistic output (50K input, 8K output) ---")
        for model in ["gemini-2.5-flash", "gemini-2.5-flash-lite"]:
            r = await timed_call(session, model, prompt_50k, 8000, thinking_budget=0)
            if "error" in r:
                print(f"  {model:30s} | ERROR: {r['error'][:100]}")
            else:
                out_tps = r['completion_tokens'] / r['elapsed'] if r['elapsed'] > 0 else 0
                in_tps = r['prompt_tokens'] / r['elapsed'] if r['elapsed'] > 0 else 0
                print(f"  {model:30s} | {r['elapsed']:6.1f}s | "
                      f"in={r['prompt_tokens']:,} out={r['completion_tokens']:,} "
                      f"think={r['thoughts_tokens']:,} | in_tok/s={in_tps:.0f} out_tok/s={out_tps:.0f}")


if __name__ == "__main__":
    asyncio.run(main())
