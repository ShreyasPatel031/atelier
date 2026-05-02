import { test, expect } from '@playwright/test';

/**
 * Uses playwright/edge-harness.html — tiny Mermaid graph only (no repo/module tree fetch).
 * Validates real pointer hover via locator.hover() and computed stroke-width change.
 */
test.describe('Mermaid diagram edge hover', () => {
    test('widens stroke on the visible edge path after hover', async ({ page }) => {
        await page.goto('/playwright/edge-harness.html');

        await expect.poll(() => page.evaluate(() => window.__edgeHarnessReady === true), {
            timeout: 30_000,
            message: 'harness finished rendering',
        }).toBe(true);

        const visiblePath = page
            .locator(
                '#mermaid-diagram svg g.edgePaths > path:not(.edge-hit-area), #mermaid-diagram svg g.edgePath path:not(.edge-hit-area)'
            )
            .first();

        // Stroke-only SVG paths are often not Playwright-“visible”; attached is enough for real hover.
        await visiblePath.waitFor({ state: 'attached', timeout: 10_000 });
        await expect(visiblePath).toBeAttached();

        const hitPath = page
            .locator(
                '#mermaid-diagram svg g.edgePaths > path.edge-hit-area, #mermaid-diagram svg g.edgePath path.edge-hit-area'
            )
            .first();
        await hitPath.waitFor({ state: 'attached', timeout: 10_000 });

        const widthBefore = await visiblePath.evaluate((el) => {
            const w = parseFloat(getComputedStyle(el).strokeWidth);
            return Number.isFinite(w) ? w : 0;
        });

        // Hover the wide hit-test clone; thin strokes often miss in automation (matches real fat-finger hit).
        await hitPath.hover({ force: true });
        await page.waitForTimeout(100);

        const widthAfter = await visiblePath.evaluate((el) => {
            const w = parseFloat(getComputedStyle(el).strokeWidth);
            return Number.isFinite(w) ? w : 0;
        });

        expect(
            widthAfter,
            `hover should increase stroke (before=${widthBefore}, after=${widthAfter})`
        ).toBeGreaterThan(widthBefore);
    });
});
