import { expect, test } from '@playwright/test';

/**
 * Verify React Flow scroll-to-pan behavior:
 *   - Plain wheel scroll (no modifier) → pans the viewport, does NOT zoom
 *   - Ctrl+wheel (trackpad pinch gesture) → zooms, does NOT pan
 */
test.describe('React Flow scroll pan vs zoom', () => {
    async function waitForReactFlow(page: import('@playwright/test').Page) {
        await page.goto('/?repo=pydantic-ai', { waitUntil: 'domcontentloaded' });
        const viewport = page.locator('#reactflowRoot .react-flow__viewport');
        await expect(viewport).toBeVisible({ timeout: 120_000 });
        // Allow React Flow to settle its initial fitView animation
        await page.waitForTimeout(1_000);
        return viewport;
    }

    function parseTransform(matrix: string): { x: number; y: number; scale: number } {
        // React Flow applies "matrix(a,b,c,d,e,f)" or "translate(x,y) scale(z)"
        const m = matrix.match(/matrix\(([^)]+)\)/);
        if (m) {
            const parts = m[1].split(',').map(Number);
            return { x: parts[4], y: parts[5], scale: parts[0] };
        }
        // Fallback: translate + scale
        const tx = matrix.match(/translateX\(([^p]+)px\)/);
        const ty = matrix.match(/translateY\(([^p]+)px\)/);
        const sc = matrix.match(/scale\(([^)]+)\)/);
        return {
            x: tx ? Number(tx[1]) : 0,
            y: ty ? Number(ty[1]) : 0,
            scale: sc ? Number(sc[1]) : 1,
        };
    }

    async function getTransform(page: import('@playwright/test').Page) {
        const raw = await page.evaluate(() => {
            const vp = document.querySelector('#reactflowRoot .react-flow__viewport') as HTMLElement | null;
            return vp ? getComputedStyle(vp).transform : '';
        });
        return parseTransform(raw);
    }

    test('plain wheel scroll pans, does not zoom (over pane)', async ({ page }) => {
        await waitForReactFlow(page);
        const before = await getTransform(page);

        // Real user path: wheel on the React Flow pane with bubbling through #diagramViewport
        await page.evaluate(() => {
            const el = document.querySelector('#reactflowRoot .react-flow__pane') as HTMLElement | null;
            if (!el) throw new Error('React Flow pane not found');
            const rect = el.getBoundingClientRect();
            el.dispatchEvent(new WheelEvent('wheel', {
                deltaX: 0,
                deltaY: 150,
                ctrlKey: false,
                bubbles: true,
                cancelable: true,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
            }));
        });

        await page.waitForTimeout(200);
        const after = await getTransform(page);

        console.log('Before:', before);
        console.log('After (plain scroll over pane):', after);

        expect(Math.abs(after.y - before.y), 'Y should have panned').toBeGreaterThan(5);
        expect(Math.abs(after.scale - before.scale), 'Scale should NOT change on plain scroll').toBeLessThan(0.01);
    });

    test('plain wheel scroll pans when cursor is over a NODE', async ({ page }) => {
        await waitForReactFlow(page);
        const before = await getTransform(page);

        // Wheel event with target = a node (NOT the pane).
        // This is the suspected failure case: React Flow may ignore wheel-over-node.
        const result = await page.evaluate(() => {
            const node = document.querySelector('#reactflowRoot .react-flow__node') as HTMLElement | null;
            if (!node) return { dispatched: false, target: null };
            const rect = node.getBoundingClientRect();
            const ev = new WheelEvent('wheel', {
                deltaX: 0,
                deltaY: 150,
                ctrlKey: false,
                bubbles: true,
                cancelable: true,
                clientX: rect.left + rect.width / 2,
                clientY: rect.top + rect.height / 2,
            });
            node.dispatchEvent(ev);
            return { dispatched: true, target: node.className };
        });

        console.log('Dispatch result:', result);
        await page.waitForTimeout(200);
        const after = await getTransform(page);

        console.log('Before:', before);
        console.log('After (plain scroll over node):', after);

        expect(Math.abs(after.y - before.y), 'Y should have panned even when over a node').toBeGreaterThan(5);
        expect(Math.abs(after.scale - before.scale), 'Scale should NOT change on plain scroll over node').toBeLessThan(0.01);
    });

    test('mouse wheel API also pans (matches real trackpad scroll)', async ({ page }) => {
        await waitForReactFlow(page);
        const before = await getTransform(page);

        // Use Playwright's mouse.wheel which more closely mimics a real user wheel event.
        const pane = page.locator('#reactflowRoot .react-flow__pane');
        await pane.hover();
        await page.mouse.wheel(0, 200);
        await page.waitForTimeout(200);

        const after = await getTransform(page);
        console.log('Before:', before);
        console.log('After (page.mouse.wheel):', after);

        expect(Math.abs(after.y - before.y), 'Y should have panned').toBeGreaterThan(5);
        expect(Math.abs(after.scale - before.scale), 'Scale should NOT change').toBeLessThan(0.01);
    });

    test('DIAGNOSTIC: log every wheel event React Flow receives in next 4s', async ({ page }) => {
        await waitForReactFlow(page);

        // Install a passive wheel logger so we can see EVERY wheel event reaching the React Flow root,
        // including any spurious ctrlKey=true events the browser might be fabricating.
        await page.evaluate(() => {
            const root = document.getElementById('reactflowRoot');
            if (!root) return;
            (window as any).__wheelLog = [];
            root.addEventListener(
                'wheel',
                (e) => {
                    (window as any).__wheelLog.push({
                        deltaX: e.deltaX,
                        deltaY: e.deltaY,
                        ctrlKey: e.ctrlKey,
                        metaKey: e.metaKey,
                        target: (e.target as HTMLElement)?.className || (e.target as HTMLElement)?.tagName,
                        eventPhase: e.eventPhase,
                    });
                },
                { capture: true, passive: true }
            );
        });

        // Fire one plain wheel and one ctrl+wheel
        await page.evaluate(() => {
            const pane = document.querySelector('#reactflowRoot .react-flow__pane') as HTMLElement;
            const r = pane.getBoundingClientRect();
            pane.dispatchEvent(new WheelEvent('wheel', {
                deltaY: 120, ctrlKey: false, bubbles: true, cancelable: true,
                clientX: r.left + 50, clientY: r.top + 50,
            }));
            pane.dispatchEvent(new WheelEvent('wheel', {
                deltaY: -50, ctrlKey: true, bubbles: true, cancelable: true,
                clientX: r.left + 50, clientY: r.top + 50,
            }));
        });

        await page.waitForTimeout(300);
        const log = await page.evaluate(() => (window as any).__wheelLog);
        console.log('Wheel events received by #reactflowRoot:');
        for (const entry of log) console.log('  ', JSON.stringify(entry));
        expect(log.length).toBeGreaterThanOrEqual(2);
    });

    test('ctrl+wheel zooms, does not just pan', async ({ page }) => {
        await waitForReactFlow(page);
        const before = await getTransform(page);

        // Simulate trackpad pinch: wheel event WITH ctrlKey
        await page.evaluate(() => {
            const el = document.querySelector('#reactflowRoot .react-flow__renderer') as HTMLElement | null;
            if (!el) throw new Error('React Flow renderer not found');
            el.dispatchEvent(new WheelEvent('wheel', {
                deltaX: 0,
                deltaY: -50,
                ctrlKey: true,
                bubbles: true,
                cancelable: true,
            }));
        });

        await page.waitForTimeout(200);
        const after = await getTransform(page);

        console.log('Before:', before);
        console.log('After (ctrl+scroll):', after);

        // Scale should change
        expect(Math.abs(after.scale - before.scale), 'Scale should change on ctrl+scroll').toBeGreaterThan(0.01);
    });
});
