import { defineConfig, devices } from '@playwright/test';

/** Must match default port in scripts/run_diagram_help_e2e.mjs and WATCHER_PORT in diagram-help-sdk.spec.ts */
const DEMO_BASE = 'http://127.0.0.1:19878';

export default defineConfig({
    testDir: 'demo/playwright',
    testMatch: /diagram-help-sdk\.spec\.ts/,
    fullyParallel: true,
    workers: 1,
    timeout: 120_000,
    expect: { timeout: 15_000 },
    use: {
        ...devices['Desktop Chrome'],
        baseURL: DEMO_BASE,
        trace: 'on-first-retry',
    },
});
