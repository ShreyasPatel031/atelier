# Generation gate evidence logs

Successful runs of `scripts/verify_generation.sh` write timestamped logs here, e.g.:

- `minirepo_<UTC>.log` — must end with `VERIFY_GENERATION_OK`
- `dspy_<UTC>.log` — same (requires a clone path as the second script argument)

**Merge / release:** run the gate tests with credentials configured (`~/.codewiki/config.json` or env vars), then commit the new logs:

```bash
scripts/verify_generation.sh tests/fixtures/minirepo
scripts/verify_generation.sh demo/repos/dspy /path/to/dspy-clone

python3 -m pytest tests/test_generation_gate.py \
  tests/test_no_repair_apis.py::test_gated_sources_have_fresh_minirepo_evidence \
  -m generation_gate --override-ini addopts=-v
```

Default `pytest` excludes `@pytest.mark.generation_gate` (see `pyproject.toml`).
