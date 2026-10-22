// Prints CSS-pixel boxes of on-screen elements, used to place callouts over the screenshots.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? 'http://localhost:3102';
const state = JSON.parse(fs.readFileSync(path.resolve(here, '../seed/demo-state.json'), 'utf8'));

const targets = {
  '/learn': ['words to review', 'Mastered', 'Day streak', 'Today', 'Study time', 'Continue reading', 'Quran understood', 'Stage 2', 'Memorize'],
  '/progress': ['Overall memorization', 'Average ayah understanding', 'Average surah understanding', 'Words mastered', 'Study time'],
  '/quran': ['Continue reading', 'understood'],
  '/quran/18': ['understood per ayah', 'Ruku 1'],
  '/memorize': ['Your rukus', 'Al-Fatihah - Ruku 1'],
};

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript((s) => {
  if (sessionStorage.getItem('__seeded')) return;
  localStorage.clear();
  for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
  sessionStorage.setItem('__seeded', '1');
}, state);
const page = await context.newPage();
const out = {};
for (const [url, texts] of Object.entries(targets)) {
  await page.goto(BASE + url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);
  out[url] = await page.evaluate((texts) => {
    const res = {};
    for (const t of texts) {
      const all = [...document.querySelectorAll('body *')].filter(
        (el) => el.children.length === 0 && el.textContent && el.textContent.includes(t),
      );
      res[t] = all.slice(0, 3).map((el) => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
      });
    }
    return res;
  }, texts);
}
console.log(JSON.stringify(out, null, 1));
await browser.close();
