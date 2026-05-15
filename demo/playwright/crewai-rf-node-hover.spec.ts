import { test, expect } from '@playwright/test';

/**
 * Real pointer hover on React Flow (default tab): inner diagram nodes must show the side
 * hover panel with DIAGRAM_JSON body text (not an empty panel).
 *
 * Relies on structuredDiagram preferring <!-- DIAGRAM_JSON --> from the module .md over
 * module_tree snapshots so title/description survive into ELK → RF hoverDetail.
 */
test.describe('CrewAI React Flow node hover (DIAGRAM_JSON description)', () => {
    test('shows non-empty hover panel text for a leaf inside a subgraph', async ({ page }) => {
        await page.goto('/?repo=crewai');

        await expect
            .poll(
                async () => {
                    return await page.evaluate(() => {
                        const w = window as unknown as {
                            navigateToModule?: (id: string) => void;
                        };
                        const t = document.getElementById('moduleTitle')?.textContent || '';
                        return typeof w.navigateToModule === 'function' && !t.includes('Loading');
                    });
                },
                { timeout: 90_000, message: 'viewer finished init' }
            )
            .toBe(true);

        await page.evaluate(() => {
            (window as unknown as { navigateToModule: (id: string) => void }).navigateToModule(
                'task_management'
            );
        });

        const leaf = page.locator('.react-flow__node[data-id="conditional_task"]').first();
        await leaf.waitFor({ state: 'visible', timeout: 60_000 });

        await leaf.hover({ force: true });

        const panel = page.locator('[data-testid="atelier-rf-hover-panel"]').first();
        await expect(panel).toBeVisible({ timeout: 15_000 });

        const text = (await panel.innerText()).trim();
        expect(text.length, 'hover panel should contain description prose').toBeGreaterThan(40);
        expect(text.toLowerCase()).toContain('conditional');
    });
});
