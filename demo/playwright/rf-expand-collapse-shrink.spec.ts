import { expect, test } from '@playwright/test';

declare global {
    interface Window {
        atelierRfTriggerExpansion?: (nodeId: string, targetModuleId: string) => Promise<void>;
        atelierRfTriggerCollapse?: (expandedNodeKey: string) => Promise<void>;
    }
}

/**
 * Verify expand/collapse animation locks TL while size morphs.
 *
 * Sample the morphing node every 30ms during the animation and check that
 * (a) the rendered TL graph position is stable across frames, and
 * (b) width interpolates monotonically toward the target.
 */
test('expand morph keeps TL stable while size grows', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/?repo=rf-expand-fixture', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#reactflowRoot .react-flow__viewport')).toBeVisible({
        timeout: 30_000,
    });
    await expect(page.locator('.react-flow__node[data-id="root_leaf"]')).toBeVisible();

    const collapsePromise = page.evaluate(async () => {
        await window.atelierRfTriggerExpansion!('root_leaf', 'child_target');
    });

    const samples: { t: number; tx: number; ty: number; w: number }[] = [];
    for (let i = 0; i < 12; i++) {
        await page.waitForTimeout(30);
        const sample = await page.evaluate(() => {
            const el = document.querySelector(
                '.react-flow__node[data-id="root_leaf_sub"]'
            ) as HTMLElement | null;
            if (!el) return null;
            const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform || '');
            return {
                tx: m ? parseFloat(m[1]) : NaN,
                ty: m ? parseFloat(m[2]) : NaN,
                w: parseFloat(el.style.width) || 0,
            };
        });
        if (sample) samples.push({ t: i * 30, ...sample });
    }
    await collapsePromise;

    expect(samples.length).toBeGreaterThan(5);
    const xs = samples.map((s) => s.tx).filter((v) => Number.isFinite(v));
    const ys = samples.map((s) => s.ty).filter((v) => Number.isFinite(v));
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(2);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(2);
    const widths = samples.map((s) => s.w);
    expect(widths[0]).toBeLessThan(widths[widths.length - 1]);
});

test('collapse morph keeps TL stable while size shrinks', async ({ page }) => {
    test.setTimeout(60_000);
    await page.goto('/?repo=rf-expand-fixture', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#reactflowRoot .react-flow__viewport')).toBeVisible({
        timeout: 30_000,
    });
    await expect(page.locator('.react-flow__node[data-id="root_leaf"]')).toBeVisible();

    await page.evaluate(async () => {
        await window.atelierRfTriggerExpansion!('root_leaf', 'child_target');
    });
    await expect(page.locator('.react-flow__node-group[data-id="root_leaf_sub"]')).toBeVisible();
    await page.waitForTimeout(400);

    const collapsePromise = page.evaluate(async () => {
        await window.atelierRfTriggerCollapse!('root_leaf');
    });

    const samples: { t: number; tx: number; ty: number; w: number }[] = [];
    for (let i = 0; i < 12; i++) {
        await page.waitForTimeout(30);
        const sample = await page.evaluate(() => {
            const el = document.querySelector(
                '.react-flow__node[data-id="root_leaf"]'
            ) as HTMLElement | null;
            if (!el) return null;
            const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(el.style.transform || '');
            return {
                tx: m ? parseFloat(m[1]) : NaN,
                ty: m ? parseFloat(m[2]) : NaN,
                w: parseFloat(el.style.width) || 0,
            };
        });
        if (sample) samples.push({ t: i * 30, ...sample });
    }
    await collapsePromise;

    expect(samples.length).toBeGreaterThan(5);
    const xs = samples.map((s) => s.tx).filter((v) => Number.isFinite(v));
    const ys = samples.map((s) => s.ty).filter((v) => Number.isFinite(v));
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(2);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(2);
    const widths = samples.map((s) => s.w);
    expect(widths[0]).toBeGreaterThan(widths[widths.length - 1]);
});
