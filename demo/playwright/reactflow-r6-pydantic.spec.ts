import { expect, test } from '@playwright/test';

/**
 * Regression: pydantic-ai overview triggered React removeChild errors when two refreshReactFlowView
 * runs overlapped (Mermaid afterRender + timing). Graph flashed then disappeared.
 */
test.describe('R6 React Flow / pydantic-ai', () => {
    test('overview shows React Flow canvas without removeChild page errors', async ({
        page,
    }) => {
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => {
            pageErrors.push(err.message);
        });

        await page.goto('/?repo=pydantic-ai', { waitUntil: 'domcontentloaded' });
        await page.reload({ waitUntil: 'domcontentloaded' });

        const viewport = page.locator('#reactflowRoot .react-flow__viewport');
        await expect(viewport).toBeVisible({ timeout: 120_000 });

        const removeChildIssues = pageErrors.filter((m) =>
            m.includes('removeChild')
        );
        expect(
            removeChildIssues,
            `Unexpected React DOM errors: ${pageErrors.join(' | ')}`
        ).toEqual([]);
    });
});
