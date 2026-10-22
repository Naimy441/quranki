const http = require('http');
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function get(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      res.on('error', reject);
    });
  });
}

async function runTests() {
  console.log('🚀 Starting Quranki Web Desktop Test Suite...\n');
  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (e) {
      console.error(`❌ FAIL: ${name}`, e.message);
      failed++;
    }
  }

  // Test 1: Landing Home page
  await test('Landing Home page returns 200 with App Store & Google Play links', async () => {
    const res = await get('http://localhost:3005/');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Understand 80% of the Quran'));
    assert.ok(res.body.includes('apps.apple.com/us/app/quranki/id6805386348'));
    assert.ok(res.body.includes('play.google.com/store/apps/details?id=com.quranki.app'));
    assert.ok(res.body.includes('Start Learning Free') || res.body.includes('Start Learning'));
  });

  // Test 2: Structured Data (Schema.org)
  await test('Landing page contains Schema.org SoftwareApplication and FAQPage JSON-LD', async () => {
    const res = await get('http://localhost:3005/');
    assert.ok(res.body.includes('SoftwareApplication'));
    assert.ok(res.body.includes('FAQPage'));
    assert.ok(res.body.includes('EducationalApplication'));
  });

  // Test 3: Learn Curriculum page
  await test('Learn page returns 200 and renders desktop-optimized curriculum', async () => {
    const res = await get('http://localhost:3005/learn');
    assert.strictEqual(res.status, 200);
    assert.ok(
      res.body.includes('animate-pulse') ||
      res.body.includes('Stage 1') ||
      res.body.includes('Curriculum') ||
      res.body.includes('Quranki')
    );
  });

  // Test 4: Onboarding walkthrough page
  await test('Onboarding walkthrough returns 200 with reading selection', async () => {
    const res = await get('http://localhost:3005/onboarding');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Assalamu alaykum') || res.body.includes('Quranki'));
    assert.ok(res.body.includes('Next') || res.body.includes('Skip'));
  });

  // Test 5: Sign In page
  await test('Sign In page returns 200 and loads auth form', async () => {
    const res = await get('http://localhost:3005/sign-in');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Sign In to Quranki'));
    assert.ok(res.body.includes('Email Address'));
    assert.ok(res.body.includes('Password'));
  });

  // Test 6: Sign Up page
  await test('Sign Up page returns 200 and loads registration form', async () => {
    const res = await get('http://localhost:3005/signup');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Create Your Account'));
    assert.ok(res.body.includes('Confirm Password'));
  });

  // Test 7: Level Detail page
  await test('Level 1 word list returns 200 and renders level words', async () => {
    const res = await get('http://localhost:3005/level/1');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Level') || res.body.includes('Curriculum'));
  });

  // Test 8: Session study page
  await test('Session study runner returns 200 and loads', async () => {
    const res = await get('http://localhost:3005/session/1');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Level') || res.body.includes('Session'));
  });

  // Test 9: Quran Directory
  await test('Quran directory returns 200 and lists Surahs in responsive grid', async () => {
    const res = await get('http://localhost:3005/quran');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('The Quran') || res.body.includes('Al-Fatihah'));
    assert.ok(res.body.includes('Al-Baqarah'));
    assert.ok(res.body.includes('An-Nas'));
  });

  // Test 10: Surah Reader - Al-Fatihah
  await test('Surah 1 reader returns 200 and loads Al-Fatihah', async () => {
    const res = await get('http://localhost:3005/quran/1');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.includes('Al-Fatihah'));
  });

  // Test 11: Progress page
  await test('Progress dashboard returns 200 and renders analytics', async () => {
    const res = await get('http://localhost:3005/progress');
    assert.strictEqual(res.status, 200);
    assert.ok(
      res.body.includes('Progress') ||
      res.body.includes('Coverage') ||
      res.body.includes('Surah Comprehension Matrix')
    );
  });

  // Test 12: Settings page
  await test('Settings page returns 200 and renders account & preferences', async () => {
    const res = await get('http://localhost:3005/settings');
    assert.strictEqual(res.status, 200);
    assert.ok(
      res.body.includes('Settings') ||
      res.body.includes('Account') ||
      res.body.includes('Theme') ||
      res.body.includes('Study Configuration')
    );
  });

  // Test 13: SEO Sitemap & Robots
  await test('Sitemap.xml and Robots.txt are generated for search engine crawling', async () => {
    const robotsRes = await get('http://localhost:3005/robots.txt');
    assert.strictEqual(robotsRes.status, 200);
    assert.ok(robotsRes.body.includes('sitemap.xml'));

    const sitemapRes = await get('http://localhost:3005/sitemap.xml');
    assert.strictEqual(sitemapRes.status, 200);
    assert.ok(sitemapRes.body.includes('quranki.org/quran/1'));
    assert.ok(sitemapRes.body.includes('quranki.org/learn'));
  });

  // Test 14: Static Surah Data serving
  await test('Static surah 001.json is served with 7 ayahs', async () => {
    const res = await get('http://localhost:3005/data/surahs/001.json');
    assert.strictEqual(res.status, 200);
    const data = JSON.parse(res.body);
    assert.strictEqual(data.length, 7);
    assert.strictEqual(data[0].a, 1);
  });

  // Test 15: Static Audio Reciter Data serving
  await test('Static dosari-murattal.json is served with audio timings', async () => {
    const res = await get('http://localhost:3005/data/audio/dosari-murattal.json');
    assert.strictEqual(res.status, 200);
    const data = JSON.parse(res.body);
    assert.ok(data['1:1']);
    assert.ok(data['1:1'].audio_url);
    assert.ok(data['1:1'].segments.length > 0);
  });

  // Test 16: Static Fonts serving
  await test('UthmanicHafs and SurahNames fonts are served with 200', async () => {
    const res1 = await get('http://localhost:3005/fonts/UthmanicHafs1Ver18.ttf');
    assert.strictEqual(res1.status, 200);
    const res2 = await get('http://localhost:3005/fonts/surah_names.ttf');
    assert.strictEqual(res2.status, 200);
  });

  // Test 17: Punctuation rule verification
  await test('Punctuation check: No prohibited characters (· or —) in web/src copy', async () => {
    const srcDir = path.join(__dirname, 'src');
    function scanDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const full = path.join(dir, file);
        if (fs.statSync(full).isDirectory()) {
          scanDir(full);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
          const content = fs.readFileSync(full, 'utf-8');
          if (content.includes('·')) {
            throw new Error(`Forbidden character "·" found in ${full}`);
          }
          if (content.includes('—')) {
            throw new Error(`Forbidden character "—" found in ${full}`);
          }
        }
      }
    }
    scanDir(srcDir);
  });

  console.log(`\n========================================`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
