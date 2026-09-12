/**
 * Qaida clips through gpt-4o-mini-tts.
 *
 *   OPENAI_API_KEY=... npx tsx scripts/generate-qaida-tts.ts
 *   OPENAI_API_KEY=... npx tsx scripts/generate-qaida-tts.ts --all
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { QAIDA_LEVELS } from '../src/data/qaida.ts';

interface Word {
  id: string;
  arabic: string;
  english: string;
  kind?: string;
  note?: string;
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets', 'audio', 'qaida');
const MODEL = 'gpt-4o-mini-tts';
const VOICE = 'cedar';
const CARDS_PER_LEVEL = 2;
const ENDPOINT = 'https://api.openai.com/v1/audio/speech';

/** APFS is case-insensitive, so qaida-*-HA-* would overwrite qaida-*-ha-*. */
function clipFileName(id: string): string {
  return `${id.replace(/-HA(?=-|$)/g, '-hah')}.mp3`;
}

const LETTER_NAMES_AR: Record<string, string> = {
  Alif: 'أَلِف',
  Bā: 'بَاء',
  Tā: 'تَاء',
  Thā: 'ثَاء',
  Jīm: 'جِيم',
  Ḥā: 'حَاء',
  Khā: 'خَاء',
  Dāl: 'دَال',
  Dhāl: 'ذَال',
  Rā: 'رَاء',
  Zāy: 'زَاي',
  Sīn: 'سِين',
  Shīn: 'شِين',
  Ṣād: 'صَاد',
  Ḍād: 'ضَاد',
  Ṭā: 'طَاء',
  Ẓā: 'ظَاء',
  ʿAyn: 'عَيْن',
  Ghayn: 'غَيْن',
  Fā: 'فَاء',
  Qāf: 'قَاف',
  Kāf: 'كَاف',
  Lām: 'لَام',
  Mīm: 'مِيم',
  Nūn: 'نُون',
  Hā: 'هَاء',
  Wāw: 'وَاو',
  Yā: 'يَاء',
  Hamza: 'هَمْزَة',
};

const BASE_INSTRUCTIONS = [
  'You are a careful Quran teacher speaking Classical Arabic only.',
  'Pronounce with clear makharij and light tajweed.',
  'Speak slowly, as if teaching a beginner.',
  'Say only the target Arabic. No English, no extra words, no explanation.',
].join(' ');

function arabicLetterNames(english: string): string | undefined {
  const parts = english.split(/\s+/).filter(Boolean);
  const names = parts.map((part) => LETTER_NAMES_AR[part]);
  if (names.length === 0 || names.some((name) => !name)) return undefined;
  return names.join(' ');
}

const SIX_COUNT_NAMES = new Set(['Lām', 'Mīm', 'Ṣād', 'Kāf', 'ʿAyn', 'Sīn', 'Qāf', 'Nūn']);
const TWO_COUNT_NAMES = new Set(['Rā', 'Hā', 'Yā', 'Ṭā', 'Ḥā']);

function muqattaatGuide(word: Word): { input: string; instructions: string; speed?: number } | undefined {
  const isMuqattaat = word.id.startsWith('qaida-madd-name-') || word.id.startsWith('qaida-huruf-');
  if (!isMuqattaat) return undefined;

  const parts = word.english.split(/\s+/).filter(Boolean);
  const spoken = parts.map((name) => LETTER_NAMES_AR[name] ?? name).join(' ');
  const hasSix = parts.some((name) => SIX_COUNT_NAMES.has(name));

  return {
    input: spoken,
    instructions:
      BASE_INSTRUCTIONS +
      ' Recite this as a real Arabic word, the same way you recite ءَامَنَ.' +
      ' The fatḥa plus alif (or kasra plus yā, ḍamma plus wāw) is the long vowel. Keep it one word.' +
      (hasSix
        ? ' Hold that long vowel longer than usual, about 6 counts, then close the last letter.'
        : TWO_COUNT_NAMES.has(parts[0] ?? '')
          ? ' Hold the long vowel for 2 counts only.'
          : ' Alif has no stretch. Just say أَلِف.') +
      ' Do not say English. Do not explain.',
  };
}

function tanweenGuide(word: Word): { input: string; instructions: string } | undefined {
  if (!word.id.includes('-tanween-')) return undefined;

  const seat = word.arabic.replace(/[\u064B-\u064D\u0640\u0627]/g, '');
  const vowel =
    word.note === 'Kasratayn' ? '\u0650' : word.note === 'Ḍammatayn' ? '\u064F' : '\u064E';
  const guided = `${seat}${vowel}ن\u0652`;
  return {
    input: guided,
    instructions:
      BASE_INSTRUCTIONS +
      ` This is tanwīn. The written card is ${word.arabic}, but the sound is ${guided}.` +
      ' Say that one short syllable only: a short vowel, then a light noon.' +
      ' Do not stretch into a long vowel. Do not name the letter. Do not add extra words.',
  };
}

function ttsForCard(word: Word): { input: string; instructions: string; speed?: number } {
  const muqattaat = muqattaatGuide(word);
  if (muqattaat) return muqattaat;

  const isLetterName =
    word.id.startsWith('qaida-name-') ||
    word.id.startsWith('qaida-form-') ||
    word.id.startsWith('qaida-join-');

  if (isLetterName) {
    const spoken = arabicLetterNames(word.english) ?? word.arabic;
    return { input: spoken, instructions: BASE_INSTRUCTIONS + ' Say the Arabic letter name clearly.' };
  }

  const tanween = tanweenGuide(word);
  if (tanween) return tanween;

  let extra = ' Recite the written Arabic exactly once.';
  if (word.note === 'Qalqala') extra += ' Give a light qalqala bounce on the sukoon letter.';
  if (word.note?.toLowerCase().includes('shaddah')) extra += ' Double the shaddah letter.';
  if (word.note?.toLowerCase().includes('dagger')) extra += ' The dagger alif is a long aa.';
  if (word.note?.includes('Alif madd') || word.note?.includes('Yā madd') || word.note?.includes('Wāw madd')) {
    extra += ' Hold the long vowel for 2 counts.';
  }

  return { input: word.arabic, instructions: BASE_INSTRUCTIONS + extra };
}

function pickCards(onlyIds?: Set<string>, all = false): { levelNumber: number; title: string; word: Word }[] {
  const picked: { levelNumber: number; title: string; word: Word }[] = [];
  for (const level of QAIDA_LEVELS) {
    const study = onlyIds
      ? level.words.filter((word) => onlyIds.has(word.id))
      : all
        ? level.words.filter((word) => word.kind === 'qaida')
        : level.words.filter((word) => word.kind === 'qaida').slice(0, CARDS_PER_LEVEL);
    for (const word of study) {
      picked.push({ levelNumber: level.number, title: level.title, word });
    }
  }
  return picked;
}

async function synthesize(
  apiKey: string,
  input: string,
  instructions: string,
  speed = 0.9,
): Promise<Buffer> {
  let lastError = 'TTS failed';
  for (let attempt = 1; attempt <= 5; attempt++) {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        voice: VOICE,
        input,
        instructions,
        response_format: 'mp3',
        speed,
      }),
    });

    if (response.ok) return Buffer.from(await response.arrayBuffer());

    lastError = `TTS ${response.status}: ${(await response.text()).slice(0, 400)}`;
    if (response.status !== 429 && response.status < 500) throw new Error(lastError);
    await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
  }
  throw new Error(lastError);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }

  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const onlyIds = args.filter((arg) => !arg.startsWith('-'));
  const cards = pickCards(onlyIds.length ? new Set(onlyIds) : undefined, all || !onlyIds.length);
  if (onlyIds.length && cards.length !== onlyIds.length) {
    const found = new Set(cards.map((card) => card.word.id));
    throw new Error(`Missing cards: ${onlyIds.filter((id) => !found.has(id)).join(', ')}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  type Manifest = {
    model: string;
    voice: string;
    generatedAt: string;
    clips: {
      id: string;
      level: number;
      title: string;
      arabic: string;
      english: string;
      spoken?: string;
      file: string;
      bytes: number;
    }[];
  };

  const manifestPath = path.join(OUT_DIR, 'manifest.json');
  const previous: Manifest | undefined = fs.existsSync(manifestPath)
    ? (JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Manifest)
    : undefined;
  const manifest: Manifest = {
    model: MODEL,
    voice: VOICE,
    generatedAt: new Date().toISOString(),
    clips: previous?.clips ?? [],
  };

  const pending = cards.filter((card) => !fs.existsSync(path.join(OUT_DIR, clipFileName(card.word.id))));
  console.log(
    `${cards.length} study cards, ${cards.length - pending.length} already exist, generating ${pending.length} with ${MODEL} (${VOICE})`,
  );

  const writeManifest = () => {
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  };

  for (const [index, card] of pending.entries()) {
    const { input, instructions, speed } = ttsForCard(card.word);
    const fileName = clipFileName(card.word.id);
    const filePath = path.join(OUT_DIR, fileName);
    process.stdout.write(
      `[${index + 1}/${pending.length}] ${card.title}  ${card.word.arabic}  ${card.word.english}  said ${input}\n`,
    );

    const audio = await synthesize(apiKey, input, instructions, speed);
    if (audio.length < 800) {
      throw new Error(`Clip for ${card.word.id} was too small (${audio.length} bytes)`);
    }
    fs.writeFileSync(filePath, audio);
    const clip = {
      id: card.word.id,
      level: card.levelNumber,
      title: card.title,
      arabic: card.word.arabic,
      english: card.word.english,
      spoken: input,
      file: `assets/audio/qaida/${fileName}`,
      bytes: audio.length,
    };
    const existing = manifest.clips.findIndex((entry) => entry.id === card.word.id);
    if (existing >= 0) manifest.clips[existing] = clip;
    else manifest.clips.push(clip);
    if ((index + 1) % 10 === 0) writeManifest();
  }

  writeManifest();
  console.log(`Wrote ${manifest.clips.length} manifest entries. Files in ${path.relative(ROOT, OUT_DIR)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
