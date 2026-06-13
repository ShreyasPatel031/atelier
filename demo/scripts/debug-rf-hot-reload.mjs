import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const url = process.argv[2] || 'http://127.0.0.1:9894/?repo=dspy';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

for (let i = 0; i < 24; i++) {
  const hasRf = await page.evaluate(
    () => !!document.querySelector('#reactflowRoot .react-flow')
  );
  if (hasRf) break;
  await page.waitForTimeout(500);
}

const before = await page.evaluate(() =>
  Array.from(document.querySelectorAll('#reactflowRoot .react-flow__node'))
    .map((n) => n.textContent?.trim() || '')
    .find((t) => /Developer|User/i.test(t))
);

const patchLabel = `Developer / User (hot ${Date.now()})`;
await new Promise((resolve, reject) => {
  const child = spawn(
    'node',
    [
      '--input-type=module',
      '-e',
      `import { patchDiagram } from './dist/tools/patch-diagram.js';
       import { ensureLocalServer } from './dist/local-server.js';
       process.env.ATELIER_DATA_ORIGIN='http://127.0.0.1:9891';
       await ensureLocalServer();
       await patchDiagram({ repo_id:'dspy', target:'overview', operations:[{ op:'update_node', id:'user', label:${JSON.stringify(patchLabel)} }] });
       console.log('patched');`,
    ],
    {
      cwd: new URL('../../packages/atelier-mcp', import.meta.url).pathname,
      env: { ...process.env, ATELIER_DATA_ORIGIN: 'http://127.0.0.1:9891' },
    }
  );
  child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`patch exit ${code}`))));
});

let ok = false;
for (let i = 0; i < 20; i++) {
  const after = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#reactflowRoot .react-flow__node'))
      .map((n) => n.textContent?.trim() || '')
      .find((t) => /Developer|User/i.test(t))
  );
  if (after === patchLabel) {
    ok = true;
    console.log(JSON.stringify({ ok: true, before, after, patchLabel }, null, 2));
    break;
  }
  await page.waitForTimeout(500);
}

if (!ok) {
  const after = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#reactflowRoot .react-flow__node'))
      .map((n) => n.textContent?.trim() || '')
  );
  console.log(JSON.stringify({ ok: false, before, patchLabel, labels: after }, null, 2));
}

await browser.close();
process.exit(ok ? 0 : 1);
