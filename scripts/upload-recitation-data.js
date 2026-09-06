#!/usr/bin/env node
/**
 * Publishes local JSON dataset files to Quranki's Firebase Storage bucket under
 * `recitation-data/`, so the app can download them on demand at runtime instead of bundling
 * them into the binary. Each file is gzipped before upload (JSON like this typically shrinks
 * to ~20-35% of its original size) and stored as `<name>.json.gz`; the app downloads and
 * decompresses it explicitly with `fflate` (see `src/lib/remote-dataset-cache.ts`) rather than
 * relying on HTTP `Content-Encoding` negotiation, which is inconsistent across mobile
 * networking stacks.
 *
 * Usage:
 *   node scripts/upload-recitation-data.js <localDir> [destinationPrefix]
 *
 * Example:
 *   node scripts/upload-recitation-data.js ./tmp/mishary-timings mishary
 *     -> gzips and uploads every *.json in ./tmp/mishary-timings to
 *        recitation-data/mishary/<file>.json.gz
 *
 * Requires one of:
 *   - `serviceAccountKey.json` at the project root (Firebase Console > Project settings >
 *     Service accounts > Generate new private key). Never commit this file. If uploads fail
 *     with a permission error, grant the service account the "Storage Admin" role in Google
 *     Cloud Console > IAM (an FCM-only key does not have Storage access by default).
 *   - OR just be logged in via `npx firebase login` (this script reuses that cached OAuth
 *     session as a fallback, so no service account key is required for one-off uploads).
 *
 * Also requires:
 *   - The Storage bucket already provisioned: Firebase Console > Build > Storage > Get started
 *     (one-time, picks a location). This script cannot create the bucket itself.
 *   - `storage.rules` deployed (`npx firebase deploy --only storage`) so the uploaded files are
 *     actually public-read.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const KEY_PATH = path.join(ROOT, 'serviceAccountKey.json');
const FIREBASE_TOOLS_CONFIG = path.join(os.homedir(), '.config/configstore/firebase-tools.json');
const BUCKET = 'quranki-506915.firebasestorage.app';
const DEST_ROOT = 'recitation-data';

// Public installed-app OAuth client used by the official `firebase-tools` CLI (not a secret;
// same constant ships in the open-source package). Only used to refresh the token this machine
// already obtained via `firebase login`.
const FIREBASE_TOOLS_CLIENT_ID = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_TOOLS_CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [, , localDirArg, destPrefixArg] = process.argv;
if (!localDirArg) {
  fail('Usage: node scripts/upload-recitation-data.js <localDir> [destinationPrefix]');
}

const localDir = path.resolve(localDirArg);
if (!fs.existsSync(localDir) || !fs.statSync(localDir).isDirectory()) {
  fail(`${localDir} is not a directory.`);
}

const destPrefix = [DEST_ROOT, destPrefixArg].filter(Boolean).join('/');

function publicUrlFor(destPath) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(destPath)}?alt=media`;
}

function formatBytes(bytes) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)}MB` : `${(bytes / 1024).toFixed(1)}KB`;
}

/** Returns a function that uploads a gzipped Buffer to `destPath` in the bucket. */
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

/** Reuses (and refreshes if needed) the OAuth token that `firebase login` cached locally. */
async function getFirebaseToolsAccessToken() {
  const config = JSON.parse(fs.readFileSync(FIREBASE_TOOLS_CONFIG, 'utf8'));
  const tokens = config.tokens;
  if (!tokens?.refresh_token) {
    fail('No refresh token in firebase-tools config. Run `npx firebase login` first.');
  }

  // Reuse the cached access token if it still has a couple minutes of headroom.
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

/** Simple multipart upload to the GCS JSON API, authenticated with a bearer access token. */
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
  const files = fs.readdirSync(localDir).filter((name) => name.endsWith('.json'));
  if (files.length === 0) fail(`No .json files found in ${localDir}`);

  const upload = await getUploader();
  console.log(`Gzipping and uploading ${files.length} file(s) to gs://${BUCKET}/${destPrefix}/ ...`);

  let totalOriginal = 0;
  let totalGzipped = 0;
  const destPaths = [];
  for (const name of files) {
    const localPath = path.join(localDir, name);
    const original = fs.readFileSync(localPath);
    const gzipped = zlib.gzipSync(original, { level: 9 });
    const gzName = `${name}.gz`;
    const destPath = `${destPrefix}/${gzName}`;

    await upload(destPath, gzipped);

    destPaths.push(destPath);
    totalOriginal += original.length;
    totalGzipped += gzipped.length;
    console.log(`  \u2713 ${name}: ${formatBytes(original.length)} -> ${formatBytes(gzipped.length)} -> ${destPath}`);
  }

  console.log(
    `\nTotal: ${formatBytes(totalOriginal)} -> ${formatBytes(totalGzipped)} (${((totalGzipped / totalOriginal) * 100).toFixed(0)}% of original)`,
  );
  console.log('\nPublic URLs:');
  for (const destPath of destPaths) {
    console.log(`  ${publicUrlFor(destPath)}`);
  }
  console.log('\nIn the app, fetch these with getRemoteDataset(storagePath) from lib/remote-dataset-cache.ts,');
  console.log(`e.g. getRemoteDataset(${JSON.stringify(destPaths[0] ?? `${destPrefix}/<file>.json.gz`)}).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
