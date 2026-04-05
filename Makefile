# CodeWiki — https://github.com/crewaiinc/crewai style repos need keys + time; see tests/ui/test_web_live.py
PYTHON ?= python
REPO_ROOT := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

.PHONY: test test-running test-ui test-unit test-big-repos install-browser

# Real Chromium UI E2E: same page as `python codewiki/run_web_app.py` (same FastAPI app).
# By default starts a **separate** server on a random port. To hit **your** running UI:
#   export E2E_BASE_URL=http://127.0.0.1:8000
#   make test
#
# Requires: keys in .env (GEMINI / OPENAI / LLM) — loaded automatically.
# Optional: E2E_REPO_URL=...  E2E_UI_TIMEOUT_MS=...  E2E_UI_HEADED=1
# Excludes tests/ui/test_big_repos.py (long matrix); use ``make test-big-repos`` for that.
test: install-browser
	cd "$(REPO_ROOT)" && $(PYTHON) -m pytest tests/ui/ --ignore=tests/ui/test_big_repos.py -v -s --tb=short

# Use this when you already ran: python codewiki/run_web_app.py  (default port 8000)
test-running: install-browser
	cd "$(REPO_ROOT)" && E2E_BASE_URL=http://127.0.0.1:8000 $(PYTHON) -m pytest tests/ui/ --ignore=tests/ui/test_big_repos.py -v -s --tb=short

install-browser:
	cd "$(REPO_ROOT)" && $(PYTHON) -m playwright install chromium

# Large-repo UI matrix (crewai, dspy, ollama, transformers, langchain, pydantic-ai).
# Restart ``run_web_app.py`` after pulling (needs GET /api/jobs for idle wait between cases).
# Optional: E2E_BASE_URL=http://127.0.0.1:8000 to use your already-running server.
test-big-repos: install-browser
	cd "$(REPO_ROOT)" && \
	E2E_BIG_REPOS=1 \
	E2E_UI_TIMEOUT_MS=$${E2E_UI_TIMEOUT_MS:-14400000} \
	E2E_WAIT_IDLE_S=$${E2E_WAIT_IDLE_S:-7200} \
	CODEWIKI_CLONE_TIMEOUT=$${CODEWIKI_CLONE_TIMEOUT:-7200} \
	$(PYTHON) -m pytest tests/ui/test_big_repos.py -v -s --tb=short

# Fast tests only (mocked HTTP, no browser, no live server).
test-unit:
	cd "$(REPO_ROOT)" && $(PYTHON) -m pytest tests/ --ignore=tests/ui -v
