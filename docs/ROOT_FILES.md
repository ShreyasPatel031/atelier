# Root directory files

Quick reference for files at the repository root (excluding `codewiki/`, `demo/`, `benchmarking/`, `docs/`, `.git`, etc.).

| File | Purpose |
|------|---------|
| **package.json** | Dev dependency: `@playwright/test` for Playwright tests. |
| **vercel.json** | Vercel deployment config: `outputDirectory: "demo"`, routes for `/repos/(.*)` and catch-all. |
| **pyproject.toml** | Python project config (package name, deps, entry points for `codewiki` CLI). |
| **requirements.txt** | Pip-installable dependencies. |
| **.env** | Local env (e.g. API keys). Not committed. |
| **.gitignore** | Git ignore rules. |
| **.vercelignore** | Vercel ignore rules. |

All project documentation (`.md` files) lives under **`docs/`**. Benchmark scripts and results are under **`benchmarking/`**; see `../benchmarking/README.md`.
