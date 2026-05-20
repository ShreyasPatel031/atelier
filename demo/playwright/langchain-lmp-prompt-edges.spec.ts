import { expect, test } from '@playwright/test';

declare global {
    interface Window {
        atelierRfMeasurePortVsEdgeEndpoints?: () => Array<Record<string, unknown>>;
        atelierRfTriggerExpansion?: (nodeId: string, targetModuleId: string) => Promise<void>;
        atelierRfOnNativeSelectionChange?: (
            selNodes: Array<{ id: string; type?: string; data?: { label?: string } }>
        ) => void;
    }
}

const MODULE_EXPAND = 'language_models_and_prompts';
const PREFIX = `${MODULE_EXPAND}_`;
const LLM_NODE = `${PREFIX}llm_interfaces`;
const PROMPT_NODE = `${PREFIX}prompt_templates`;
const SUBGRAPH = `${MODULE_EXPAND}_sub`;

/** Port/path alignment tolerance in viewport pixels (see rf-port-measure.spec.ts). */
const MAX_PORT_OFFSET_PX = 2;

function isMisaligned(row: Record<string, unknown>): boolean {
    const n = (v: unknown) => typeof v === 'number' && v > MAX_PORT_OFFSET_PX;
    return n(row.dxStart) || n(row.dyStart) || n(row.dxEnd) || n(row.dyEnd);
}

function isPromptLlmEdge(row: Record<string, unknown>): boolean {
    const src = String(row.source ?? '');
    const tgt = String(row.target ?? '');
    const hasLlm = src.includes('llm_interfaces') || tgt.includes('llm_interfaces');
    const hasPrompt = src.includes('prompt_templates') || tgt.includes('prompt_templates');
    return hasLlm && hasPrompt;
}

/**
 * Regression: Language Models & Prompts has module nodes whose ids match wrapper
 * group ids (prompt_templates). ELK must render edges on canvas between LLM
 * Interfaces and Prompt Templates with endpoints on handles.
 */
test.describe('LangChain Language Models & Prompts canvas edges', () => {
    test('expand, select Prompt Templates, edges visible and aligned to ports', async ({
        page,
    }) => {
        test.setTimeout(180_000);
        const pageErrors: string[] = [];
        page.on('pageerror', (err) => pageErrors.push(err.message));

        await page.goto(`/?repo=langchain&expand=${MODULE_EXPAND}`, {
            waitUntil: 'domcontentloaded',
        });

        await expect(page.locator('#diagramViewport.diagram-viewport--reactflow')).toBeVisible({
            timeout: 15_000,
        });
        await expect(page.locator('#reactflowRoot .react-flow__viewport')).toBeVisible({
            timeout: 120_000,
        });
        await expect(
            page.locator(`.react-flow__node[data-id="${MODULE_EXPAND}"]`)
        ).toBeVisible({ timeout: 120_000 });

        await page.evaluate(async () => {
            const fn = window.atelierRfTriggerExpansion;
            if (typeof fn !== 'function') {
                throw new Error('atelierRfTriggerExpansion missing');
            }
            await fn('language_models_and_prompts', 'language_models_and_prompts');
        });

        await expect(
            page.locator(`.react-flow__node-group[data-id="${SUBGRAPH}"]`)
        ).toBeVisible({ timeout: 120_000 });
        await expect(
            page.locator(`.react-flow__node-custom[data-id="${LLM_NODE}"]`)
        ).toBeVisible({ timeout: 60_000 });
        await expect(
            page.locator(`.react-flow__node-custom[data-id="${PROMPT_NODE}"]`)
        ).toBeVisible({ timeout: 60_000 });

        // Let ELK/RF layout + expand animation finish before measuring geometry.
        await page.waitForTimeout(1500);

        const edgeVisibility = await page.evaluate(() => {
            const paths = document.querySelectorAll(
                '#reactflowRoot .react-flow__edge path.react-flow__edge-path'
            );
            let visible = 0;
            let totalLen = 0;
            paths.forEach((path) => {
                const el = path as SVGPathElement;
                const op = parseFloat(getComputedStyle(el).opacity);
                let len = 0;
                try {
                    len = el.getTotalLength();
                } catch {
                    len = 0;
                }
                if (op > 0.05 && len > 8) visible++;
                totalLen += len;
            });
            return { pathCount: paths.length, visible, totalLen };
        });
        expect(edgeVisibility.pathCount, 'RF should render edge paths').toBeGreaterThan(0);
        expect(
            edgeVisibility.visible,
            `expected visible edge paths, got ${JSON.stringify(edgeVisibility)}`
        ).toBeGreaterThan(0);

        const rowsBeforeSelect = await page.evaluate(() => {
            const fn = window.atelierRfMeasurePortVsEdgeEndpoints;
            return typeof fn === 'function' ? fn() : [];
        });
        expect(rowsBeforeSelect.length).toBeGreaterThan(0);

        const promptLlmEdges = rowsBeforeSelect.filter(isPromptLlmEdge);
        expect(
            promptLlmEdges.length,
            `expected LLM↔Prompt edges on canvas; edges: ${JSON.stringify(
                rowsBeforeSelect.map((r) => ({ s: r.source, t: r.target }))
            )}`
        ).toBeGreaterThanOrEqual(1);

        const misalignedBefore = promptLlmEdges.filter(isMisaligned);
        expect(
            misalignedBefore,
            `ports misaligned before select: ${JSON.stringify(misalignedBefore)}`
        ).toEqual([]);

        // Select Prompt Templates on the canvas (user-reported repro path).
        const promptNode = page.locator(
            `.react-flow__node-custom[data-id="${PROMPT_NODE}"]`
        );
        await expect(promptNode).toBeVisible({ timeout: 10_000 });
        await promptNode.click({ force: true });
        // Headless Playwright click does not always fire xyflow onSelectionChange; mirror RF native selection.
        await page.evaluate((nodeId) => {
            const fn = window.atelierRfOnNativeSelectionChange;
            if (typeof fn !== 'function') {
                throw new Error('atelierRfOnNativeSelectionChange missing');
            }
            fn([
                {
                    id: nodeId,
                    type: 'custom',
                    data: { label: 'Prompt Templates' },
                },
            ]);
        }, PROMPT_NODE);
        await expect(promptNode).toHaveClass(/\bselected\b/, { timeout: 10_000 });

        await page.waitForTimeout(400);

        const rowsAfterSelect = await page.evaluate(() => {
            const fn = window.atelierRfMeasurePortVsEdgeEndpoints;
            return typeof fn === 'function' ? fn() : [];
        });
        const promptLlmAfter = rowsAfterSelect.filter(isPromptLlmEdge);
        expect(promptLlmAfter.length).toBeGreaterThanOrEqual(1);
        const misalignedAfter = promptLlmAfter.filter(isMisaligned);
        expect(
            misalignedAfter,
            `ports misaligned after select: ${JSON.stringify(misalignedAfter)}`
        ).toEqual([]);

        // Edge path should still sit between the two node bounding boxes on screen.
        const bboxCheck = await page.evaluate(
            ({ llmId, promptId }) => {
                const root = document.querySelector('#reactflowRoot');
                if (!root) return { ok: false, reason: 'no root' };
                const llm = root.querySelector(
                    '.react-flow__node[data-id="' + llmId + '"]'
                );
                const prompt = root.querySelector(
                    '.react-flow__node[data-id="' + promptId + '"]'
                );
                if (!llm || !prompt) return { ok: false, reason: 'nodes missing' };
                const lr = llm.getBoundingClientRect();
                const pr = prompt.getBoundingClientRect();
                const pad = 80;
                const band = {
                    left: Math.min(lr.left, pr.left) - pad,
                    right: Math.max(lr.right, pr.right) + pad,
                    top: Math.min(lr.top, pr.top) - pad,
                    bottom: Math.max(lr.bottom, pr.bottom) + pad,
                };
                const paths = root.querySelectorAll(
                    '.react-flow__edge path.react-flow__edge-path'
                );
                for (const path of paths) {
                    const el = path as SVGPathElement;
                    const op = parseFloat(getComputedStyle(el).opacity);
                    if (op < 0.05) continue;
                    let len = 0;
                    try {
                        len = el.getTotalLength();
                    } catch {
                        continue;
                    }
                    if (len < 8) continue;
                    const mid = el.getPointAtLength(len / 2);
                    const ctm = el.getScreenCTM();
                    if (!ctm) continue;
                    const sx = ctm.a * mid.x + ctm.c * mid.y + ctm.e;
                    const sy = ctm.b * mid.x + ctm.d * mid.y + ctm.f;
                    if (
                        sx >= band.left &&
                        sx <= band.right &&
                        sy >= band.top &&
                        sy <= band.bottom
                    ) {
                        return { ok: true };
                    }
                }
                return { ok: false, reason: 'no edge midpoints between node bboxes' };
            },
            { llmId: LLM_NODE, promptId: PROMPT_NODE }
        );
        expect(bboxCheck.ok, bboxCheck.reason).toBe(true);

        const removeChildIssues = pageErrors.filter((m) => m.includes('removeChild'));
        expect(removeChildIssues, pageErrors.join(' | ')).toEqual([]);
    });
});
