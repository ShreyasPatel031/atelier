import { test, expect } from '@playwright/test';

/**
 * Demo URL is http://127.0.0.1:19878 (diagram_ask_watcher serves static demo). Keep port aligned with
 * scripts/run_diagram_help_e2e.mjs and playwright.diagram-help.config.ts.
 */

/**
 * Runner: `npm run test:e2e:diagram-help` → starts watcher (serves demo on :19878, no CURSOR_API_KEY).
 */
test('diagram ? help — same-origin POST + answer clears waiting state', async ({ page }) => {
    await page.goto('/?repo=atelier-tdc8');
    await page.waitForFunction(
        () => typeof (window as unknown as { atelierRfAskBriefExplanation?: unknown }).atelierRfAskBriefExplanation === 'function',
        null,
        { timeout: 120_000 }
    );
    await page.evaluate(async () => {
        const w = window as unknown as {
            atelierRfAskBriefExplanation?: (ctx: unknown) => Promise<unknown>;
        };
        await w.atelierRfAskBriefExplanation!({ nodeId: 'cli', label: 'CLI', kind: 'node' });
    });
    await expect(page.locator('.chat-message.loading')).toHaveCount(0, { timeout: 90_000 });
    const lastAssistant = page.locator('.chat-message.assistant').last();
    await expect(lastAssistant).toBeVisible();
    await expect(lastAssistant).not.toHaveText(/Waiting for answer/i);
});
