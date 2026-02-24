# Benchmarking

Scripts and results for benchmarking CodeWiki documentation generation.

## Layout

- **`repos/`** – Clone target for benchmark repos. Scripts clone here when running. Start empty; populated by `benchmark_repos.py`, `run_benchmark.py`, `run_benchmark_tracked.py`, `benchmark_timing.py`.
- **`*.py`** – Benchmark/analysis scripts (see below).
- **`*.sh`** – Shell wrappers for parallel/sequential runs.
- **`*.json`** – Result outputs (e.g. `benchmark_results.json`, `benchmark_timing_results.json`, `comprehensive_analysis.json`).

## Scripts

| Script | Purpose |
|--------|---------|
| `benchmark_repos.py` | Clone 5 repos, run `codewiki generate --output docs`, save timing/results to `benchmark_results.json`. |
| `benchmark_timing.py` | Time doc generation across multiple repos (Python/Go/TS), write `benchmark_timing_results.json`. |
| `run_benchmark.py` | Run generation on 5 repos, measure diagram coverage, report to stdout. |
| `run_benchmark_tracked.py` | Full benchmark with error tracking, validation, and `benchmark_results_tracked.json`. |
| `analyze_repos.py` | Analyze `repos/<name>/docs` (module tree, title/description/diagram coverage). |
| `comprehensive_analysis.py` | Cross-analyze demo repos + `repos/`, load benchmark data, print report and write `comprehensive_analysis.json`. |
| `quick_test.py` | Quick node-limit test against `repos/kubecost`. |
| `test_node_limits.py` | Sweep output token limits against `repos/kubecost` to find breaking point. |

## Shell scripts

- **`run_benchmark.sh`** – Sequential benchmark of 5 repos, run from repo root or `benchmarking/`.
- **`quick_bench.sh`** – Parallel run of 5 repos.

## Running

From repo root:

```bash
# Ensure venv is active
source .venv/bin/activate

# Run a benchmark (clones into benchmarking/repos/ if needed)
python benchmarking/run_benchmark.py
# or
./benchmarking/run_benchmark.sh
```

Repos are stored under `benchmarking/repos/`; no separate `fresh_repos/` or `test_repos/` are used.
