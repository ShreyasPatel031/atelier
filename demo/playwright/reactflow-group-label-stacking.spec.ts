import { expect, test } from '@playwright/test';

/**
 * Group label pill must:
 *   1. Paint above all React Flow nodes/edges (it is portaled to a viewport-level layer).
 *   2. When viewport zoom > threshold ("outside" mode):
 *        - sit ~6 screen-px above the group frame top edge (no overlap with the border)
 *        - have its left edge flush with the group frame left edge
 *
 * Runs against Playwright webServer at 127.0.0.1:9891 (see playwright.config.ts).
 */
test.describe('R6 group label pill', () => {
    test('paints above nodes/edges and respects outside-mode geometry', async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        await page.goto('/?repo=pydantic-ai', { waitUntil: 'domcontentloaded' });

        await expect(page.locator('#diagramViewport.diagram-viewport--reactflow')).toBeVisible({
            timeout: 15_000,
        });
        await expect(page.locator('#reactflowRoot .react-flow__viewport')).toBeVisible({
            timeout: 120_000,
        });

        await page.locator('.react-flow__node-group').first().waitFor({
            state: 'visible',
            timeout: 120_000,
        });

        await page.evaluate(() => {
            const vt = window.viewTune;
            if (vt) {
                /** Outside placement at any zoom we choose below. */
                vt.groupLabelOutsideZoomAt = 0.35;
            }
            window.dispatchEvent(new CustomEvent('atelier-view-tune'));
        });

        await expect
            .poll(
                async () =>
                    page.evaluate(
                        () =>
                            typeof (window as unknown as { __atelierR6ViewportApi?: { zoomTo?: unknown } })
                                .__atelierR6ViewportApi?.zoomTo === 'function'
                    ),
                { timeout: 60_000, message: '__atelierR6ViewportApi.zoomTo from reactflow-r6.mjs' }
            )
            .toBe(true);

        await page.evaluate(() => {
            const api = (window as unknown as { __atelierR6ViewportApi?: { zoomTo: (z: number) => void } })
                .__atelierR6ViewportApi;
            api?.zoomTo(1.45);
        });
        await page.waitForTimeout(250);

        await expect(
            page.locator('[data-testid="atelier-rf-group-label"]').first(),
            'group label pill must exist in DOM'
        ).toBeAttached({ timeout: 15_000 });

        /**
         * Pick the FIRST pill whose group bbox is comfortably inside the viewport,
         * AND whose own bbox sits entirely on-screen (otherwise elementsFromPoint
         * returns empty and tells us nothing about z-stacking).
         */
        const picked = await page.evaluate(() => {
            const pills = Array.from(
                document.querySelectorAll('[data-testid="atelier-rf-group-label"]')
            ) as HTMLElement[];
            const vw = window.innerWidth;
            const vh = window.innerHeight;
            const rfRoot = document.getElementById('reactflowRoot');
            const rootRect = rfRoot ? rfRoot.getBoundingClientRect() : { left: 0, top: 0, right: vw, bottom: vh };
            for (const pillEl of pills) {
                const pr = pillEl.getBoundingClientRect();
                if (pr.width < 10 || pr.height < 6) continue;
                /** Pill must be entirely inside the React Flow root area (else elementsFromPoint misses it). */
                if (
                    pr.left < rootRect.left + 4 ||
                    pr.top < rootRect.top + 4 ||
                    pr.right > rootRect.right - 4 ||
                    pr.bottom > rootRect.bottom - 4
                )
                    continue;
                const groupId = pillEl.getAttribute('data-group-id');
                if (!groupId) continue;
                const groupEl = document.querySelector(
                    `.react-flow__node-group[data-id="${CSS.escape(groupId)}"]`
                ) as HTMLElement | null;
                if (!groupEl) continue;
                const gr = groupEl.getBoundingClientRect();
                /** Only require group's TOP edge to be on-screen (we measure pill bottom vs group top). */
                if (gr.top < rootRect.top + 4 || gr.top > rootRect.bottom - 20) continue;
                if (gr.left < rootRect.left + 4 || gr.left > rootRect.right - 40) continue;
                pillEl.setAttribute('data-atelier-test-pick', '1');
                groupEl.setAttribute('data-atelier-test-pick', '1');
                return {
                    pillRect: { left: pr.left, top: pr.top, right: pr.right, bottom: pr.bottom },
                    groupRect: { left: gr.left, top: gr.top, right: gr.right, bottom: gr.bottom },
                    groupId,
                };
            }
            return null;
        });

        if (!picked) {
            await page.screenshot({ path: 'test-results/atelier-pill-no-candidate.png', fullPage: false });
        }
        expect(
            picked,
            'no pill+group pair fully on-screen at zoom 1.45 — graph likely shifted; see screenshot'
        ).not.toBeNull();

        const probe = await page.evaluate(() => {
            const layer = document.querySelector(
                '#reactflowRoot .react-flow__viewport > .atelier-rf-pill-layer'
            ) as HTMLElement | null;
            const nodesPane = document.querySelector(
                '#reactflowRoot .react-flow__viewport > .react-flow__nodes'
            ) as HTMLElement | null;
            const layerInline = layer ? parseInt(layer.style.zIndex || '0', 10) : NaN;
            const nodesComputed = nodesPane ? parseInt(getComputedStyle(nodesPane).zIndex || '0', 10) : NaN;
            const pillEl = document.querySelector(
                '[data-testid="atelier-rf-group-label"][data-atelier-test-pick="1"]'
            ) as HTMLElement | null;
            if (!pillEl) {
                return {
                    ok: false,
                    layerInline,
                    nodesComputed,
                    rect: null as null | { left: number; top: number; w: number; h: number },
                    paintTopTag: null,
                    paintTopIsPill: false,
                    stackTags: [] as string[],
                };
            }
            const prevPe = pillEl.style.pointerEvents;
            pillEl.style.pointerEvents = 'auto';
            const r = pillEl.getBoundingClientRect();
            const cx = Math.floor(r.left + r.width / 2);
            const cy = Math.floor(r.top + r.height / 2);
            const stack = document.elementsFromPoint(cx, cy);
            pillEl.style.pointerEvents = prevPe;
            const top = stack[0] as HTMLElement | undefined;
            return {
                ok: true,
                layerInline,
                nodesComputed,
                rect: { left: r.left, top: r.top, w: r.width, h: r.height },
                paintTopTag: top
                    ? `${top.tagName.toLowerCase()}.${(top.className || '').toString().split(/\s+/).slice(0, 3).join('.')}`
                    : null,
                paintTopIsPill: top === pillEl,
                stackTags: stack.slice(0, 4).map(
                    (el) =>
                        `${el.tagName.toLowerCase()}.${(el as HTMLElement).className?.toString?.().split(/\s+/).slice(0, 2).join('.') || ''}`
                ),
            };
        });

        await page.screenshot({ path: 'test-results/atelier-pill-zoomed-in.png', fullPage: false });

        expect(pageErrors, `no page errors (${pageErrors.join(' | ')})`).toEqual([]);
        expect(probe.ok, 'picked pill must exist').toBe(true);
        expect(probe.layerInline, '.atelier-rf-pill-layer inline z-index').toBeGreaterThan(0);
        expect(
            probe.paintTopIsPill,
            `pill must paint above all nodes at its center; actual top=${probe.paintTopTag}, ` +
                `pillRect=${JSON.stringify(probe.rect)}, stack=${probe.stackTags.join(' | ')}`
        ).toBe(true);

        const geom = await page.evaluate(() => {
            const pillEl = document.querySelector(
                '[data-testid="atelier-rf-group-label"][data-atelier-test-pick="1"]'
            ) as HTMLElement | null;
            if (!pillEl) return null;
            const groupEl = document.querySelector(
                '.react-flow__node-group[data-atelier-test-pick="1"]'
            ) as HTMLElement | null;
            if (!groupEl) return null;
            const pr = pillEl.getBoundingClientRect();
            const gr = groupEl.getBoundingClientRect();
            return {
                pillBottom: pr.bottom,
                pillLeft: pr.left,
                groupTop: gr.top,
                groupLeft: gr.left,
                gapScreenPx: gr.top - pr.bottom,
                leftDeltaPx: pr.left - gr.left,
            };
        });
        expect(geom, 'picked pill+group pair must still be in DOM').not.toBeNull();

        expect(
            geom!.gapScreenPx,
            `outside mode: pill bottom must sit ~6px above group frame top (got ${geom!.gapScreenPx.toFixed(2)}px)`
        ).toBeGreaterThan(2);
        expect(geom!.gapScreenPx).toBeLessThan(14);

        expect(
            Math.abs(geom!.leftDeltaPx),
            `outside mode: pill must be flush with group frame left edge (Δ=${geom!.leftDeltaPx.toFixed(2)}px)`
        ).toBeLessThan(3);
    });

    test('inside-mode pill is inset from group top-left and still paints above nodes', async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        await page.goto('/?repo=pydantic-ai', { waitUntil: 'domcontentloaded' });
        await expect(page.locator('#diagramViewport.diagram-viewport--reactflow')).toBeVisible({
            timeout: 15_000,
        });
        await expect(page.locator('#reactflowRoot .react-flow__viewport')).toBeVisible({
            timeout: 120_000,
        });
        await page.locator('.react-flow__node-group').first().waitFor({
            state: 'visible',
            timeout: 120_000,
        });

        await page.evaluate(() => {
            const vt = window.viewTune;
            if (vt) {
                /** Force inside placement at any zoom we choose below. */
                vt.groupLabelOutsideZoomAt = 5;
            }
            window.dispatchEvent(new CustomEvent('atelier-view-tune'));
        });

        await expect
            .poll(
                async () =>
                    page.evaluate(
                        () =>
                            typeof (window as unknown as { __atelierR6ViewportApi?: { zoomTo?: unknown } })
                                .__atelierR6ViewportApi?.zoomTo === 'function'
                    ),
                { timeout: 60_000 }
            )
            .toBe(true);
        await page.evaluate(() => {
            const api = (window as unknown as { __atelierR6ViewportApi?: { zoomTo: (z: number) => void } })
                .__atelierR6ViewportApi;
            api?.zoomTo(0.85);
        });
        await page.waitForTimeout(250);

        const picked = await page.evaluate(() => {
            const pills = Array.from(
                document.querySelectorAll('[data-testid="atelier-rf-group-label"]')
            ) as HTMLElement[];
            const rfRoot = document.getElementById('reactflowRoot');
            const rootRect = rfRoot
                ? rfRoot.getBoundingClientRect()
                : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight };
            for (const pillEl of pills) {
                const pr = pillEl.getBoundingClientRect();
                if (pr.width < 10 || pr.height < 6) continue;
                const groupId = pillEl.getAttribute('data-group-id');
                if (!groupId) continue;
                const groupEl = document.querySelector(
                    `.react-flow__node-group[data-id="${CSS.escape(groupId)}"]`
                ) as HTMLElement | null;
                if (!groupEl) continue;
                const gr = groupEl.getBoundingClientRect();
                /** Inside mode: pill sits within the group; require both pill and group top-left visible. */
                if (
                    gr.top < rootRect.top + 4 ||
                    gr.left < rootRect.left + 4 ||
                    gr.left > rootRect.right - 60 ||
                    gr.top > rootRect.bottom - 40
                )
                    continue;
                if (pr.right > rootRect.right - 4 || pr.bottom > rootRect.bottom - 4) continue;
                pillEl.setAttribute('data-atelier-test-pick', '1');
                groupEl.setAttribute('data-atelier-test-pick', '1');
                return true;
            }
            return false;
        });
        expect(picked, 'an inside-mode pill+group pair must be on screen at zoom 0.85').toBe(true);

        const result = await page.evaluate(() => {
            const pillEl = document.querySelector(
                '[data-testid="atelier-rf-group-label"][data-atelier-test-pick="1"]'
            ) as HTMLElement | null;
            const groupEl = document.querySelector(
                '.react-flow__node-group[data-atelier-test-pick="1"]'
            ) as HTMLElement | null;
            if (!pillEl || !groupEl) return null;
            const prevPe = pillEl.style.pointerEvents;
            pillEl.style.pointerEvents = 'auto';
            const r = pillEl.getBoundingClientRect();
            const gr = groupEl.getBoundingClientRect();
            const cx = Math.floor(r.left + r.width / 2);
            const cy = Math.floor(r.top + r.height / 2);
            const stack = document.elementsFromPoint(cx, cy);
            pillEl.style.pointerEvents = prevPe;
            return {
                topInsetPx: r.top - gr.top,
                leftInsetPx: r.left - gr.left,
                paintTopIsPill: stack[0] === pillEl,
                paintTopTag: stack[0]
                    ? `${(stack[0] as HTMLElement).tagName.toLowerCase()}.${(((stack[0] as HTMLElement).className || '') as string).split(/\s+/).slice(0, 2).join('.')}`
                    : null,
            };
        });

        await page.screenshot({ path: 'test-results/atelier-pill-zoomed-out-inside.png', fullPage: false });

        expect(pageErrors, `no page errors (${pageErrors.join(' | ')})`).toEqual([]);
        expect(result, 'picked pill+group pair must still be in DOM').not.toBeNull();
        expect(result!.paintTopIsPill, `inside-mode pill must paint above nodes; top=${result!.paintTopTag}`).toBe(
            true
        );
        expect(
            result!.topInsetPx,
            `inside mode: pill top must be ~6px below group top (got ${result!.topInsetPx.toFixed(2)}px)`
        ).toBeGreaterThan(2);
        expect(result!.topInsetPx).toBeLessThan(14);
        expect(
            result!.leftInsetPx,
            `inside mode: pill left must be ~6px right of group left (got ${result!.leftInsetPx.toFixed(2)}px)`
        ).toBeGreaterThan(2);
        expect(result!.leftInsetPx).toBeLessThan(14);
    });
});
