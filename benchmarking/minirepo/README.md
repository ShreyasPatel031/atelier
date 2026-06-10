# MiniPipe

Minimal Python repo for fast CodeWiki generation benchmarks (~60-90s serial vs ~20s parallel).

## Structure

- `core/` — models, config
- `io/` — readers, writers
- `processing/` — pipeline, transforms
- `api/` — HTTP server stub
- `utils/` — logging, metrics

## Benchmark usage

```bash
cd benchmarking/minirepo
rm -rf docs
time PYTHONPATH=/path/to/atelier python3 -m codewiki.cli.main generate --output docs --force -v
```

Five independent entry scripts (`run_core`, `run_io`, `run_processing`, `run_api`, `run_metrics`) produce multiple entry points for Stage 2 clustering. Expected: ~5 leaf modules + parents (depth-1 tree), ~2–3 min serial vs ~30–60s if Stage 3 parallelism works.
