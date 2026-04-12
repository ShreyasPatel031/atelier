import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: 'demo/playwright',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    timeout: 120_000,
    expect: { timeout: 15_000 },
    use: {
        ...devices['Desktop Chrome'],
        baseURL: 'http://127.0.0.1:9891',
        trace: 'on-first-retry',
    },
    webServer: {
        command: 'python3 -m http.server 9891',
        cwd: 'demo',
        url: 'http://127.0.0.1:9891/',
        // Must be false: a stale process on 9891 may serve another tree; tests then miss viewer changes.
        reuseExistingServer: false,
        timeout: 60_000,
    },
});
