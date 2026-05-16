#!/usr/bin/env python3
"""
Regenerate documentation for all demo viewer repositories from their GitHub URLs.
Runs the full `codewiki generate` pipeline (clone → analyze → LLM generation → sync).

Usage (from repository root):
  python benchmarking/regenerate_demo_repos.py
  python benchmarking/regenerate_demo_repos.py --only dspy langchain
  python benchmarking/regenerate_demo_repos.py --workers 4   # run up to 4 repos in parallel
  CODEWIKI_REGEN_WORKERS=4 python benchmarking/regenerate_demo_repos.py
  python benchmarking/regenerate_demo_repos.py --validate-only   # skip generation, just validate existing

Requires: gcloud auth application-default login  (ADC — no expiring API key)
  OR:      codewiki config set --api-key <key>
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))

from codewiki.src.be.validation import validate_docs  # noqa: E402


def _check_api_access() -> None:
    """
    Verify LLM API access before starting any generation work.

    Prefers Vertex AI + ADC (gcloud auth application-default login) which
    never needs manual renewal.  Falls back to the static API key stored in
    ~/.codewiki/config.json only when ADC is unavailable.

    Exits with a clear message if neither auth method works.
    """
    # --- Try ADC first ---
    try:
        import google.auth
        import google.auth.transport.requests
        creds, _ = google.auth.default(
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
        creds.refresh(google.auth.transport.requests.Request())
        if creds.token:
            import requests as _requests
            # generativelanguage.googleapis.com rejects cloud-platform tokens; use Vertex AI instead.
            proj = "applied-ai-practice00"
            resp = _requests.post(
                f"https://us-central1-aiplatform.googleapis.com/v1/projects/{proj}"
                "/locations/us-central1/publishers/google/models/gemini-2.5-flash:generateContent",
                json={"contents": [{"role": "user", "parts": [{"text": "ping"}]}], "generationConfig": {"maxOutputTokens": 3}},
                headers={"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json"},
                timeout=30,
            )
            if resp.status_code == 200:
                print("✓ API access OK (ADC / gcloud credentials — no expiry)", flush=True)
                return
            err = resp.json().get("error", {}).get("message", resp.text)
            print(f"⚠  ADC token present but Vertex AI returned {resp.status_code}: {err}", flush=True)
    except Exception as adc_err:
        print(f"⚠  ADC not available: {adc_err}", flush=True)

    # --- Fall back to static API key ---
    try:
        import json as _json
        cfg_file = Path.home() / ".codewiki" / "config.json"
        api_key = os.getenv("GEMINI_API_KEY") or os.getenv("LLM_API_KEY") or ""
        if not api_key and cfg_file.exists():
            api_key = _json.loads(cfg_file.read_text()).get("api_key", "")
        if api_key:
            import requests as _requests
            resp = _requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}",
                json={"contents": [{"parts": [{"text": "ping"}]}], "generationConfig": {"maxOutputTokens": 3}},
                timeout=30,
            )
            if resp.status_code == 200:
                print("✓ API access OK (static API key)", flush=True)
                return
            err = resp.json().get("error", {}).get("message", resp.text)
            print(f"\n✗ Static API key failed ({resp.status_code}): {err}", file=sys.stderr, flush=True)
    except Exception as key_err:
        print(f"\n✗ Static API key check failed: {key_err}", file=sys.stderr, flush=True)

    print(
        "\n✗ No working LLM API credentials found. Aborting.\n"
        "\nFix options:\n"
        "  1. gcloud auth application-default login   ← recommended (never expires)\n"
        "  2. codewiki config set --api-key <key>",
        file=sys.stderr,
        flush=True,
    )
    sys.exit(1)

REPOS = {
    "crewai": "https://github.com/crewAIInc/crewAI.git",
    "dspy": "https://github.com/stanfordnlp/dspy.git",
    "langchain": "https://github.com/langchain-ai/langchain.git",
    "ollama": "https://github.com/ollama/ollama.git",
    "pydantic-ai": "https://github.com/pydantic/pydantic-ai.git",
    "transformers": "https://github.com/huggingface/transformers.git",
}

DEMO_REPOS = REPO_ROOT / "demo" / "repos"
TMP_DIR = REPO_ROOT / ".tmp" / "demo_regen"


def clone_repo(name: str, url: str) -> Path:
    dest = TMP_DIR / name
    if dest.exists() and (dest / ".git").exists():
        _log(f"  [clone] {name}: already cloned, pulling latest…")
        subprocess.run(["git", "pull", "--ff-only"], cwd=dest, capture_output=True)
    else:
        dest.mkdir(parents=True, exist_ok=True)
        _log(f"  [clone] {name}: cloning {url}…")
        subprocess.run(
            ["git", "clone", "--depth", "1", url, str(dest)],
            check=True,
            capture_output=True,
        )
    return dest


def _find_codewiki_exe() -> str:
    """Locate the codewiki executable, preferring this repo's venv over global PATH."""
    import shutil
    # 1. Explicit override via env var
    if exe := os.environ.get("CODEWIKI_EXE"):
        return exe
    # 2. This repository's .venv (editable install — matches the code you are editing)
    venv_codewiki = REPO_ROOT / ".venv" / "bin" / "codewiki"
    if venv_codewiki.is_file():
        return str(venv_codewiki)
    # 3. `codewiki` on PATH (installed via pipx or pip install --user)
    if found := shutil.which("codewiki"):
        return found
    # 4. python -m codewiki using the current interpreter as a last resort
    return f"{sys.executable} -m codewiki"


def generate_docs(name: str, clone_path: Path) -> dict:
    _log(f"  [generate] {name}: running codewiki generate…")
    codewiki = _find_codewiki_exe()
    if " " in codewiki:
        # shell=True path: "python3 -m codewiki"
        cmd_str = (
            f"{codewiki} generate "
            f"--output docs --force --no-cache --demo-slug {name} --verbose"
        )
        use_shell = True
        cmd: list | str = cmd_str
    else:
        cmd = [codewiki, "generate", "--output", "docs", "--force",
               "--no-cache", "--demo-slug", name, "--verbose"]
        use_shell = False

    start = time.time()
    result = subprocess.run(
        cmd,
        shell=use_shell,
        cwd=str(clone_path),
        capture_output=True,
        text=True,
        timeout=int(os.environ.get("CODEWIKI_REGEN_TIMEOUT_SEC", str(4 * 3600))),
    )
    duration = time.time() - start
    docs_path = clone_path / "docs"
    return {
        "exit_code": result.returncode,
        "duration_seconds": round(duration, 1),
        "stdout_lines": len(result.stdout.split("\n")),
        "stderr_lines": len(result.stderr.split("\n")),
        "docs_exist": docs_path.is_dir(),
        "md_files": len(list(docs_path.glob("*.md"))) if docs_path.is_dir() else 0,
    }


def validate_repo(name: str) -> dict:
    docs_path = DEMO_REPOS / name
    if not docs_path.is_dir() or not (docs_path / "module_tree.json").exists():
        return {"validation_passed": False, "errors": -1, "warnings": -1, "reason": "no docs"}
    vr = validate_docs(docs_path)
    return {
        "validation_passed": vr.passed,
        "errors": len(vr.errors),
        "warnings": len(vr.warnings),
    }


_print_lock = threading.Lock()


def _log(msg: str) -> None:
    with _print_lock:
        print(msg, flush=True)


def run_one_repo(name: str, validate_only: bool) -> dict:
    """Clone (if needed), generate docs, validate. Safe to run in parallel (separate dirs per repo)."""
    _log(f"\n{'=' * 60}\n  {name}\n{'=' * 60}")
    gen_result: dict = {}
    if not validate_only:
        url = REPOS[name]
        try:
            clone_path = clone_repo(name, url)
            gen_result = generate_docs(name, clone_path)
            _log(
                f"  [generate] {name} exit={gen_result['exit_code']} "
                f"duration={gen_result['duration_seconds']}s "
                f"md_files={gen_result['md_files']}"
            )
        except Exception as e:
            gen_result = {"error": str(e)}
            _log(f"  [generate] {name} FAILED: {e}")

    val_result = validate_repo(name)
    _log(
        f"  [validate] {name} passed={val_result.get('validation_passed')} "
        f"errors={val_result.get('errors')} warnings={val_result.get('warnings')}"
    )
    return {"repo": name, "generation": gen_result, "validation": val_result}


def main() -> int:
    p = argparse.ArgumentParser(description="Regenerate docs for all demo viewer repos.")
    p.add_argument(
        "--only",
        nargs="*",
        default=None,
        help="Optional subset of repo names (e.g. dspy pydantic-ai).",
    )
    p.add_argument(
        "--validate-only",
        action="store_true",
        help="Skip generation, just validate existing demo/repos/ content.",
    )
    p.add_argument(
        "--workers",
        type=int,
        default=None,
        metavar="N",
        help="Run up to N repos in parallel (default: env CODEWIKI_REGEN_WORKERS or min(4, number of repos); use 1 for sequential).",
    )
    args = p.parse_args()

    if not args.validate_only:
        print("\n[prereq] Checking LLM API access before touching any repo…", flush=True)
        _check_api_access()

    names = sorted(REPOS.keys())
    if args.only:
        allow = set(args.only)
        names = [n for n in names if n in allow]
        missing = allow - set(names)
        if missing:
            print(f"Unknown --only entries: {sorted(missing)}", file=sys.stderr)
            return 1

    if args.workers is not None:
        workers = max(1, args.workers)
    else:
        w_env = os.environ.get("CODEWIKI_REGEN_WORKERS", "").strip()
        workers = max(1, int(w_env)) if w_env.isdigit() else min(4, max(1, len(names)))

    rows: list[dict] = []
    if workers == 1 or len(names) == 1:
        for name in names:
            rows.append(run_one_repo(name, args.validate_only))
    else:
        print(
            f"\n[parallel] Running {len(names)} repos with up to {workers} workers…",
            flush=True,
        )
        order_index = {n: i for i, n in enumerate(names)}
        with ThreadPoolExecutor(max_workers=workers) as ex:
            futures = {
                ex.submit(run_one_repo, name, args.validate_only): name for name in names
            }
            for fut in as_completed(futures):
                rows.append(fut.result())
        rows.sort(key=lambda r: order_index.get(r["repo"], 999))

    out = REPO_ROOT / "benchmarking" / "demo_repos_regeneration_report.json"
    out.write_text(json.dumps({"repos": rows}, indent=2), encoding="utf-8")
    print(f"\nWrote {out}", flush=True)

    failed = [r for r in rows if not r["validation"].get("validation_passed")]
    print(f"\nSummary: {len(rows) - len(failed)}/{len(rows)} passed validation", flush=True)
    if failed:
        print(f"Failed: {', '.join(r['repo'] for r in failed)}", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
