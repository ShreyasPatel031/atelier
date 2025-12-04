import { defineConfig, devices } from '@playwright/test';

// Dynamic port configuration
const BASE_PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${BASE_PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 8000, // 8 seconds max per test
  expect: {
    timeout: 2000 // 2 seconds for individual expectations
  },
  fullyParallel: true, // Enable parallel execution across projects
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for faster feedback
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    // Canvas Comprehensive Tests - 5 categories that can run in parallel
    {
      name: 'canvas-core-interactions',
      testMatch: '**/canvas-comprehensive/core-interactions/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      workers: 3, // Run tests in parallel (3 workers for faster execution)
    },
    {
      name: 'canvas-layer-sync',
      testMatch: '**/canvas-comprehensive/layer-sync/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      workers: 1,
    },
    {
      name: 'canvas-persistence',
      testMatch: '**/canvas-comprehensive/persistence/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      workers: 1,
    },
    {
      name: 'canvas-architecture',
      testMatch: '**/canvas-comprehensive/architecture/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      workers: 1,
    },
    {
      name: 'canvas-drag',
      testMatch: '**/canvas-comprehensive/drag/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
      workers: 1,
    },
    // Edge Routing Tests - can run in parallel with canvas tests
    {
      name: 'edge-routing',
      testMatch: '**/canvas-comprehensive/edge-routing/**/*.test.ts',
      use: { ...devices['Desktop Chrome'] },
      workers: 10, // Run tests in parallel for faster execution
    },
    // Other standalone tests
    {
      name: 'other-tests',
      testMatch: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '!**/canvas-comprehensive/**/*',
        '!**/actual-canvas-test.test.ts', // Skip the interfering test
      ],
      use: { ...devices['Desktop Chrome'] },
      workers: 1,
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: BASE_PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  }
});
