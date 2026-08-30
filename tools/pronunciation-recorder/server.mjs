import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const RECORDINGS = join(ROOT, 'recordings');
const INDEX = join(RECORDINGS, 'index.json');
const WORDS = join(ROOT, '..', '..', 'src', 'data', 'quranic-words.json');

const send = (res, status, body, type = 'application/json') => {
  res.writeHead(status, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
};

async function getWords() {
  const deck = JSON.parse(await readFile(WORDS, 'utf8'));
  let deckCard = 0;
  return deck.levels.flatMap((level) => level.words
    .filter((word) => word.kind !== 'grammar')
    .map((word, index) => ({ id: word.id, arabic: word.arabic, english: word.english, level: level.number, card: index + 1, deckCard: ++deckCard })));
}

async function getIndex() {
  try { return JSON.parse(await readFile(INDEX, 'utf8')); } catch { return {}; }
}

async function getTrimmedIds() {
  try {
    const files = await readdir(join(RECORDINGS, 'trimmed'));
    return files.filter((file) => file.endsWith('.webm')).map((file) => file.slice(0, -'.webm'.length));
  } catch { return []; }
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (req.method === 'GET' && url.pathname === '/api/words') return send(res, 200, JSON.stringify(await getWords()));
  if (req.method === 'GET' && url.pathname === '/api/index') return send(res, 200, JSON.stringify(await getIndex()));
  if (req.method === 'GET' && url.pathname === '/api/trimmed-ids') return send(res, 200, JSON.stringify(await getTrimmedIds()));
  if (req.method === 'GET' && url.pathname.startsWith('/recordings/')) {
    const trimmed = url.pathname.startsWith('/recordings/trimmed/');
    const file = url.pathname.slice(trimmed ? '/recordings/trimmed/'.length : '/recordings/'.length);
    if (!/^[a-zA-Z0-9-]+\.webm$/.test(file)) return send(res, 400, 'Invalid recording name.', 'text/plain');
    try { return send(res, 200, await readFile(join(RECORDINGS, trimmed ? 'trimmed' : '', file)), 'audio/webm'); }
    catch { return send(res, 404, 'Not found', 'text/plain'); }
  }
  if (req.method === 'POST' && url.pathname === '/api/recordings') {
    const id = url.searchParams.get('id') ?? '';
    if (!/^[a-zA-Z0-9-]+$/.test(id)) return send(res, 400, JSON.stringify({ error: 'Invalid word id.' }));
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const audio = Buffer.concat(chunks);
    if (!audio.length) return send(res, 400, JSON.stringify({ error: 'No audio received.' }));
    await mkdir(RECORDINGS, { recursive: true });
    await writeFile(join(RECORDINGS, `${id}.webm`), audio);
    const index = await getIndex();
    index[id] = { file: `${id}.webm`, bytes: audio.length, recordedAt: new Date().toISOString() };
    await writeFile(INDEX, `${JSON.stringify(index, null, 2)}\n`);
    // A replacement recording needs a fresh silence-trimming pass before review.
    await rm(join(RECORDINGS, 'trimmed', `${id}.webm`), { force: true });
    return send(res, 201, JSON.stringify(index[id]));
  }
  const file = url.pathname === '/' ? '/index.html' : url.pathname;
  const path = normalize(join(ROOT, 'public', file));
  if (!path.startsWith(join(ROOT, 'public'))) return send(res, 403, 'Forbidden', 'text/plain');
  try {
    const body = await readFile(path);
    return send(res, 200, body, extname(path) === '.html' ? 'text/html; charset=utf-8' : 'application/octet-stream');
  } catch { return send(res, 404, 'Not found', 'text/plain'); }
}).listen(4321, () => console.log('Pronunciation recorder: http://localhost:4321'));
