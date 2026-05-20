import { expect, test } from '@playwright/test';

const CHAT_API = 'http://127.0.0.1:8001/api/arch-agent/chat';
const PERSONA_DEV_NODE_ID = 'persona_development_and_evaluation';
const MOCK_ANSWER =
    'Persona Development & Evaluation is the tooling lane for experiments, steering demos, and evaluation against persona data.';

/**
 * Regression: demo on :9891 must POST to CodeWiki :8001 (Architectural Agent only).
 * Uses a mocked chat API so CI does not need Gemini.
 */
test.describe('Help pill (? ) → Architectural Agent', () => {
    test.beforeEach(async ({ page }) => {
        await page.route(CHAT_API, async (route) => {
            const body = route.request().postDataJSON() as {
                job_id?: string;
                message?: string;
                diagram_selection?: { logical_id?: string };
            };
            expect(body.job_id).toBe('persona-selection-model');
            expect(body.message).toContain('Persona Development & Evaluation');
            expect(body.diagram_selection?.logical_id).toBe(PERSONA_DEV_NODE_ID);

            await route.fulfill({
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'http://127.0.0.1:9891',
                },
                body: JSON.stringify({ response: MOCK_ANSWER, history: [] }),
            });
        });

        await page.goto('/?repo=persona-selection-model', {
            waitUntil: 'domcontentloaded',
        });
        await expect(
            page.locator('#diagramViewport.diagram-viewport--reactflow')
        ).toBeVisible({ timeout: 15_000 });
        await expect(page.locator('#reactflowRoot .react-flow__viewport')).toBeVisible({
            timeout: 120_000,
        });
        await page
            .locator('.react-flow__node-custom')
            .first()
            .waitFor({ state: 'visible', timeout: 120_000 });
    });

    test('help pill API for Persona Development & Evaluation shows agent answer (not SDK wait)', async ({
        page,
    }) => {
        // Nodes with hoverDetail hide the "?" pill; invoke the same handler the pill uses.
        await page.evaluate(
            ({ nodeId, label }) => {
                const fn = window.atelierRfAskBriefExplanation;
                if (typeof fn !== 'function') {
                    throw new Error('atelierRfAskBriefExplanation missing');
                }
                return fn({
                    nodeId,
                    label,
                    kind: 'node',
                });
            },
            {
                nodeId: PERSONA_DEV_NODE_ID,
                label: 'Persona Development & Evaluation',
            }
        );

        const chat = page.locator('#chatMessages');
        await expect(chat.getByText('Waiting for answer…')).toHaveCount(0, {
            timeout: 10_000,
        });
        await expect(chat.getByText(MOCK_ANSWER)).toBeVisible({ timeout: 15_000 });

        const userLine = chat.getByText(/Persona Development & Evaluation.*architecture diagram/);
        await expect(userLine).toBeVisible();
    });
});
