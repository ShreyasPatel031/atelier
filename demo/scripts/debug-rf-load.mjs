import { chromium } from '@playwright/test';

const url = process.argv[2] || 'http://127.0.0.1:9891/?repo=dspy';
const browser = await chromium.launch();
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text()}`);
});
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
for (let i = 0; i < 24; i++) {
  const state = await page.evaluate(() => ({
    r6Ready: !!window.atelierR6ReactFlowReady,
    mount: typeof window.atelierMountReactFlowR6,
    build: typeof window.atelierRfBuildLayoutElementsForEpoch,
    elk: typeof window.runElkLayoutPipeline,
    rfNodes: typeof window.__atelierR6SetNodes,
    rootText: document.getElementById('reactflowRoot')?.innerText?.slice(0, 120) || '',
    hasRf: !!document.querySelector('#reactflowRoot .react-flow'),
  }));
  if (state.hasRf) {
    console.log(JSON.stringify({ ok: true, afterMs: i * 500, state, errors }, null, 2));
    await browser.close();
    process.exit(0);
  }
  await page.waitForTimeout(500);
}
const state = await page.evaluate(() => ({
  r6Ready: !!window.atelierR6ReactFlowReady,
  mount: typeof window.atelierMountReactFlowR6,
  build: typeof window.atelierRfBuildLayoutElementsForEpoch,
  elk: typeof window.runElkLayoutPipeline,
  rfNodes: typeof window.__atelierR6SetNodes,
  rootText: document.getElementById('reactflowRoot')?.innerText?.slice(0, 200) || '',
  hasRf: !!document.querySelector('#reactflowRoot .react-flow'),
}));
console.log(JSON.stringify({ ok: false, state, errors }, null, 2));
await browser.close();
process.exit(1);
