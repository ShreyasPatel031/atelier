import { expect, test } from '@playwright/test';

/**
 * Hover-on-leaf-node UX in the @xyflow/react canvas (R6 pipeline).
 * Verifies:
 *  1. Hovering a leaf node triggers ElkSideHoverPanel (the side hover window).
 *  2. The compound group does NOT capture pointer events from a leaf drawn over it
 *     (regression: group used to win :hover on z=6000 and block leaf hover entirely).
 *  3. The panel paints above edges (z-index check via `elementsFromPoint`).
 *
 * Runs against Playwright `webServer` at http://127.0.0.1:9891 (see playwright.config.ts).
 */
test.describe('R6 hover panel', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/?repo=pydantic-ai', { waitUntil: 'domcontentloaded' });

        await expect(page.locator('#diagramViewport.diagram-viewport--reactflow')).toBeVisible({
            timeout: 15_000,
        });
        await expect(page.locator('#reactflowRoot .react-flow__viewport')).toBeVisible({
            timeout: 120_000,
        });

        await page.locator('.react-flow__node-custom').first().waitFor({
            state: 'visible',
            timeout: 120_000,
        });
        await page.locator('.react-flow__node-group').first().waitFor({
            state: 'visible',
            timeout: 120_000,
        });
    });

    test('hovering a leaf inside a group reveals the side panel above edges', async ({ page }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        /**
         * Need a leaf with non-empty hoverDetail (otherwise the panel is intentionally suppressed).
         * Picking one geometrically inside a group exercises the regression: previously the group
         * caught the pointer at its higher z-index and blocked leaf hover.
         */
        const targetId = await page.evaluate(() => {
            const groups = [...document.querySelectorAll('.react-flow__node-group')] as HTMLElement[];
            const groupRects = groups.map((g) => g.getBoundingClientRect());
            const leaves = [...document.querySelectorAll('.react-flow__node-custom')] as HTMLElement[];

            const fallback: { id: string; hasDetail: boolean } | null = null;
            let preferred: { id: string; hasDetail: boolean } | null = null;
            for (const leaf of leaves) {
                const inner = leaf.querySelector('[data-atelier-rf-node-kind="leaf"]') as HTMLElement | null;
                if (!inner) continue;
                const has = inner.getAttribute('data-atelier-rf-has-hover-detail') === 'true';

                const lr = leaf.getBoundingClientRect();
                const lcx = lr.left + lr.width / 2;
                const lcy = lr.top + lr.height / 2;
                const insideGroup = groupRects.some(
                    (gr) => lcx > gr.left && lcx < gr.right && lcy > gr.top && lcy < gr.bottom
                );

                const id = leaf.getAttribute('data-id') || '';
                if (!id) continue;
                if (has && insideGroup) {
                    preferred = { id, hasDetail: true };
                    break;
                }
            }
            return preferred || fallback;
        });

        expect(
            targetId,
            'expected at least one leaf inside a group with non-empty hoverDetail (atelierRfHoverDetailByNodeId)'
        ).not.toBeNull();

        const leaf = page.locator(`.react-flow__node-custom[data-id="${targetId!.id}"]`);
        await expect(leaf).toBeVisible();

        const leafBox = await leaf.boundingBox();
        expect(leafBox, 'leaf bounding box').toBeTruthy();
        const cx = leafBox!.x + leafBox!.width / 2;
        const cy = leafBox!.y + leafBox!.height / 2;

        /** Topmost element at the leaf center must resolve to the LEAF, NOT the parent group. */
        const topMostKind = await page.evaluate(
            ({ x, y }) => {
                const stack = document.elementsFromPoint(x, y);
                for (const el of stack) {
                    const node = (el as Element).closest('.react-flow__node') as HTMLElement | null;
                    if (!node) continue;
                    if (node.classList.contains('react-flow__node-group')) return 'group';
                    if (node.classList.contains('react-flow__node-custom')) return 'leaf';
                    return 'other';
                }
                return 'none';
            },
            { x: cx, y: cy }
        );
        expect(
            topMostKind,
            'cursor at leaf center must hit the LEAF (not the parent group) — pointer-events:none on .react-flow__node-group'
        ).toBe('leaf');

        await page.mouse.move(cx, cy);
        await page.waitForTimeout(150);

        const panel = page.locator(`[data-testid="atelier-rf-hover-panel"]`);
        await expect(panel, 'side hover panel renders on leaf hover').toBeVisible({ timeout: 5_000 });

        const panelInfo = await panel.evaluate((el) => {
            const r = (el as HTMLElement).getBoundingClientRect();
            return {
                rect: { left: r.left, top: r.top, width: r.width, height: r.height },
                text: (el.textContent || '').trim(),
            };
        });
        expect(panelInfo.text.length, 'panel must contain the hover detail text').toBeGreaterThan(0);

        /**
         * Verify the panel paints ABOVE edges. The probe point is just inside the panel’s top-left.
         * .react-flow__edges has stacking forced to z-index 0 via viewer CSS; panel uses HOVER_PANEL_Z_INDEX.
         */
        const px = panelInfo.rect.left + Math.min(8, panelInfo.rect.width / 2);
        const py = panelInfo.rect.top + Math.min(8, panelInfo.rect.height / 2);

        const stackingProbe = await page.evaluate(
            ({ x, y }) => {
                const stack = document.elementsFromPoint(x, y);
                const topIsPanel = !!(stack[0] as Element)?.closest?.('[data-testid="atelier-rf-hover-panel"]');
                const edgeIndex = stack.findIndex((el) =>
                    !!(el as Element).closest?.('.react-flow__edges')
                );
                const panelIndex = stack.findIndex((el) =>
                    !!(el as Element).closest?.('[data-testid="atelier-rf-hover-panel"]')
                );
                return { topIsPanel, edgeIndex, panelIndex, length: stack.length };
            },
            { x: px, y: py }
        );

        expect(stackingProbe.panelIndex, 'panel must be present at probe point').toBeGreaterThanOrEqual(0);
        expect(stackingProbe.topIsPanel, 'panel must be the topmost element at its interior').toBe(true);
        if (stackingProbe.edgeIndex >= 0) {
            expect(
                stackingProbe.panelIndex,
                `panel (idx ${stackingProbe.panelIndex}) must paint above .react-flow__edges (idx ${stackingProbe.edgeIndex})`
            ).toBeLessThan(stackingProbe.edgeIndex);
        }

        expect(pageErrors, `no page errors (${pageErrors.join(' | ')})`).toEqual([]);
    });

    test('group node does not capture pointer events when cursor is over a leaf', async ({ page }) => {
        /**
         * Sample many leaf-inside-group locations and verify none of them resolve to the group.
         * Catches cases where pointer-events:none on .react-flow__node-group regresses or
         * an inline style overrides the !important CSS rule.
         */
        const result = await page.evaluate(() => {
            const groups = [...document.querySelectorAll('.react-flow__node-group')] as HTMLElement[];
            const groupRects = groups.map((g) => g.getBoundingClientRect());
            const leaves = [...document.querySelectorAll('.react-flow__node-custom')] as HTMLElement[];

            const samples: { id: string; topKind: string }[] = [];
            for (const leaf of leaves.slice(0, 30)) {
                const lr = leaf.getBoundingClientRect();
                const lcx = lr.left + lr.width / 2;
                const lcy = lr.top + lr.height / 2;
                const insideGroup = groupRects.some(
                    (gr) => lcx > gr.left && lcx < gr.right && lcy > gr.top && lcy < gr.bottom
                );
                if (!insideGroup) continue;

                const stack = document.elementsFromPoint(lcx, lcy);
                let topKind = 'none';
                for (const el of stack) {
                    const node = (el as Element).closest?.('.react-flow__node') as HTMLElement | null;
                    if (!node) continue;
                    if (node.classList.contains('react-flow__node-group')) {
                        topKind = 'group';
                    } else if (node.classList.contains('react-flow__node-custom')) {
                        topKind = 'leaf';
                    } else {
                        topKind = 'other';
                    }
                    break;
                }
                samples.push({ id: leaf.getAttribute('data-id') || '?', topKind });
            }
            return samples;
        });

        expect(result.length, 'at least one leaf-inside-group sampled on pydantic-ai').toBeGreaterThan(0);

        const blockedByGroup = result.filter((s) => s.topKind === 'group').map((s) => s.id);
        expect(
            blockedByGroup,
            `leaves where the group catches the pointer (regression): ${JSON.stringify(blockedByGroup)}`
        ).toEqual([]);
    });
});
