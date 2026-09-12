#!/usr/bin/env node
/**
 * Publishes local Qaida MP3s to Quranki's Firebase Storage bucket under `qaida-audio/`.
 * Each file is gzipped before upload (short TTS clips shrink to ~85% here) and stored as
 * `<name>.mp3.gz`. The app downloads and decompresses with `fflate` (see `src/lib/qaida-audio.ts`).
 *
 * Usage:
 *   node scripts/upload-qaida-audio.js
 *   node scripts/upload-qaida-audio.js ./assets/audio/qaida
 *
 * Requires the same auth as `upload-recitation-data.js` - see that script's header comment.
 * Also deploy storage rules once so the prefix is public-read:
 *   npx firebase deploy --only storage
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const KEY_PATH = path.join(ROOT, 'serviceAccountKey.json');
const FIREBASE_TOOLS_CONFIG = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
const BUCKET = 'quranki-506915.firebasestorage.app';
const DEST_ROOT = 'qaida-audio';
const CONCURRENCY = 6;

const FIREBASE_TOOLS_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_TOOLS_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function fail(message) {
  console.error(message);
  process.exit(1);
}

const localDir = path.resolve(process.argv[2] ?? path.join(ROOT, 'assets', 'audio', 'qaida'));
if (!fs.existsSync(localDir) || !fs.statSync(localDir).isDirectory()) {
  fail(`${localDir} is not a directory.`);
}

function publicUrlFor(destPath) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(destPath)}?alt=media`;
}

function formatBytes(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)}MB` : `${(bytes / 1024).toFixed(1)}KB`;
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

async function mapPool(items, limit, worker) {
  const results = [];
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => run()));
  return results;
}

async function main() {
  const files = fs.readdirSync(localDir).filter((name) => name.endsWith('.mp3')).sort();
  if (files.length === 0) fail(`No .mp3 files found in ${localDir}`);

  const upload = await getUploader();
  console.log(`Gzipping and uploading ${files.length} clip(s) to gs://${BUCKET}/${DEST_ROOT}/ ...`);

  let totalOriginal = 0;
  let totalGzipped = 0;
  let done = 0;

  await mapPool(files, CONCURRENCY, async (name) => {
    const original = fs.readFileSync(path.join(localDir, name));
    const gzipped = zlib.gzipSync(original, { level: 9 });
    const destPath = `${DEST_ROOT}/${name}.gz`;
    await upload(destPath, gzipped);
    totalOriginal += original.length;
    totalGzipped += gzipped.length;
    done += 1;
    if (done % 40 === 0 || done === files.length) {
      console.log(`  ${done}/${files.length}  ${name}: ${formatBytes(original.length)} -> ${formatBytes(gzipped.length)}`);
    }
  });

  console.log(
    `\nTotal: ${formatBytes(totalOriginal)} -> ${formatBytes(totalGzipped)} (${((totalGzipped / totalOriginal) * 100).toFixed(0)}% of original)`,
  );
  console.log(`Prefix: ${DEST_ROOT}/`);
  console.log(`Example: ${publicUrlFor(`${DEST_ROOT}/${files[0]}.gz`)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
