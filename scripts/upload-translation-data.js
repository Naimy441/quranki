#!/usr/bin/env node
/**
 * Publishes a raw translation JSON (same `{ "surah:ayah": { t, f? } }` shape as
 * `src/data/en-sahih-international-with-footnote-tags.json`, with optional inline
 * `<sup foot_note="ID">N</sup>` footnote markers) to Quranki's Firebase Storage bucket, pre-parsed
 * into the reader's `TranslationPart[]` shape so the app never parses that markup at runtime.
 *
 * This mirrors `scripts/upload-recitation-data.js` (same gzip, same auth fallback, same bucket)
 * but publishes to `translation-data/` instead of `recitation-data/`, and does its own JSON
 * transform first rather than uploading each input file byte-for-byte - see
 * `parseAyahTranslation` below, copied from `scripts/build-quran-reader-data.js`.
 *
 * Usage:
 *   node scripts/upload-translation-data.js <localJsonFile> <translationKey>
 *
 * Example:
 *   node scripts/upload-translation-data.js scripts/data/translations/en-haleem-with-footnote-tags.json haleem
 *     -> parses, gzips, and uploads to translation-data/haleem.json.gz
 *
 * `translationKey` must match a `key` in `src/lib/translations.ts`.
 *
 * Requires the same auth as `upload-recitation-data.js` - see that script's header comment.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const KEY_PATH = path.join(ROOT, 'serviceAccountKey.json');
const FIREBASE_TOOLS_CONFIG = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
const BUCKET = 'quranki-506915.firebasestorage.app';
const DEST_ROOT = 'translation-data';
const FULL_QURAN_AYAH_COUNT = 6236;

const FIREBASE_TOOLS_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_TOOLS_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [, , localFileArg, translationKeyArg] = process.argv;
if (!localFileArg || !translationKeyArg) {
  fail('Usage: node scripts/upload-translation-data.js <localJsonFile> <translationKey>');
}

const localFile = path.resolve(localFileArg);
if (!fs.existsSync(localFile) || !fs.statSync(localFile).isFile()) {
  fail(`${localFile} is not a file.`);
}

function publicUrlFor(destPath) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(destPath)}?alt=media`;
}

function formatBytes(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)}MB` : `${(bytes / 1024).toFixed(1)}KB`;
}

/**
 * Parses one ayah's translation entry (with inline `<sup foot_note="ID">N</sup>` markers) into a
 * flat list of plain-text runs and footnote markers, resolving each marker's footnote body from
 * the sibling `f` map - copied verbatim from `scripts/build-quran-reader-data.js` so both the
 * bundled default and every downloadable translation are parsed identically.
 */
function parseAyahTranslation(entry) {
  if (!entry) return [];
  const { t: text, f: footnotes = {} } = entry;
  const parts = [];
  const re = /<sup foot_note="(\d+)">(\d+)<\/sup>/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > lastIndex) parts.push({ t: text.slice(lastIndex, m.index) });
    parts.push({ n: m[2], fn: footnotes[m[1]] ?? '' });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push({ t: text.slice(lastIndex) });
  return parts;
}

async function getUploader() {
  if (fs.existsSync(KEY_PATH)) {
    const admin = require('firebase-admin');
    admin.initializeApp({
      credential: admin.credential.cert(require(KEY_PATH)),
      storageBucket: BUCKET,
    });
    const bucket = admin.storage().bucket();
    return async (destPath, buffer) => {
      const file = bucket.file(destPath);
      await file.save(buffer, {
        contentType: 'application/gzip',
        metadata: { cacheControl: 'public, max-age=31536000, immutable' },
      });
    };
  }

  if (!fs.existsSync(FIREBASE_TOOLS_CONFIG)) {
    fail(
      `No serviceAccountKey.json and no cached \`firebase login\` session found.\n` +
        `Either run \`npx firebase login\`, or download a service account key from\n` +
        `Firebase Console > Project settings > Service accounts.`,
    );
  }

  const accessToken = await getFirebaseToolsAccessToken();
  return async (destPath, buffer) => {
    await uploadViaRest(accessToken, destPath, buffer);
  };
}

async function getFirebaseToolsAccessToken() {
  const config = JSON.parse(fs.readFileSync(FIREBASE_TOOLS_CONFIG, 'utf8'));
  const tokens = config.tokens;
  if (!tokens?.refresh_token) {
    fail('No refresh token in firebase-tools config. Run `npx firebase login` first.');
  }

  if (tokens.access_token && tokens.expires_at && tokens.expires_at > Date.now() + 2 * 60 * 1000) {
    return tokens.access_token;
  }

  const response = await fetch('https://www.googleapis.com/oauth2/v3/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: FIREBASE_TOOLS_CLIENT_ID,
      client_secret: FIREBASE_TOOLS_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!response.ok) {
    fail(`Failed to refresh firebase-tools token (HTTP ${response.status}). Run \`npx firebase login\` again.`);
  }
  const refreshed = await response.json();
  return refreshed.access_token;
}

async function uploadViaRest(accessToken, destPath, buffer) {
  const boundary = `quranki-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const metadata = JSON.stringify({
    name: destPath,
    contentType: 'application/gzip',
    cacheControl: 'public, max-age=31536000, immutable',
  });

  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: application/gzip\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const url = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=multipart`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed for ${destPath}: HTTP ${response.status} ${text}`);
  }
}

async function main() {
  const raw = JSON.parse(fs.readFileSync(localFile, 'utf8'));
  const keys = Object.keys(raw);
  if (keys.length < FULL_QURAN_AYAH_COUNT) {
    fail(`${localFile} only has ${keys.length} ayah entries; expected at least ${FULL_QURAN_AYAH_COUNT}.`);
  }

  const parsed = {};
  for (const key of keys) {
    parsed[key] = parseAyahTranslation(raw[key]);
  }

  const original = Buffer.from(JSON.stringify(parsed));
  const gzipped = zlib.gzipSync(original, { level: 9 });
  const destPath = `${DEST_ROOT}/${translationKeyArg}.json.gz`;

  const upload = await getUploader();
  console.log(`Parsed ${keys.length} ayahs. Uploading to gs://${BUCKET}/${destPath} ...`);
  await upload(destPath, gzipped);

  console.log(`  \u2713 ${path.basename(localFile)}: ${formatBytes(original.length)} -> ${formatBytes(gzipped.length)} -> ${destPath}`);
  console.log(`\nPublic URL:\n  ${publicUrlFor(destPath)}`);
  console.log(`\nIn the app, fetch this with downloadTranslationDataset('${translationKeyArg}') from lib/translation-dataset.ts.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
