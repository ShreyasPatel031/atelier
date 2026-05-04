import { expect, test } from '@playwright/test';

declare global {
    interface Window {
        atelierRfTriggerExpansion?: (nodeId: string, targetModuleId: string) => Promise<void>;
        atelierRfTriggerCollapse?: (expandedNodeKey: string) => Promise<void>;
        atelierRfLastNodeParentById?: Record<string, string | null> | null;
    }
}

/**
 * RF inline expansion: clicking an expandable leaf must re-layout and show new nodes
 * (child IR injected under `${nodeId}_sub`, prefixed inner ids).
 */
test.describe('R6 expand inline', () => {
    test('click expandable leaf replaces graph with subgraph containing child nodes', async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        await page.goto('/?repo=rf-expand-fixture', { waitUntil: 'domcontentloaded' });

        await expect(page.locator('#diagramViewport.diagram-viewport--reactflow')).toBeVisible({
            timeout: 15_000,
        });
        await expect(page.locator('#reactflowRoot .react-flow__viewport')).toBeVisible({
            timeout: 120_000,
        });

        const leafNode = page.locator('.react-flow__node[data-id="root_leaf"]');
        await expect(leafNode).toBeVisible({ timeout: 120_000 });
        await expect(leafNode.locator('[data-atelier-rf-expandable="true"]')).toBeVisible({
            timeout: 15_000,
        });

        const idsBefore = await page.evaluate(() =>
            [...document.querySelectorAll('#reactflowRoot .react-flow__node')].map((n) =>
                n.getAttribute('data-id')
            )
        );
        expect(idsBefore).toContain('root_leaf');
        expect(idsBefore).not.toContain('root_leaf_sub');
        expect(idsBefore.some((id) => id != null && id.includes('inner_a'))).toBe(false);

        /**
         * Prefer the same programmatic path as onNodeClick (avoids xyflow/React delegation quirks in CI).
         * Manual UX: click the node label/button inside the canvas.
         */
        await page.evaluate(async () => {
            const fn = window.atelierRfTriggerExpansion;
            if (typeof fn !== 'function') {
                throw new Error('atelierRfTriggerExpansion missing');
            }
            await fn('root_leaf', 'child_target');
        });

        const subgraph = page.locator('.react-flow__node-group[data-id="root_leaf_sub"]');
        await expect(subgraph).toBeVisible({
            timeout: 120_000,
        });
        /** Expansion selects the compound cluster so RF mirrors diagram selection state. */
        await expect(subgraph).toHaveAttribute('data-atelier-rf-selected', 'true', { timeout: 15_000 });
        await expect(
            page.locator('.react-flow__node-custom[data-id="root_leaf_inner_a"]')
        ).toBeVisible({ timeout: 30_000 });
        await expect(
            page.locator('.react-flow__node-custom[data-id="root_leaf_inner_b"]')
        ).toBeVisible({ timeout: 30_000 });
        await expect(
            page.locator('.react-flow__node-custom[data-id="root_leaf_collapse"]')
        ).toBeVisible({ timeout: 30_000 });

        await expect(page.locator('.react-flow__node[data-id="root_leaf"]')).toHaveCount(0);

        const idsAfter = await page.evaluate(() =>
            [...document.querySelectorAll('#reactflowRoot .react-flow__node')].map((n) =>
                n.getAttribute('data-id')
            )
        );
        expect(idsAfter.length).toBeGreaterThan(idsBefore.length);
        expect(idsAfter).toContain('root_leaf_sub');
        expect(idsAfter).toContain('root_leaf_inner_a');

        const parentOfSubgraph = await page.evaluate(() => {
            const m = window.atelierRfLastNodeParentById;
            return m && typeof m === 'object' && 'root_leaf_sub' in m ? m.root_leaf_sub : undefined;
        });
        expect(parentOfSubgraph).toBe('outer_cluster');

        await page.evaluate(async () => {
            const fn = window.atelierRfTriggerCollapse;
            if (typeof fn !== 'function') {
                throw new Error('atelierRfTriggerCollapse missing');
            }
            await fn('root_leaf');
        });
        await expect(page.locator('.react-flow__node[data-id="root_leaf"]')).toBeVisible({
            timeout: 120_000,
        });
        await expect(page.locator('.react-flow__node-group[data-id="root_leaf_sub"]')).toHaveCount(0);

        const removeChildIssues = pageErrors.filter((m) => m.includes('removeChild'));
        expect(removeChildIssues, `page errors: ${pageErrors.join(' | ')}`).toEqual([]);
    });
});
