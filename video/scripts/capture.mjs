// Captures crisp screenshots of the web app with the seeded demo account.
// Usage: node scripts/capture.mjs [baseUrl] [only-group]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2] ?? 'http://localhost:3102';
const ONLY = process.argv[3];
const OUT = path.resolve(here, '../public/shots');
fs.mkdirSync(OUT, { recursive: true });
const state = JSON.parse(fs.readFileSync(path.resolve(here, '../seed/demo-state.json'), 'utf8'));

const HIDE_CSS = `nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }
* { caret-color: transparent !important; }
::-webkit-scrollbar { display: none !important; }
html { scrollbar-width: none !important; }`;

async function newPage(browser, { mobile = false, theme = 'dark', seed = true } = {}) {
  const context = await browser.newContext(
    mobile
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, colorScheme: theme }
      : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: theme },
  );
  const seeded = { ...state };
  if (theme !== 'dark') {
    const s = JSON.parse(seeded['quranki:settings:v1']);
    seeded['quranki:settings:v1'] = JSON.stringify({ ...s, themePreference: theme });
  }
  if (seed) {
    await context.addInitScript((s) => {
      if (sessionStorage.getItem('__seeded')) return;
      localStorage.clear();
      for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v);
      sessionStorage.setItem('__seeded', '1');
    }, seeded);
  }
  await context.addInitScript((css) => {
    const add = () => {
      const el = document.createElement('style');
      el.textContent = css;
      document.documentElement.appendChild(el);
    };
    if (document.documentElement) add();
    else document.addEventListener('DOMContentLoaded', add);
  }, HIDE_CSS);
  const page = await context.newPage();
  return page;
}

async function go(page, url, wait = 1800) {
  await page.goto(BASE + url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(wait);
}

async function shot(page, name, opts = {}) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, ...opts });
  console.log('shot', name);
}

/** Scrolls through the page so reveal-on-scroll sections render, then returns to the top. */
async function primeScroll(page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 300) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(800);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
}

const groups = {
  async landing(browser) {
    const page = await newPage(browser, { seed: false });
    await go(page, '/', 2500);
    await shot(page, 'd-landing-hero');
    await primeScroll(page);
    await shot(page, 'd-landing-full', { fullPage: true });
    await page.context().close();
  },

  async blog(browser) {
    const page = await newPage(browser, { seed: false });
    await go(page, '/blog', 2000);
    await primeScroll(page);
    await shot(page, 'd-blog-index-full', { fullPage: true });
    for (const slug of ['most-common-words-in-the-quran', 'how-many-words-to-understand-the-quran', 'spaced-repetition-for-quranic-arabic', 'how-long-does-it-take-to-learn-quranic-arabic']) {
      await go(page, `/blog/${slug}`, 2000);
      await primeScroll(page);
      await shot(page, `d-blog-${slug}`, { fullPage: true });
    }
    await page.context().close();
  },

  async learn(browser) {
    const page = await newPage(browser);
    await go(page, '/learn', 2500);
    await shot(page, 'd-learn');
    await shot(page, 'd-learn-full', { fullPage: true });
    await go(page, '/progress', 3000);
    await primeScroll(page);
    await shot(page, 'd-progress');
    await shot(page, 'd-progress-full', { fullPage: true });
    await go(page, '/memorize', 2500);
    await shot(page, 'd-memorize');
    await go(page, '/saved', 2000);
    await shot(page, 'd-saved');
    await go(page, '/settings', 2000);
    await shot(page, 'd-settings');
    await shot(page, 'd-settings-full', { fullPage: true });
    await go(page, '/word-timeline', 2500);
    await shot(page, 'd-word-timeline');
    await go(page, '/quran', 2500);
    await shot(page, 'd-quran-index');
    // Command palette
    await page.keyboard.press('Meta+k');
    await page.waitForTimeout(700);
    await shot(page, 'd-palette');
    await page.keyboard.type('2:255', { delay: 90 });
    await page.waitForTimeout(700);
    await shot(page, 'd-palette-typed');
    await page.keyboard.press('Escape');
    await page.context().close();
  },

  async light(browser) {
    const page = await newPage(browser, { theme: 'light' });
    await go(page, '/learn', 2500);
    await shot(page, 'd-learn-light');
    await go(page, '/quran/1', 3000);
    await shot(page, 'd-reader-fatiha-light');
    await page.context().close();
  },

  async session(browser) {
    const page = await newPage(browser);
    await go(page, '/session/review', 2500);
    for (let i = 0; i < 5; i += 1) {
      await shot(page, `d-session-${i}-front`);
      await page.keyboard.press('Space');
      await page.waitForTimeout(900);
      await shot(page, `d-session-${i}-back`);
      await page.keyboard.press(i === 2 ? '4' : '3');
      await page.waitForTimeout(1100);
    }
    await page.context().close();
  },

  async reader(browser) {
    const page = await newPage(browser);
    await go(page, '/quran/18', 3500);
    await shot(page, 'd-reader-kahf');
    const scrollToAyah = async (n, offset) => {
      await page.evaluate(([n, offset]) => {
        const el = document.querySelector(`[data-ayah="${n}"]`);
        if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - offset);
      }, [n, offset]);
      await page.waitForTimeout(1200);
    };
    await scrollToAyah(1, 96);
    await shot(page, 'd-reader-kahf-ayahs');
    const boxes = {};
    // A known (hidden) word that sits comfortably inside the viewport.
    const pickHidden = async (minY, maxY, skip = 0) => {
      const idx = await page.evaluate(([minY, maxY, skip]) => {
        const els = [...document.querySelectorAll('[title^="You know this word"]')];
        const ok = els.map((el, i) => [i, el.getBoundingClientRect()]).filter(([, r]) => r.top > minY && r.bottom < maxY && r.left > 500);
        return ok[Math.min(skip, ok.length - 1)]?.[0] ?? -1;
      }, [minY, maxY, skip]);
      return page.locator('[title^="You know this word"]').nth(idx);
    };
    const peek = await pickHidden(420, 760, 2);
    boxes.peek = await peek.boundingBox();
    await peek.click();
    await page.waitForTimeout(800);
    await shot(page, 'd-reader-kahf-peek');
    const translate = page.locator('button[title="Translate"]').first();
    boxes.translate = await translate.boundingBox();
    await translate.click();
    await page.waitForTimeout(900);
    await shot(page, 'd-reader-kahf-translate');
    const word = await pickHidden(150, 420, 1);
    boxes.detail = await word.boundingBox();
    await word.click({ button: 'right' });
    await page.waitForTimeout(1200);
    await shot(page, 'd-reader-word-detail');
    fs.writeFileSync(path.join(OUT, 'd-reader-boxes.json'), JSON.stringify(boxes));
    await page.keyboard.press('Escape');
    await page.context().close();
  },

  async hifz(browser) {
    const page = await newPage(browser);
    await go(page, '/session/hifz', 3000);
    await shot(page, 'd-hifz-0');
    await page.keyboard.press('Space');
    await page.waitForTimeout(1200);
    await shot(page, 'd-hifz-1');
    await page.context().close();
  },

  async mobile(browser) {
    const page = await newPage(browser, { mobile: true });
    await go(page, '/learn', 2500);
    await shot(page, 'm-learn');
    await go(page, '/session/review', 2500);
    await shot(page, 'm-session-front');
    await page.keyboard.press('Space');
    await page.waitForTimeout(900);
    await shot(page, 'm-session-back');
    await go(page, '/quran/18', 3500);
    await page.evaluate(() => window.scrollTo(0, 420));
    await page.waitForTimeout(900);
    await shot(page, 'm-reader');
    await go(page, '/progress', 3000);
    await primeScroll(page);
    await shot(page, 'm-progress');
    await go(page, '/memorize', 2500);
    await shot(page, 'm-memorize');
    await page.context().close();
    const land = await newPage(browser, { mobile: true, seed: false });
    await go(land, '/', 2500);
    await shot(land, 'm-landing');
    await land.context().close();
  },
};

const browser = await chromium.launch();
try {
  for (const [name, fn] of Object.entries(groups)) {
    if (ONLY && !ONLY.split(',').includes(name)) continue;
    try {
      await fn(browser);
    } catch (error) {
      console.error('group failed', name, error.message);
    }
  }
} finally {
  await browser.close();
}
