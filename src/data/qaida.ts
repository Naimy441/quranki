import type { Level, Word } from '@/lib/levels';

/** Vocab levels start at 1. Qaida keeps a separate range so existing progress is untouched. */
export const QAIDA_FIRST_LEVEL = 1001;

const TATWEEL = '\u0640';
const FATHA = '\u064E';
const KASRA = '\u0650';
const DAMMA = '\u064F';
const FATHATAIN = '\u064B';
const KASRATAIN = '\u064D';
const DAMMATAIN = '\u064C';
const SUKOON = '\u0652';
const SHADDAH = '\u0651';
const DAGGER_ALIF = '\u0670';

interface Letter {
  key: string;
  isolated: string;
  /** Seat used with short vowels (alif uses hamza-on-alif). */
  seat: string;
  name: string;
  /** Latin onset for ba / bi / bu. Empty for alif, which is just the vowel. */
  sound: string;
  connects: boolean;
}

const LETTERS: Letter[] = [
  { key: 'alif', isolated: 'ا', seat: 'أ', name: 'Alif', sound: '', connects: false },
  { key: 'baa', isolated: 'ب', seat: 'ب', name: 'Bā', sound: 'b', connects: true },
  { key: 'taa', isolated: 'ت', seat: 'ت', name: 'Tā', sound: 't', connects: true },
  { key: 'thaa', isolated: 'ث', seat: 'ث', name: 'Thā', sound: 'th', connects: true },
  { key: 'jeem', isolated: 'ج', seat: 'ج', name: 'Jīm', sound: 'j', connects: true },
  { key: 'HA', isolated: 'ح', seat: 'ح', name: 'Ḥā', sound: 'ḥ', connects: true },
  { key: 'khaa', isolated: 'خ', seat: 'خ', name: 'Khā', sound: 'kh', connects: true },
  { key: 'daal', isolated: 'د', seat: 'د', name: 'Dāl', sound: 'd', connects: false },
  { key: 'dhaal', isolated: 'ذ', seat: 'ذ', name: 'Dhāl', sound: 'dh', connects: false },
  { key: 'raa', isolated: 'ر', seat: 'ر', name: 'Rā', sound: 'r', connects: false },
  { key: 'zay', isolated: 'ز', seat: 'ز', name: 'Zāy', sound: 'z', connects: false },
  { key: 'seen', isolated: 'س', seat: 'س', name: 'Sīn', sound: 's', connects: true },
  { key: 'sheen', isolated: 'ش', seat: 'ش', name: 'Shīn', sound: 'sh', connects: true },
  { key: 'saad', isolated: 'ص', seat: 'ص', name: 'Ṣād', sound: 'ṣ', connects: true },
  { key: 'dhaad', isolated: 'ض', seat: 'ض', name: 'Ḍād', sound: 'ḍ', connects: true },
  { key: 'TA', isolated: 'ط', seat: 'ط', name: 'Ṭā', sound: 'ṭ', connects: true },
  { key: 'THA', isolated: 'ظ', seat: 'ظ', name: 'Ẓā', sound: 'ẓ', connects: true },
  { key: 'ayn', isolated: 'ع', seat: 'ع', name: 'ʿAyn', sound: 'ʿ', connects: true },
  { key: 'ghayn', isolated: 'غ', seat: 'غ', name: 'Ghayn', sound: 'gh', connects: true },
  { key: 'faa', isolated: 'ف', seat: 'ف', name: 'Fā', sound: 'f', connects: true },
  { key: 'qaaf', isolated: 'ق', seat: 'ق', name: 'Qāf', sound: 'q', connects: true },
  { key: 'kaaf', isolated: 'ك', seat: 'ك', name: 'Kāf', sound: 'k', connects: true },
  { key: 'laam', isolated: 'ل', seat: 'ل', name: 'Lām', sound: 'l', connects: true },
  { key: 'meem', isolated: 'م', seat: 'م', name: 'Mīm', sound: 'm', connects: true },
  { key: 'noon', isolated: 'ن', seat: 'ن', name: 'Nūn', sound: 'n', connects: true },
  { key: 'ha', isolated: 'ه', seat: 'ه', name: 'Hā', sound: 'h', connects: true },
  { key: 'waw', isolated: 'و', seat: 'و', name: 'Wāw', sound: 'w', connects: false },
  { key: 'yaa', isolated: 'ي', seat: 'ي', name: 'Yā', sound: 'y', connects: true },
  { key: 'hamza', isolated: 'ء', seat: 'ء', name: 'Hamza', sound: '', connects: false },
];

const LETTER_BY_KEY = new Map(LETTERS.map((letter) => [letter.key, letter]));

function letter(key: string): Letter {
  const found = LETTER_BY_KEY.get(key);
  if (!found) throw new Error(`Unknown Qaida letter: ${key}`);
  return found;
}

/** User-specified harakat order, plus khaa so later reading tests are fair. */
const HARAKA_KEYS = [
  'alif',
  'ha',
  'ghayn',
  'HA',
  'khaa',
  'qaaf',
  'kaaf',
  'jeem',
  'sheen',
  'yaa',
  'dhaad',
  'laam',
  'noon',
  'raa',
  'TA',
  'daal',
  'taa',
  'saad',
  'seen',
  'zay',
  'THA',
  'dhaal',
  'thaa',
  'faa',
  'waw',
  'baa',
  'meem',
] as const;

const SHORT_VOWELS = [
  { key: 'fatha', mark: FATHA, name: 'Fatḥa', sound: 'a', alifSeat: 'أ' },
  { key: 'kasra', mark: KASRA, name: 'Kasra', sound: 'i', alifSeat: 'إ' },
  { key: 'damma', mark: DAMMA, name: 'Ḍamma', sound: 'u', alifSeat: 'أ' },
] as const;

const TANWEEN_VOWELS = [
  { key: 'fathatayn', mark: FATHATAIN, name: 'Fatḥatayn', sound: 'an', alifSeat: 'أ' },
  { key: 'kasratayn', mark: KASRATAIN, name: 'Kasratayn', sound: 'in', alifSeat: 'إ' },
  { key: 'dammatayn', mark: DAMMATAIN, name: 'Ḍammatayn', sound: 'un', alifSeat: 'أ' },
] as const;

function namesOf(keys: readonly string[]): string {
  return keys.map((key) => letter(key).name).join(' ');
}

function qaidaWord(id: string, arabic: string, english: string, note?: string): Word {
  return {
    id: `qaida-${id}`,
    arabic,
    english,
    kind: 'qaida',
    ...(note ? { note } : {}),
  };
}

function grammar(id: string, arabic: string, english: string, note: string): Word {
  return { id: `qaida-${id}`, kind: 'grammar', arabic, english, note };
}

function vowelSeat(item: Letter, alifSeat: string): string {
  if (item.key === 'alif') return alifSeat;
  if (item.key === 'hamza') return 'ء';
  return item.seat;
}

function shortReading(item: Letter, vowelSound: string): string {
  if (!item.sound) return vowelSound;
  return `${item.sound}${vowelSound}`;
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const groups: T[][] = [];
  for (let i = 0; i < items.length; i += size) groups.push(items.slice(i, i + size));
  return groups;
}

function alphabetLevel(number: number): Level {
  return {
    number,
    id: 'qaida-alphabet',
    title: 'The alphabet',
    words: [
      grammar(
        'alphabet-intro',
        'ا ب ت ث',
        'Name each letter',
        'Learn the 29 letters, including hamza. Say the name. Shape comes first; vowels come later.',
      ),
      ...LETTERS.map((item) =>
        qaidaWord(
          `name-${item.key}`,
          item.isolated,
          item.name,
          item.connects ? undefined : 'This letter does not connect to the next letter.',
        ),
      ),
    ],
  };
}

function connectedLevel(number: number): Level {
  const groups: { id: string; arabic: string; names: string }[] = [
    { id: 'bathath', arabic: 'بتث', names: namesOf(['baa', 'taa', 'thaa']) },
    { id: 'jeemhaakhaa', arabic: 'جحخ', names: namesOf(['jeem', 'HA', 'khaa']) },
    { id: 'daaldhaal', arabic: 'دذ', names: namesOf(['daal', 'dhaal']) },
    { id: 'raazay', arabic: 'رز', names: namesOf(['raa', 'zay']) },
    { id: 'seensheen', arabic: 'سش', names: namesOf(['seen', 'sheen']) },
    { id: 'saaddhaad', arabic: 'صض', names: namesOf(['saad', 'dhaad']) },
    { id: 'taatha', arabic: 'طظ', names: namesOf(['TA', 'THA']) },
    { id: 'aynghayn', arabic: 'عغ', names: namesOf(['ayn', 'ghayn']) },
    { id: 'faaqaaf', arabic: 'فق', names: namesOf(['faa', 'qaaf']) },
    { id: 'kaaflaam', arabic: 'كل', names: namesOf(['kaaf', 'laam']) },
    { id: 'meemnoon', arabic: 'من', names: namesOf(['meem', 'noon']) },
    { id: 'hayaa', arabic: 'هي', names: namesOf(['ha', 'yaa']) },
    { id: 'bism', arabic: 'بسم', names: namesOf(['baa', 'seen', 'meem']) },
    { id: 'muhammad', arabic: 'محمد', names: namesOf(['meem', 'HA', 'meem', 'daal']) },
    { id: 'kitab', arabic: 'كتاب', names: namesOf(['kaaf', 'taa', 'alif', 'baa']) },
    { id: 'rahman', arabic: 'رحمن', names: namesOf(['raa', 'HA', 'meem', 'noon']) },
    { id: 'quran', arabic: 'قران', names: namesOf(['qaaf', 'raa', 'alif', 'noon']) },
    { id: 'islam', arabic: 'اسلام', names: namesOf(['alif', 'seen', 'laam', 'alif', 'meem']) },
  ];

  const forms = LETTERS.filter((item) => item.connects).map((item) =>
    qaidaWord(
      `form-${item.key}`,
      `${item.isolated} ${item.isolated}${TATWEEL} ${TATWEEL}${item.isolated}${TATWEEL} ${TATWEEL}${item.isolated}`,
      item.name,
      'Isolated, start, middle, and end',
    ),
  );

  return {
    number,
    id: 'qaida-connected',
    title: 'Connected letters',
    words: [
      grammar(
        'connected-intro',
        `${TATWEEL}ب${TATWEEL}`,
        'Find the letter inside the word',
        'The same letter changes shape at the start, middle, and end. Name every letter in the string.',
      ),
      ...forms,
      ...groups.map((group) => qaidaWord(`join-${group.id}`, group.arabic, group.names)),
    ],
  };
}

const MADDAH = '\u0653';

/** Letters whose names take madd lāzim ḥarfī: hold 6 counts. Marked with maddah in the mushaf. */
const MUQATTAAT_SIX = new Set(['laam', 'meem', 'saad', 'kaaf', 'ayn', 'seen', 'qaaf', 'noon']);

function muqattaatLetterArabic(key: string): string {
  const glyph = letter(key).isolated;
  return MUQATTAAT_SIX.has(key) ? `${glyph}${MADDAH}` : glyph;
}

function muqattaatLetterNote(key: string): string {
  if (key === 'alif') return 'Alif has no stretch. Just say the name.';
  if (MUQATTAAT_SIX.has(key)) return 'Madd lāzim. Hold the name for 6 counts.';
  return 'Madd ṭabīʿī. Hold the name for 2 counts.';
}

function muqattaatLevel(number: number): Level {
  const stretched = ['alif', 'laam', 'meem', 'saad', 'raa', 'kaaf', 'ha', 'yaa', 'ayn', 'TA', 'seen', 'qaaf', 'noon', 'HA'];

  const combos: { id: string; arabic: string; reading: string }[] = [
    { id: 'alm', arabic: `ال${MADDAH}م${MADDAH}`, reading: namesOf(['alif', 'laam', 'meem']) },
    { id: 'alms', arabic: `ال${MADDAH}م${MADDAH}ص${MADDAH}`, reading: namesOf(['alif', 'laam', 'meem', 'saad']) },
    { id: 'alr', arabic: `ال${MADDAH}ر`, reading: namesOf(['alif', 'laam', 'raa']) },
    { id: 'almr', arabic: `ال${MADDAH}م${MADDAH}ر`, reading: namesOf(['alif', 'laam', 'meem', 'raa']) },
    { id: 'khyas', arabic: `ك${MADDAH}هيع${MADDAH}ص${MADDAH}`, reading: namesOf(['kaaf', 'ha', 'yaa', 'ayn', 'saad']) },
    { id: 'TH', arabic: 'طه', reading: namesOf(['TA', 'ha']) },
    { id: 'tsm', arabic: `طس${MADDAH}م${MADDAH}`, reading: namesOf(['TA', 'seen', 'meem']) },
    { id: 'ts', arabic: `طس${MADDAH}`, reading: namesOf(['TA', 'seen']) },
    { id: 'ys', arabic: `يس${MADDAH}`, reading: namesOf(['yaa', 'seen']) },
    { id: 'sad', arabic: `ص${MADDAH}`, reading: letter('saad').name },
    { id: 'hm', arabic: `حم${MADDAH}`, reading: namesOf(['HA', 'meem']) },
    { id: 'asq', arabic: `ع${MADDAH}س${MADDAH}ق${MADDAH}`, reading: namesOf(['ayn', 'seen', 'qaaf']) },
    { id: 'qaf', arabic: `ق${MADDAH}`, reading: letter('qaaf').name },
    { id: 'noon', arabic: `ن${MADDAH}`, reading: letter('noon').name },
  ];

  return {
    number,
    id: 'qaida-muqattaat',
    title: 'Huruf muqattaat',
    words: [
      grammar(
        'muqattaat-intro',
        `ال${MADDAH}م${MADDAH}`,
        'Stretch the letter names',
        'These are the opening letters of some surahs. A maddah (ٓ) is madd lāzim: hold that name for 6 counts. Letters without it are held for 2 counts, except Alif, which has no stretch.',
      ),
      ...stretched.map((key) =>
        qaidaWord(`madd-name-${key}`, muqattaatLetterArabic(key), letter(key).name, muqattaatLetterNote(key)),
      ),
      ...combos.map((item) =>
        qaidaWord(`huruf-${item.id}`, item.arabic, item.reading, 'Hold 6 counts on each maddah. Two counts on a letter with no mark.'),
      ),
    ],
  };
}

function harakaLevels(startNumber: number): Level[] {
  const keys = HARAKA_KEYS.map((key) => letter(key));
  return chunk(keys, 7).map((group, index) => ({
    number: startNumber + index,
    id: `qaida-haraka-${index + 1}`,
    title: `Fatḥa, kasra, ḍamma ${index + 1}`,
    words: [
      grammar(
        `haraka-intro-${index + 1}`,
        `بَ بِ بُ`,
        'Three short vowels',
        'Fatḥa is a, kasra is i, ḍamma is u. Read the letter plus the vowel: ba, bi, bu.',
      ),
      ...group.flatMap((item) =>
        SHORT_VOWELS.map((vowel) => {
          const seat = vowelSeat(item, vowel.alifSeat);
          const arabic = `${seat}${vowel.mark}`;
          return qaidaWord(
            `haraka-${item.key}-${vowel.key}`,
            arabic,
            shortReading(item, vowel.sound),
            vowel.name,
          );
        }),
      ),
    ],
  }));
}

function tanweenLevels(startNumber: number): Level[] {
  const keys = [...HARAKA_KEYS].reverse().map((key) => letter(key));
  return chunk(keys, 7).map((group, index) => ({
    number: startNumber + index,
    id: `qaida-tanween-${index + 1}`,
    title: `Tanwīn ${index + 1}`,
    words: [
      grammar(
        `tanween-intro-${index + 1}`,
        `بً بٍ بٌ`,
        'Two vowels at the end',
        'Fatḥatayn is an, kasratayn is in, ḍammatayn is un. Read ban, bin, bun.',
      ),
      ...group.flatMap((item) =>
        TANWEEN_VOWELS.map((vowel) => {
          const seat = vowelSeat(item, vowel.alifSeat);
          const arabic =
            vowel.key === 'fathatayn' && item.key !== 'alif' && item.key !== 'hamza' && item.connects
              ? `${seat}${vowel.mark}ا`
              : `${seat}${vowel.mark}`;
          return qaidaWord(
            `tanween-${item.key}-${vowel.key}`,
            arabic,
            shortReading(item, vowel.sound),
            vowel.name,
          );
        }),
      ),
    ],
  }));
}

function readingLevel(
  number: number,
  id: string,
  title: string,
  intro: { arabic: string; english: string; note: string },
  items: { id: string; arabic: string; reading: string }[],
): Level {
  return {
    number,
    id: `qaida-${id}`,
    title,
    words: [
      grammar(`${id}-intro`, intro.arabic, intro.english, intro.note),
      ...items.map((item) => qaidaWord(`${id}-${item.id}`, item.arabic, item.reading)),
    ],
  };
}

/** Untitled4.png - first reading test after tanween. */
const TEST_HARAKA: { id: string; arabic: string; reading: string }[] = [
  { id: 'abadan', arabic: 'أَبْدًا', reading: 'abadan' },
  { id: 'uhudun', arabic: 'أُحُدٌ', reading: 'uḥudun' },
  { id: 'akhadha', arabic: 'أَخَذَ', reading: 'akhadha' },
  { id: 'udhina', arabic: 'أُذِنَ', reading: 'udhina' },
  { id: 'amara', arabic: 'أَمَرَ', reading: 'amara' },
  { id: 'ana', arabic: 'أَنَا', reading: 'anā' },
  { id: 'bakhila', arabic: 'بَخِلَ', reading: 'bakhila' },
  { id: 'bararatin', arabic: 'بَرَرَةٍ', reading: 'bararatin' },
  { id: 'jaala', arabic: 'جَعَلَ', reading: 'jaʿala' },
  { id: 'jamaa', arabic: 'جَمَعَ', reading: 'jamaʿa' },
  { id: 'hasada', arabic: 'حَسَدَ', reading: 'ḥasada' },
  { id: 'hashara', arabic: 'حَشَرَ', reading: 'ḥashara' },
  { id: 'khashiya', arabic: 'خَشِيَ', reading: 'khashiya' },
  { id: 'khalaqa', arabic: 'خَلَقَ', reading: 'khalaqa' },
  { id: 'khuliqa', arabic: 'خُلِقَ', reading: 'khuliqa' },
  { id: 'dhakara', arabic: 'ذَكَرَ', reading: 'dhakara' },
  { id: 'rafaa', arabic: 'رَفَعَ', reading: 'rafaʿa' },
  { id: 'raqabatan', arabic: 'رَقَبَةً', reading: 'raqabatan' },
  { id: 'sururun', arabic: 'سُرُرٌ', reading: 'sururun' },
  { id: 'safaratin', arabic: 'سَفَرَةٍ', reading: 'safaratin' },
  { id: 'suhufan', arabic: 'صُحُفًا', reading: 'ṣuḥufan' },
  { id: 'wasatan', arabic: 'وَسَطًا', reading: 'wasaṭan' },
  { id: 'tabaqin', arabic: 'طَبَقٍ', reading: 'ṭabaqin' },
  { id: 'tabaqan', arabic: 'طَبَقًا', reading: 'ṭabaqan' },
  { id: 'tuwa', arabic: 'طُوَىٰ', reading: 'ṭuwā' },
  { id: 'abasa', arabic: 'عَبَسَ', reading: 'ʿabasa' },
  { id: 'adala', arabic: 'عَدَلَ', reading: 'ʿadala' },
  { id: 'alaqin', arabic: 'عَلَقٍ', reading: 'ʿalaqin' },
  { id: 'amadin', arabic: 'عَمَدٍ', reading: 'ʿamadin' },
  { id: 'inaban', arabic: 'عِنَبًا', reading: 'ʿinaban' },
  { id: 'ghabaratun', arabic: 'غَبَرَةٌ', reading: 'ghabaratun' },
  { id: 'faala', arabic: 'فَعَلَ', reading: 'faʿala' },
  { id: 'qataratun', arabic: 'قَتَرَةٌ', reading: 'qataratun' },
  { id: 'qutila', arabic: 'قُتِلَ', reading: 'qutila' },
  { id: 'qadara', arabic: 'قَدَرَ', reading: 'qadara' },
  { id: 'quria', arabic: 'قُرِئَ', reading: 'quriʾa' },
];

const MADD_KEYS = ['thaa', 'baa', 'taa', 'jeem', 'seen', 'ayn', 'faa', 'kaaf', 'laam', 'meem', 'noon', 'ha'] as const;

function maddLevel(number: number): Level {
  const letters = MADD_KEYS.map((key) => letter(key));
  const longVowels = [
    { key: 'aa', mark: `${FATHA}ا`, sound: 'ā', name: 'Alif madd' },
    { key: 'ee', mark: `${KASRA}ي`, sound: 'ī', name: 'Yā madd' },
    { key: 'oo', mark: `${DAMMA}و`, sound: 'ū', name: 'Wāw madd' },
  ] as const;

  return {
    number,
    id: 'qaida-madd',
    title: 'Long vowels',
    words: [
      grammar(
        'madd-intro',
        `ثَا ثِي ثُو`,
        'Hold ā, ī, and ū',
        'A dagger fatḥa is a small alif: it makes ā. Then alif, yā, and wāw stretch the three vowels: thā, thī, thū.',
      ),
      ...letters.map((item) =>
        qaidaWord(
          `dagger-${item.key}`,
          `${item.seat}${FATHA}${TATWEEL}${DAGGER_ALIF}`,
          `${item.sound}ā`,
          'Dagger fatḥa',
        ),
      ),
      qaidaWord('dagger-hadha', 'هَٰذَا', 'hādhā', 'Dagger fatḥa on hā'),
      qaidaWord('dagger-dhalika', 'ذَٰلِكَ', 'dhālika', 'Dagger fatḥa on dhāl'),
      ...letters.flatMap((item) =>
        longVowels.map((vowel) =>
          qaidaWord(`madd-${item.key}-${vowel.key}`, `${item.seat}${vowel.mark}`, `${item.sound}${vowel.sound}`, vowel.name),
        ),
      ),
    ],
  };
}

function leenLevel(number: number): Level {
  const letters = MADD_KEYS.map((key) => letter(key));
  return {
    number,
    id: 'qaida-leen',
    title: 'Ay and aw',
    words: [
      grammar(
        'leen-intro',
        `ثَيْ ثَوْ`,
        'Soft ay and aw',
        'Fatḥa plus yā with sukoon is ay. Fatḥa plus wāw with sukoon is aw. Read thay, thaw.',
      ),
      ...letters.flatMap((item) => [
        qaidaWord(`leen-${item.key}-ay`, `${item.seat}${FATHA}ي${SUKOON}`, `${item.sound}ay`, 'Ay'),
        qaidaWord(`leen-${item.key}-aw`, `${item.seat}${FATHA}و${SUKOON}`, `${item.sound}aw`, 'Aw'),
      ]),
    ],
  };
}

/** Untitled3.png - madd and leen test. */
const TEST_MADD: { id: string; arabic: string; reading: string }[] = [
  { id: 'amana', arabic: 'ءَامَنَ', reading: 'āmana' },
  { id: 'awa', arabic: 'ءَاوَىٰ', reading: 'āwā' },
  { id: 'aniyatin', arabic: 'ءَانِيَةٍ', reading: 'āniyatin' },
  { id: 'ilafi', arabic: 'إِلَٰفِ', reading: 'ilāfi' },
  { id: 'ayna', arabic: 'أَيْنَ', reading: 'ayna' },
  { id: 'bihi', arabic: 'بِهِۦ', reading: 'bihi' },
  { id: 'jaa', arabic: 'جَاءَ', reading: 'jāʾa' },
  { id: 'jaai', arabic: 'جَائِي', reading: 'jāʾī' },
  { id: 'juin', arabic: 'جُوعٍ', reading: 'jūʿin' },
  { id: 'khawfin', arabic: 'خَوْفٍ', reading: 'khawfin' },
  { id: 'khayrun', arabic: 'خَيْرٌ', reading: 'khayrun' },
  { id: 'dawud', arabic: 'دَاوُۥدُ', reading: 'dāwūdu' },
  { id: 'dhalika', arabic: 'ذَٰلِكَ', reading: 'dhālika' },
  { id: 'radu', arabic: 'رَضُوا', reading: 'raḍū' },
  { id: 'shaa', arabic: 'شَاءَ', reading: 'shāʾa' },
  { id: 'maliki', arabic: 'مَلِكِ', reading: 'maliki' },
  { id: 'shayin', arabic: 'شَيْءٍ', reading: 'shayʾin' },
  { id: 'tagha', arabic: 'طَغَىٰ', reading: 'ṭaghā' },
  { id: 'taghaw', arabic: 'طَغَوْا', reading: 'ṭaghaw' },
  { id: 'tayran', arabic: 'طَيْرًا', reading: 'ṭayran' },
  { id: 'adin', arabic: 'عَادٍ', reading: 'ʿādin' },
  { id: 'ala', arabic: 'عَلَىٰ', reading: 'ʿalā' },
  { id: 'aynun', arabic: 'عَيْنٌ', reading: 'ʿaynun' },
  { id: 'fihi', arabic: 'فِيهِ', reading: 'fīhi' },
  { id: 'qala', arabic: 'قَالَ', reading: 'qāla' },
  { id: 'qawlun', arabic: 'قَوْلٌ', reading: 'qawlun' },
  { id: 'kana', arabic: 'كَانَ', reading: 'kāna' },
  { id: 'kaydan', arabic: 'كَيْدًا', reading: 'kaydan' },
  { id: 'kayfa', arabic: 'كَيْفَ', reading: 'kayfa' },
  { id: 'lawhin', arabic: 'لَوْحٍ', reading: 'lawḥin' },
  { id: 'laysa', arabic: 'لَيْسَ', reading: 'laysa' },
  { id: 'malan', arabic: 'مَالًا', reading: 'mālan' },
  { id: 'naran', arabic: 'نَارًا', reading: 'nāran' },
  { id: 'main', arabic: 'مَاءٍ', reading: 'māʾin' },
  { id: 'waylun', arabic: 'وَيْلٌ', reading: 'waylun' },
  { id: 'yawmin', arabic: 'يَوْمٍ', reading: 'yawmin' },
];

const SUKOON_KEYS = [
  'baa',
  'taa',
  'thaa',
  'jeem',
  'HA',
  'daal',
  'dhaal',
  'raa',
  'zay',
  'seen',
  'sheen',
  'saad',
  'dhaad',
  'TA',
  'THA',
  'qaaf',
] as const;

const QALQALA = new Set(['baa', 'jeem', 'daal', 'TA', 'qaaf']);

function sukoonLevel(number: number): Level {
  return {
    number,
    id: 'qaida-sukoon',
    title: 'Sukoon and qalqala',
    words: [
      grammar(
        'sukoon-intro',
        'أَبْ',
        'Stop the vowel',
        'Sukoon means no vowel. On qāf, ṭā, bā, jīm, and dāl, give a light bounce. That bounce is qalqala.',
      ),
      ...SUKOON_KEYS.flatMap((key) => {
        const item = letter(key);
        const note = QALQALA.has(key) ? 'Qalqala' : 'Sukoon';
        return SHORT_VOWELS.map((vowel) =>
          qaidaWord(
            `sukoon-${item.key}-${vowel.key}`,
            `${vowel.alifSeat}${vowel.mark}${item.seat}${SUKOON}`,
            `${vowel.sound}${item.sound}`,
            note,
          ),
        );
      }),
    ],
  };
}

/** image.png - sukoon and qalqala test. */
const TEST_SUKOON: { id: string; arabic: string; reading: string }[] = [
  { id: 'anta', arabic: 'أَنْتَ', reading: 'anta' },
  { id: 'ihdi', arabic: 'إِهْدِ', reading: 'ihdi' },
  { id: 'badu', arabic: 'بَعْدُ', reading: 'baʿdu' },
  { id: 'batsha', arabic: 'بَطْشَ', reading: 'baṭsha' },
  { id: 'saa', arabic: 'سَعَىٰ', reading: 'saʿā' },
  { id: 'kuntu', arabic: 'كُنْتُ', reading: 'kuntu' },
  { id: 'lasta', arabic: 'لَسْتَ', reading: 'lasta' },
  { id: 'amrin', arabic: 'أَمْرٍ', reading: 'amrin' },
  { id: 'bardan', arabic: 'بَرْدًا', reading: 'bardan' },
  { id: 'jaman', arabic: 'جَمْعًا', reading: 'jamʿan' },
  { id: 'hablun', arabic: 'حَبْلٌ', reading: 'ḥablun' },
  { id: 'husrin', arabic: 'حُسْرٍ', reading: 'ḥusrin' },
  { id: 'khalqan', arabic: 'خَلْقًا', reading: 'khalqan' },
  { id: 'sabhan', arabic: 'سَبْحًا', reading: 'sabḥan' },
  { id: 'sabqan', arabic: 'سَبْقًا', reading: 'sabqan' },
  { id: 'shanun', arabic: 'شَأْنٌ', reading: 'shaʾnun' },
  { id: 'subhan', arabic: 'صُبْحًا', reading: 'ṣubḥan' },
  { id: 'dabhan', arabic: 'ضَبْحًا', reading: 'ḍabḥan' },
  { id: 'abdan', arabic: 'عَبْدًا', reading: 'ʿabdan' },
  { id: 'adnin', arabic: 'عَدْنٍ', reading: 'ʿadnin' },
  { id: 'ashrin', arabic: 'عَشْرٍ', reading: 'ʿashrin' },
  { id: 'asfin', arabic: 'عَصْفٍ', reading: 'ʿaṣfin' },
  { id: 'gharqan', arabic: 'غَرْقًا', reading: 'gharqan' },
];

function shaddahArabic(first: string, firstMark: string, doubled: string, doubledMarks: string): string {
  return `${first}${firstMark}${doubled}${SHADDAH}${doubledMarks}`;
}

function shaddahLevel(number: number): Level {
  const firsts = [
    { key: 'a', seat: 'أ', mark: FATHA, sound: 'a' },
    { key: 'u', seat: 'أ', mark: DAMMA, sound: 'u' },
    { key: 'i', seat: 'إ', mark: KASRA, sound: 'i' },
  ] as const;
  const seconds = [
    { key: 'a', mark: FATHA, sound: 'a' },
    { key: 'u', mark: DAMMA, sound: 'u' },
    { key: 'i', mark: KASRA, sound: 'i' },
    { key: 'an', mark: `${FATHATAIN}ا`, sound: 'an' },
    { key: 'un', mark: DAMMATAIN, sound: 'un' },
    { key: 'in', mark: KASRATAIN, sound: 'in' },
  ] as const;

  const baCards = firsts.flatMap((first) =>
    seconds.map((second) =>
      qaidaWord(
        `shaddah-ba-${first.key}-${second.key}`,
        shaddahArabic(first.seat, first.mark, 'ب', second.mark),
        `${first.sound}bb${second.sound}`,
        'Shaddah on bā',
      ),
    ),
  );

  const taCards = firsts.map((first) =>
    qaidaWord(
      `shaddah-ta-${first.key}-a`,
      shaddahArabic(first.seat, first.mark, 'ت', FATHA),
      `${first.sound}tta`,
      'Shaddah on tā',
    ),
  );

  return {
    number,
    id: 'qaida-shaddah',
    title: 'Shaddah',
    words: [
      grammar(
        'shaddah-intro',
        'أَبَّ',
        'Double the letter',
        'Shaddah means the letter is said twice: first closed, then with its vowel. أَبَّ is abba.',
      ),
      ...baCards,
      ...taCards,
    ],
  };
}

/** untitled2.png - final mixed test. */
const TEST_FINAL: { id: string; arabic: string; reading: string }[] = [
  { id: 'marru', arabic: 'مَرُّوا', reading: 'marrū' },
  { id: 'rabbi', arabic: 'رَبِّي', reading: 'rabbī' },
  { id: 'muddat', arabic: 'مُدَّتْ', reading: 'muddat' },
  { id: 'huqqat', arabic: 'حُقَّتْ', reading: 'ḥuqqat' },
  { id: 'khaffat', arabic: 'خَفَّتْ', reading: 'khaffat' },
  { id: 'tabbat', arabic: 'تَبَّتْ', reading: 'tabbat' },
  { id: 'takhallat', arabic: 'تَخَلَّتْ', reading: 'takhallat' },
  { id: 'qaddamat', arabic: 'قَدَّمَتْ', reading: 'qaddamat' },
  { id: 'wassubhi', arabic: 'وَٱلصُّبْحِ', reading: 'waṣ-ṣubḥi' },
  { id: 'washshamsi', arabic: 'وَٱلشَّمْسِ', reading: 'wash-shamsi' },
  { id: 'washshafi', arabic: 'وَٱلشَّفْعِ', reading: 'wash-shafʿi' },
  { id: 'bissabri', arabic: 'بِٱلصَّبْرِ', reading: 'biṣ-ṣabri' },
  { id: 'wassayfi', arabic: 'وَٱلصَّيْفِ', reading: 'waṣ-ṣayfi' },
  { id: 'wallayli', arabic: 'وَٱلَّيْلِ', reading: 'wal-layli' },
];

function buildQaidaLevels(): Level[] {
  let n = QAIDA_FIRST_LEVEL;
  const levels: Level[] = [];
  const add = (level: Level) => {
    levels.push(level);
  };

  add(alphabetLevel(n++));
  add(connectedLevel(n++));
  add(muqattaatLevel(n++));
  for (const level of harakaLevels(n)) add(level);
  n += 4;
  for (const level of tanweenLevels(n)) add(level);
  n += 4;
  add(
    readingLevel(n++, 'test-haraka', 'Reading practice 1', {
      arabic: 'أَبْدًا',
      english: 'Read the word',
      note: 'Use fatḥa, kasra, ḍamma, and tanwīn. Say the whole word, then check the reading.',
    }, TEST_HARAKA),
  );
  add(maddLevel(n++));
  add(leenLevel(n++));
  add(
    readingLevel(n++, 'test-madd', 'Reading practice 2', {
      arabic: 'ءَامَنَ',
      english: 'Read the long vowels',
      note: 'Watch for ā, ī, ū, ay, and aw. A dagger fatḥa is also a long ā.',
    }, TEST_MADD),
  );
  add(sukoonLevel(n++));
  add(
    readingLevel(n++, 'test-sukoon', 'Reading practice 3', {
      arabic: 'أَنْتَ',
      english: 'Read with sukoon',
      note: 'Stop on the sukoon. Bounce on qalqala letters: qāf, ṭā, bā, jīm, and dāl.',
    }, TEST_SUKOON),
  );
  add(shaddahLevel(n++));
  add(
    readingLevel(n++, 'test-final', 'Reading practice 4', {
      arabic: 'مَرُّوا',
      english: 'Read with shaddah',
      note: 'Double the shaddah letter, then finish the word. After this, you can read Arabic.',
    }, TEST_FINAL),
  );

  return levels;
}

export const QAIDA_LEVELS: Level[] = buildQaidaLevels();
export const QAIDA_LAST_LEVEL = QAIDA_LEVELS[QAIDA_LEVELS.length - 1]?.number ?? QAIDA_FIRST_LEVEL;

export const QAIDA_STAGE_ID = 0;
