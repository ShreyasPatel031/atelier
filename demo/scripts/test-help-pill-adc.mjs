#!/usr/bin/env node
/**
 * E2E: React Flow "?" help pill path → POST /api/arch-agent/chat (ADC), not MCP fallback.
 * Tries real pill click when visible; otherwise invokes atelierRfAskBriefExplanation (same handler).
 */
import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:9891/?repo=langchain&expand=data_and_retrieval';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let archAgentRequest = null;
page.on('request', (req) => {
    if (req.url().includes('/api/arch-agent/chat') && req.method() === 'POST') {
        archAgentRequest = req;
    }
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
await page.waitForSelector('.react-flow__node', { timeout: 120000 });
await page.waitForTimeout(5000);

let clickedPill = false;
const help = page.locator('[data-testid="atelier-rf-group-help"][data-group-id="data_and_retrieval"]');
if (await help.count()) {
    const collapse = page.getByRole('button', { name: /Collapse this expanded group/i });
    if (await collapse.count()) {
        await collapse.first().hover({ force: true });
        await page.waitForTimeout(500);
    }
    if (await help.first().isVisible().catch(() => false)) {
        await help.first().click({ force: true });
        clickedPill = true;
    }
}

if (!clickedPill) {
    const invoke = await page.evaluate(async () => {
        if (typeof window.atelierRfAskBriefExplanation !== 'function') {
            return { error: 'atelierRfAskBriefExplanation missing' };
        }
        return await window.atelierRfAskBriefExplanation({
            nodeId: 'data_and_retrieval',
            label: 'Data & Retrieval',
            kind: 'cluster',
        });
    });
    if (invoke?.error) {
        console.error(invoke);
        await browser.close();
        process.exit(1);
    }
}

await page.waitForFunction(
    () => {
        const texts = Array.from(document.querySelectorAll('#chatMessages .chat-message')).map(
            (m) => m.textContent || ''
        );
        return texts.some((t) => /Thinking|Waiting for answer/i.test(t));
    },
    { timeout: 10000 }
);

const hasWaitingSdk = await page
    .locator('#chatMessages .chat-message')
    .filter({ hasText: 'Waiting for answer' })
    .count()
    .then((n) => n > 0);

await page.waitForFunction(
    () => {
        const msgs = document.querySelectorAll('#chatMessages .chat-message.assistant');
        return Array.from(msgs).some(
            (m) =>
                (m.textContent || '').length > 40 &&
                !/Waiting for answer|Timed out|SDK finished|No chat API/i.test(m.textContent || '')
        );
    },
    { timeout: 90000 }
);

const chatTexts = await page.locator('#chatMessages .chat-message').allTextContents();
const body = archAgentRequest ? archAgentRequest.postDataJSON() : null;

const out = {
    ok: !!archAgentRequest && !hasWaitingSdk,
    clicked_pill_ui: clickedPill,
    arch_agent_post: !!archAgentRequest,
    arch_agent_url: archAgentRequest?.url() || null,
    diagram_selection_logical_id: body?.diagram_selection?.logical_id ?? null,
    has_waiting_sdk: hasWaitingSdk,
    chat_snippet: chatTexts.slice(-4),
};

console.log(JSON.stringify(out, null, 2));
await browser.close();
process.exit(out.ok ? 0 : 1);
