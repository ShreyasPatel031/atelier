import { chromium } from '@playwright/test';

const url = process.argv[2] || 'http://127.0.0.1:9894/?repo=dspy';

async function state(page) {
  return page.evaluate(() => {
    const card = document.getElementById('atelierChatCard');
    const r = card.getBoundingClientRect();
    const visibleIcons = [...card.querySelectorAll('svg.lucide')].filter((svg) => {
      const btn = svg.closest('button');
      return btn && btn.offsetParent !== null && getComputedStyle(btn).display !== 'none';
    });
    return {
      minimized: card.classList.contains('is-minimized'),
      blocked: card.classList.contains('is-chat-open-blocked'),
      animating: card.classList.contains('is-chat-animating'),
      w: Math.round(r.width),
      h: Math.round(r.height),
      visibleIconCount: visibleIcons.length,
    };
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.evaluate(() => {
  localStorage.removeItem('atelier_chat_card_state_v2');
  localStorage.removeItem('atelier_chat_card_pos_v1');
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);

const results = { ok: true, steps: [] };
function step(name, pass, detail) {
  results.steps.push({ name, pass, detail });
  if (!pass) results.ok = false;
}

const s0 = await state(page);
step('open-state', !s0.minimized && s0.w === 380 && s0.visibleIconCount === 2, s0);

async function slowCollapse(page) {
  const collapse = page.locator('#atelierChatCollapseBtn');
  const box = await collapse.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(180);
  await page.mouse.up();
  await page.waitForTimeout(950);
}

await slowCollapse(page);
const s1 = await state(page);
step('slow-collapse-stays-minimized', s1.minimized && s1.w === 48 && s1.h === 48, s1);
step('one-visible-icon-when-minimized', s1.visibleIconCount === 1, s1);

await page.waitForTimeout(700);
const s2 = await state(page);
step('no-ghost-reopen', s2.minimized && s2.w === 48, s2);

// Hold mouse down through where animation would have run (old bug path)
await page.evaluate(() => {
  localStorage.removeItem('atelier_chat_card_state_v2');
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
const collapse = page.locator('#atelierChatCollapseBtn');
const box = await collapse.boundingBox();
await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
await page.mouse.down();
await page.waitForTimeout(450);
await page.mouse.up();
await page.waitForTimeout(1000);
const s3 = await state(page);
step('hold-then-release-stays-minimized', s3.minimized && s3.w === 48, s3);

console.log(JSON.stringify(results, null, 2));
await browser.close();
process.exit(results.ok ? 0 : 1);
