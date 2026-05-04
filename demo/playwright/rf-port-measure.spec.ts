import { expect, test } from '@playwright/test';

declare global {
    interface Window {
        atelierRfTriggerExpansion?: (
            nodeId: string,
            targetModuleId: string
        ) => Promise<void>;
        atelierRfMeasurePortVsEdgeEndpoints?: () => Array<Record<string, unknown>>;
    }
}

/**
 * Prints the pixel offset between each edge path endpoint and the handle
 * (port) dot center it attaches to. Run with:
 *   npx playwright test demo/playwright/rf-port-measure.spec.ts --reporter=list
 */
test('measure port vs edge endpoint offsets on expanded subgraph', async ({
    page,
}) => {
    test.setTimeout(60_000);
    page.on('console', (msg) => {
        const type = msg.type();
        if (type === 'error' || type === 'warning') {
            console.log('[browser ' + type + ']', msg.text());
        }
    });

    await page.goto('/?repo=rf-expand-fixture&rfDebug=1', {
        waitUntil: 'domcontentloaded',
    });

    await expect(page.locator('#reactflowRoot .react-flow__viewport')).toBeVisible({
        timeout: 30_000,
    });
    await expect(page.locator('.react-flow__node[data-id="root_leaf"]')).toBeVisible({
        timeout: 30_000,
    });

    await page.evaluate(async () => {
        const fn = window.atelierRfTriggerExpansion;
        if (typeof fn !== 'function') throw new Error('expansion fn missing');
        await fn('root_leaf', 'child_target');
    });

    await expect(
        page.locator('.react-flow__node-group[data-id="root_leaf_sub"]')
    ).toBeVisible({ timeout: 30_000 });

    await page.waitForTimeout(500);

    const rows = await page.evaluate(() => {
        const fn = window.atelierRfMeasurePortVsEdgeEndpoints;
        return typeof fn === 'function' ? fn() : [];
    });
    console.log('\n=== PORT vs EDGE ENDPOINT OFFSETS (viewport px) ===');
    console.table(rows);

    const diag = await page.evaluate(() => {
        const root = document.querySelector('#reactflowRoot');
        if (!root) return null;
        const sub = root.querySelector('.react-flow__node-group[data-id="root_leaf_sub"]');
        const handle = sub
            ? sub.querySelector('.react-flow__handle[data-handleid="left-0-target"]')
            : null;
        if (!sub || !handle) return null;
        const subR = sub.getBoundingClientRect();
        const hR = handle.getBoundingClientRect();
        const subStyle = window.getComputedStyle(sub);
        const handleStyle = window.getComputedStyle(handle);
        return {
            sub: {
                left: subR.left,
                top: subR.top,
                width: subR.width,
                height: subR.height,
                transform: subStyle.transform,
                position: subStyle.position,
                border: subStyle.border,
                padding: subStyle.padding,
                boxSizing: subStyle.boxSizing,
            },
            handle: {
                centerX: hR.left + hR.width / 2,
                centerY: hR.top + hR.height / 2,
                width: hR.width,
                height: hR.height,
                styleTop: handleStyle.top,
                styleLeft: handleStyle.left,
                transform: handleStyle.transform,
                position: handleStyle.position,
            },
            innerHTMLTrunc: sub.outerHTML.slice(0, 500),
        };
    });
    console.log('\n=== DOM diag for root_leaf_sub ===');
    console.log(JSON.stringify(diag, null, 2));
    const offenders = rows.filter((r) => {
        const n = (v: unknown) => typeof v === 'number' && v > 0.5;
        return n(r.dxStart) || n(r.dyStart) || n(r.dxEnd) || n(r.dyEnd);
    });
    if (offenders.length) {
        console.log('\n=== MISALIGNED ===');
        console.log(JSON.stringify(offenders, null, 2));
    } else {
        console.log('All ports align with edge endpoints within 0.5px.');
    }
});
