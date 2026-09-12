/**
 * The 15 reciter+style combinations published to Firebase Storage (see
 * `scripts/upload-recitation-data.js` and `lib/reciter-dataset.ts`). Every one downloads on
 * demand and is cached on disk the same way - none ships pre-bundled in the app binary.
 *
 * Each `key` matches the uploaded dataset slug (`recitation-data/<key>.json.gz`) and is also
 * used to namespace that reciter's on-disk ayah-audio cache (see `lib/recitation-cache.ts`).
 */

export type RecitationStyle = 'murattal' | 'mujawwad';

export interface ReciterOption {
  key: string;
  reciterName: string;
  style: RecitationStyle;
}

export interface ReciterGroup {
  id: string;
  name: string;
  options: ReciterOption[];
}

export const DEFAULT_RECITER_KEY = 'dosari-murattal';

function group(id: string, name: string, options: Omit<ReciterOption, 'reciterName'>[]): ReciterGroup {
  return { id, name, options: options.map((option) => ({ ...option, reciterName: name })) };
}

export const RECITER_GROUPS: ReciterGroup[] = [
  group('husary', 'Mahmoud Khalil Al-Husary', [
    { key: 'husary-mujawwad', style: 'mujawwad' },
    { key: 'husary-murattal', style: 'murattal' },
  ]),
  group('abdul-basit', 'Abdul Basit Abdul Samad', [
    { key: 'abdul-basit-mujawwad', style: 'mujawwad' },
    { key: 'abdul-basit-murattal', style: 'murattal' },
  ]),
  group('afasy', 'Mishari Rashid Al-Afasy', [{ key: 'afasy-murattal', style: 'murattal' }]),
  group('dosari', 'Yasser Al-Dosari', [{ key: 'dosari-murattal', style: 'murattal' }]),
  group('ghamdi', 'Saad Al-Ghamdi', [{ key: 'ghamdi-murattal', style: 'murattal' }]),
  group('minshawi', 'Muhammad Siddiq Al-Minshawi', [{ key: 'minshawi-murattal', style: 'murattal' }]),
  group('muaiqly', "Maher Al-Mu'aiqly", [{ key: 'muaiqly-murattal', style: 'murattal' }]),
  group('rifai', 'Hani Ar-Rifai', [{ key: 'rifai-murattal', style: 'murattal' }]),
  group('shatri', 'Abu Bakr Al-Shatri', [{ key: 'shatri-murattal', style: 'murattal' }]),
  group('shuraim', 'Saud Al-Shuraim', [{ key: 'shuraim-murattal', style: 'murattal' }]),
  group('sudais', 'Abdul Rahman Al-Sudais', [{ key: 'sudais-murattal', style: 'murattal' }]),
  group('tablawi', 'Mohamed Al-Tablawi', [{ key: 'tablawi-murattal', style: 'murattal' }]),
  group('tunaiji', 'Khalifa Al-Tunaiji', [{ key: 'tunaiji-murattal', style: 'murattal' }]),
];

const OPTIONS_BY_KEY: Map<string, ReciterOption> = new Map(
  RECITER_GROUPS.flatMap((g) => g.options).map((option) => [option.key, option]),
);

export function findReciterOption(key: string): ReciterOption | undefined {
  return OPTIONS_BY_KEY.get(key);
}

export function isReciterKey(value: unknown): value is string {
  return typeof value === 'string' && OPTIONS_BY_KEY.has(value);
}

export function styleLabel(style: RecitationStyle): string {
  return style === 'mujawwad' ? 'Mujawwad' : 'Murattal';
}

export function reciterLabel(key: string): string {
  const option = findReciterOption(key);
  if (!option) return 'Unknown reciter';
  return `${option.reciterName} - ${styleLabel(option.style)}`;
}

/** Path of this reciter's per-ayah dataset in Firebase Storage (see `lib/remote-dataset-cache.ts`). */
export function reciterDatasetPath(key: string): string {
  return `recitation-data/${key}.json.gz`;
}
