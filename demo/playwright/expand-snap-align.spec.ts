import { test, expect } from '@playwright/test';

/**
 * Full viewer: load CrewAI overview, expand "CLI Commands" (has child modules),
 * assert expanded g.cluster bbox top-left matches pre-expand g.node bbox (viewport px).
 */
test.describe('Expand snap alignment', () => {
    test('crewai overview cli_commands: cluster bbox TL matches node bbox TL within 4px', async ({ page }) => {
        await page.goto('/?repo=crewai');

        await expect
            .poll(
                async () =>
                    page.evaluate(
                        () =>
                            !!document.querySelector(
                                '#mermaid-diagram svg g.node.clickable-node[data-logical-id="cli_commands"]'
                            )
                    ),
                { timeout: 90_000, message: 'cli_commands node rendered and clickable' }
            )
            .toBe(true);

        const before = await page.evaluate(() => {
            const fn = (window as unknown as { __measureNodeShapeViewportTL?: (id: string) => unknown })
                .__measureNodeShapeViewportTL;
            return typeof fn === 'function' ? fn('cli_commands') : null;
        });
        expect(before, 'pre-expand g.node bbox TL').toEqual(
            expect.objectContaining({
                left: expect.any(Number),
                top: expect.any(Number)
            })
        );

        await page.evaluate(() => {
            const el = document.querySelector<SVGGElement>(
                '#mermaid-diagram svg g.node[data-logical-id="cli_commands"]'
            );
            el?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
        });

        await expect
            .poll(
                async () =>
                    page.evaluate(
                        () =>
                            !!document.querySelector(
                                '#mermaid-diagram svg g.cluster[data-logical-id="cli_commands_sub"]'
                            )
                    ),
                { timeout: 45_000, message: 'expanded subgraph cluster present' }
            )
            .toBe(true);

        await expect
            .poll(
                async () => {
                    return page.evaluate(() => {
                        const fn = (window as unknown as { __measureClusterFrameViewportTL?: (id: string) => unknown })
                            .__measureClusterFrameViewportTL;
                        const tl =
                            typeof fn === 'function' ? fn('cli_commands_sub') : null;
                        const o = tl as { width?: number; height?: number } | null;
                        return o && (o.width ?? 0) > 0.5 && (o.height ?? 0) > 0.5;
                    });
                },
                { timeout: 15_000, message: 'cluster frame has non-zero size (layout settled)' }
            )
            .toBe(true);

        const b = before as { left: number; top: number };
        const eps = 4;

        // Snap runs after cluster paint (setTimeout + rAF); measuring immediately would read pre-pan coords.
        await expect
            .poll(
                async () => {
                    return page.evaluate(
                        ([id, refLeft, refTop, tolerance]) => {
                            const fn = (window as unknown as { __measureClusterFrameViewportTL?: (s: string) => unknown })
                                .__measureClusterFrameViewportTL;
                            const tl = typeof fn === 'function' ? fn(id) : null;
                            const o = tl as { left: number; top: number } | null;
                            if (!o) return false;
                            return (
                                Math.abs(o.left - refLeft) <= tolerance && Math.abs(o.top - refTop) <= tolerance
                            );
                        },
                        ['cli_commands_sub', b.left, b.top, eps] as const
                    );
                },
                { timeout: 15_000, message: 'expanded cluster TL snapped to pre-expand node bbox' }
            )
            .toBe(true);

        const after = (await page.evaluate(() => {
            const fn = (window as unknown as { __measureClusterFrameViewportTL?: (id: string) => unknown })
                .__measureClusterFrameViewportTL;
            return typeof fn === 'function' ? fn('cli_commands_sub') : null;
        })) as { left: number; top: number };

        expect(Math.abs(after.left - b.left), `cluster frame left ${after.left} vs node ${b.left}`).toBeLessThanOrEqual(
            eps
        );
        expect(Math.abs(after.top - b.top), `cluster frame top ${after.top} vs node ${b.top}`).toBeLessThanOrEqual(eps);
    });
});
