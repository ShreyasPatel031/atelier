#!/usr/bin/env python3
"""Measure actual wall time: 1 big Gemini call vs N parallel small calls.

Uses a simple prompt repeated to hit target token counts, so we isolate
LLM call time from all process_module / tree-I/O overhead.
"""
import asyncio, time, sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from codewiki.src.be.llm_services import call_llm
from codewiki.src.be.utils import count_tokens
from codewiki.src.config import Config

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

SYSTEM = "You are a documentation generator. Return a JSON object with keys: title, summary, nodes, edges."

def build_prompt(target_tokens: int) -> str:
    """Build a prompt that's approximately target_tokens long."""
    base = "Document the following code module:\n\n"
    filler_tokens = count_tokens(FILLER)
    repeats = max(1, (target_tokens - count_tokens(base)) // filler_tokens)
    prompt = base + FILLER * repeats
    actual = count_tokens(prompt)
    print(f"  built prompt: target={target_tokens:,}, actual={actual:,} tokens")
    return prompt


def call_once(prompt: str, config: Config) -> float:
    """Single LLM call, returns wall time."""
    start = time.time()
    call_llm(prompt, config, system_prompt=SYSTEM, json_mode=True)
    return time.time() - start


async def call_parallel(prompts: list[str], config: Config) -> float:
    """N parallel LLM calls via asyncio.to_thread, returns wall time."""
    start = time.time()
    tasks = [asyncio.to_thread(call_llm, p, config, system_prompt=SYSTEM, json_mode=True) for p in prompts]
    await asyncio.gather(*tasks)
    return time.time() - start


async def main():
    from codewiki.src.config import (
        LLM_BASE_URL, LLM_API_KEY, MAIN_MODEL, CLUSTER_MODEL, OUTPUT_BASE_DIR,
        DEPENDENCY_GRAPHS_DIR, DOCS_DIR, MAX_DEPTH,
    )
    config = Config(
        repo_path="/tmp/dummy",
        output_dir=OUTPUT_BASE_DIR,
        dependency_graph_dir=os.path.join(OUTPUT_BASE_DIR, DEPENDENCY_GRAPHS_DIR),
        docs_dir=os.path.join(OUTPUT_BASE_DIR, DOCS_DIR),
        max_depth=MAX_DEPTH,
        llm_base_url=LLM_BASE_URL,
        llm_api_key=LLM_API_KEY,
        main_model=MAIN_MODEL,
        cluster_model=CLUSTER_MODEL,
    )
    print(f"Model: {config.main_model}\n")

    for total_tokens in [20_000, 50_000, 80_000]:
        print(f"\n{'='*60}")
        print(f"TARGET: {total_tokens:,} total tokens")
        print(f"{'='*60}")

        # Single call
        print(f"\n[1] Single call at {total_tokens:,} tokens:")
        big_prompt = build_prompt(total_tokens)
        t1 = call_once(big_prompt, config)
        print(f"  -> {t1:.1f}s")

        # Parallel: split into 4
        chunk_tokens = total_tokens // 4
        print(f"\n[2] 4 parallel calls at ~{chunk_tokens:,} tokens each:")
        small_prompts = [build_prompt(chunk_tokens) for _ in range(4)]
        t4 = await call_parallel(small_prompts, config)
        print(f"  -> {t4:.1f}s (wall clock for all 4)")

        # Parallel: split into 8
        chunk_tokens_8 = total_tokens // 8
        print(f"\n[3] 8 parallel calls at ~{chunk_tokens_8:,} tokens each:")
        small_prompts_8 = [build_prompt(chunk_tokens_8) for _ in range(8)]
        t8 = await call_parallel(small_prompts_8, config)
        print(f"  -> {t8:.1f}s (wall clock for all 8)")

        print(f"\n  Summary for {total_tokens:,} tokens:")
        print(f"    1 call:          {t1:.1f}s")
        print(f"    4 parallel:      {t4:.1f}s  ({t4/t1:.2f}x)")
        print(f"    8 parallel:      {t8:.1f}s  ({t8/t1:.2f}x)")


if __name__ == "__main__":
    asyncio.run(main())
