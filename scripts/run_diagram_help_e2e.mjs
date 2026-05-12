#!/usr/bin/env node
/**
 * Spawns diagram_ask_watcher (serves demo + POST viewer_state + SSE), runs Playwright for diagram-help-sdk.spec.ts, then kills the watcher.
 *
 * Requires CURSOR_API_KEY for a real SDK answer (set in shell or scripts/cursor-sdk.env — gitignored).
 * Usage: node scripts/run_diagram_help_e2e.mjs
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { applyLocalCursorSdkEnv } from './load_cursor_sdk_env.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
applyLocalCursorSdkEnv(ROOT);
if (!process.env.CURSOR_API_KEY?.trim()) {
    console.error(
        'CURSOR_API_KEY is not set. Add it once to scripts/cursor-sdk.env (copy from scripts/cursor-sdk.env.example) — that file is gitignored.\n' +
            'Or: export CURSOR_API_KEY="…" then re-run npm run test:e2e:diagram-help'
    );
    process.exit(1);
}
/** Must match `WATCHER_PORT` in demo/playwright/diagram-help-sdk.spec.ts */
const WATCHER_PORT = Number(process.env.DIAGRAM_E2E_PORT || 19878);

function waitForSse() {
    const deadline = Date.now() + 25_000;
    return (async () => {
        while (Date.now() < deadline) {
            try {
                const ac = new AbortController();
                const t = setTimeout(() => ac.abort(), 1500);
                const res = await fetch(`http://127.0.0.1:${WATCHER_PORT}/events`, { signal: ac.signal });
                clearTimeout(t);
                if (res.ok) return;
            } catch {
                await new Promise((r) => setTimeout(r, 200));
            }
        }
        throw new Error(`Watcher did not open SSE on ${WATCHER_PORT}`);
    })();
}

async function waitForWatcherStatic() {
    const deadline = Date.now() + 25_000;
    while (Date.now() < deadline) {
        try {
            const res = await fetch(`http://127.0.0.1:${WATCHER_PORT}/`, { signal: AbortSignal.timeout(1500) });
            if (res.ok) return;
        } catch {
            await new Promise((r) => setTimeout(r, 120));
        }
    }
    throw new Error(`Watcher did not serve demo on ${WATCHER_PORT}`);
}

function run(cmd, args, opts) {
    return new Promise((resolve, reject) => {
        const p = spawn(cmd, args, { stdio: 'inherit', ...opts });
        p.on('error', reject);
        p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
    });
}

const watcherEnv = { ...process.env };
watcherEnv.DIAGRAM_SSE_PORT = String(WATCHER_PORT);
watcherEnv.DIAGRAM_E2E_PORT = String(WATCHER_PORT);

const watcher = spawn(process.execPath, ['scripts/diagram_ask_watcher.mjs', '--repo', 'atelier-tdc8'], {
    cwd: ROOT,
    env: watcherEnv,
    stdio: 'ignore',
    detached: false,
});

try {
    await waitForSse();
    await waitForWatcherStatic();

    const playwrightEnv = { ...process.env };

    await run(
        process.execPath,
        [join(ROOT, 'node_modules/playwright/cli.js'), 'test', '-c', join(ROOT, 'playwright.diagram-help.config.ts'), '--reporter=line'],
        { cwd: ROOT, env: playwrightEnv }
    );
} finally {
    watcher.kill('SIGTERM');
    await new Promise((r) => setTimeout(r, 400));
    try {
        watcher.kill('SIGKILL');
    } catch {
        /* ignore */
    }
}
