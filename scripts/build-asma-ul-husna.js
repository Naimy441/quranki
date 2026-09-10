#!/usr/bin/env node
/**
 * Builds the 99 Names study levels and pins a Quran example for each name.
 * Cards do not carry lemmaIds: many names share everyday stems (مؤمن, حق, ولي),
 * and those lemmas are already taught in the regular curriculum.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const NAMES = [
  ['ٱلرَّحْمَٰنُ', 'The Most or Entirely Merciful', 'Ar-Raḥmān', { s: 1, a: 3 }, 'رحمن'],
  ['ٱلرَّحِيمُ', 'The Especially Merciful', 'Ar-Raḥīm', { s: 1, a: 3 }, 'رحيم'],
  ['ٱلْمَلِكُ', 'The King and Owner of Dominion', 'Al-Malik', { s: 59, a: 23 }, 'ملك'],
  ['ٱلْقُدُّوسُ', 'The Absolutely Pure and Perfect', 'Al-Quddūs', { s: 59, a: 23 }, 'قدوس'],
  ['ٱلسَّلَامُ', 'The Perfection and Giver of Peace', 'As-Salām', { s: 59, a: 23, p: 10 }, 'سلم'],
  ['ٱلْمُؤْمِنُ', 'The Granter of Security and Faith', "Al-Mu'min", { s: 59, a: 23 }, 'مؤمن'],
  ['ٱلْمُهَيْمِنُ', 'The Guardian, The Witness, The Overseer', 'Al-Muhaymin', { s: 59, a: 23 }, 'مهيمن'],
  ['ٱلْعَزِيزُ', 'The Almighty, The All-Powerful, The Invincible, The Honorable', "Al-'Azīz", { s: 59, a: 23 }, 'عزيز'],
  ['ٱلْجَبَّارُ', 'The Compeller, The Restorer', 'Al-Jabbār', { s: 59, a: 23 }, 'جبار'],
  ['ٱلْمُتَكَبِّرُ', 'The Supreme, The Majestic', 'Al-Mutakabbir', { s: 59, a: 23 }, 'متكبر'],
  ['ٱلْخَٰلِقُ', 'The Creator, The Maker', 'Al-Khāliq', { s: 59, a: 24, p: 3 }, 'خلق'],
  ['ٱلْبَارِئُ', 'The Originator, The Inventor', 'Al-Bāriʾ', { s: 59, a: 24 }, 'بارئ'],
  ['ٱلْمُصَوِّرُ', 'The Fashioner, The Shaper', 'Al-Muṣawwir', { s: 59, a: 24 }, 'مصور'],
  ['ٱلْغَفَّارُ', 'The Constant Forgiver, The Great Forgiver', 'Al-Ghaffār', { s: 20, a: 82 }, 'غفار'],
  ['ٱلْقَهَّارُ', 'The Subduer, The Ever-Dominating', 'Al-Qahhār', { s: 13, a: 16, p: 45 }, 'قهر'],
  ['ٱلْوَهَّابُ', 'The Giver of Gifts, The Bestower', 'Al-Wahhāb', { s: 3, a: 8 }, 'وهاب'],
  ['ٱلرَّزَّاقُ', 'The Ever-Providing, The Constant Provider', 'Ar-Razzāq', { s: 51, a: 58 }, 'رزاق'],
  ['ٱلْفَتَّاحُ', 'The Opener, The Judge', 'Al-Fattāḥ', { s: 34, a: 26 }, 'فتاح'],
  ['ٱلْعَلِيمُ', 'The All-Knowing, The Omniscient', 'Al-ʿAlīm', { s: 2, a: 32 }, 'عليم'],
  ['ٱلْقَابِضُ', 'The Withholder, The Restrainer', 'Al-Qābiḍ', { s: 2, a: 245 }, 'قبض'],
  ['ٱلْبَاسِطُ', 'The Extender, The Expander', 'Al-Bāsiṭ', { s: 2, a: 245, p: 14 }, 'بصط'],
  ['ٱلْخَافِضُ', 'The Reducer, The Abaser', 'Al-Khāfiḍ', { s: 56, a: 3, p: 1 }, 'خافضة'],
  ['ٱلرَّافِعُ', 'The Exalter, The Elevator', 'Ar-Rāfiʿ', { s: 56, a: 3, p: 2 }, 'رافعة'],
  ['ٱلْمُعِزُّ', 'The Honourer, The Bestower of Honor', 'Al-Muʿizz', { s: 3, a: 26 }, 'تعز'],
  ['ٱلْمُذِلُّ', 'The Dishonourer, The Humiliator', 'Al-Mudhill', { s: 3, a: 26 }, 'تذل'],
  ['ٱلسَّمِيعُ', 'The All-Hearing', 'As-Samīʿ', { s: 2, a: 127 }, 'سميع'],
  ['ٱلْبَصِيرُ', 'The All-Seeing', 'Al-Baṣīr', { s: 17, a: 1 }, 'بصير'],
  ['ٱلْحَكَمُ', 'The Judge, The Giver of Justice', 'Al-Ḥakam', { s: 6, a: 114 }, 'حكم'],
  ['ٱلْعَدْلُ', 'The Utterly Just', "Al-'Adl", { s: 6, a: 115 }, 'عدل'],
  ['ٱللَّطِيفُ', 'The Most Gentle, The Subtle One', 'Al-Laṭīf', { s: 6, a: 103 }, 'لطيف'],
  ['ٱلْخَبِيرُ', 'The All-Aware, The All-Acquainted', 'Al-Khabīr', { s: 6, a: 103 }, 'خبير'],
  ['ٱلْحَلِيمُ', 'The Most Forbearing', 'Al-Ḥalīm', { s: 2, a: 225 }, 'حليم'],
  ['ٱلْعَظِيمُ', 'The Magnificent, The Supreme', 'Al-ʿAẓīm', { s: 2, a: 255 }, 'عظيم'],
  ['ٱلْغَفُورُ', 'The Forgiving, The Exceedingly Forgiving', 'Al-Ghafūr', { s: 2, a: 173 }, 'غفور'],
  ['ٱلشَّكُورُ', 'The Most Appreciative', 'Ash-Shakūr', { s: 35, a: 30 }, 'شكور'],
  ['ٱلْعَلِيُّ', 'The Most High, The Exalted', 'Al-ʿAlī', { s: 2, a: 255 }, 'علي'],
  ['ٱلْكَبِيرُ', 'The Greatest, The Most Grand', 'Al-Kabīr', { s: 13, a: 9 }, 'كبير'],
  ['ٱلْحَفِيظُ', 'The Preserver, The All-Heedful and All-Protecting', 'Al-Ḥafīẓ', { s: 11, a: 57 }, 'حفيظ'],
  ['ٱلْمُقِيتُ', 'The Sustainer, The Maintainer', 'Al-Muqīt', { s: 4, a: 85 }, 'مقيت'],
  ['ٱلْحَسِيبُ', 'The Reckoner', 'Al-Ḥasīb', { s: 4, a: 86 }, 'حسيب'],
  ['ٱلْجَلِيلُ', 'The Majestic', 'Al-Jalīl', { s: 55, a: 27, p: 5 }, 'جلل'],
  ['ٱلْكَرِيمُ', 'The Most Generous, The Most Noble', 'Al-Karīm', { s: 82, a: 6 }, 'كريم'],
  ['ٱلرَّقِيبُ', 'The Watchful, The All-Watchful', 'Ar-Raqīb', { s: 4, a: 1 }, 'رقيب'],
  ['ٱلْمُجِيبُ', 'The Responsive, The Answerer', 'Al-Mujīb', { s: 11, a: 61 }, 'مجيب'],
  ['ٱلْوَاسِعُ', 'The All-Encompassing, the Boundless', 'Al-Wāsiʿ', { s: 2, a: 115, p: 11 }, 'وسع'],
  ['ٱلْحَكِيمُ', 'The All-Wise', 'Al-Ḥakīm', { s: 2, a: 32 }, 'حكيم'],
  ['ٱلْوَدُودُ', 'The Most Loving', 'Al-Wadūd', { s: 85, a: 14 }, 'ودود'],
  ['ٱلْمَجِيدُ', 'The Glorious, The Most Honorable', 'Al-Majīd', { s: 85, a: 15 }, 'مجيد'],
  ['ٱلْبَاعِثُ', 'The Infuser of New Life, The Resurrector', 'Al-Bāʿith', { s: 22, a: 7 }, 'بعث'],
  ['ٱلشَّهِيدُ', 'The All-Witnessing', 'As-Shahīd', { s: 3, a: 98 }, 'شهيد'],
  ['ٱلْحَقُّ', 'The Absolute Truth', 'Al-Ḥaqq', { s: 22, a: 6 }, 'حق'],
  ['ٱلْوَكِيلُ', 'The Trustee, The Disposer of Affairs', 'Al-Wakīl', { s: 3, a: 173 }, 'وكيل'],
  ['ٱلْقَوِيُّ', 'The All-Strong', 'Al-Qawiyy', { s: 22, a: 40 }, 'قوي'],
  ['ٱلْمَتِينُ', 'The Firm, The Steadfast', 'Al-Matīn', { s: 51, a: 58 }, 'متين'],
  ['ٱلْوَلِيُّ', 'The Protector, The Guardian', 'Al-Waliyy', { s: 2, a: 257 }, 'ولي'],
  ['ٱلْحَمِيدُ', 'The Praiseworthy, The Most Praised', 'Al-Ḥamīd', { s: 22, a: 64 }, 'حميد'],
  ['ٱلْمُحْصِي', 'The All-Enumerating, The Counter', 'Al-Muḥṣī', { s: 19, a: 94, p: 2 }, 'احص'],
  ['ٱلْمُبْدِئُ', 'The Originator, The Initiator', 'Al-Mubdiʾ', { s: 10, a: 4, p: 8 }, 'يبد'],
  ['ٱلْمُعِيدُ', 'The Restorer, The Reinstater', 'Al-Muʿīd', { s: 10, a: 4, p: 11 }, 'يعيد'],
  ['ٱلْمُحْيِي', 'The Giver of Life', 'Al-Muḥyī', { s: 30, a: 50 }, 'يحي'],
  ['ٱلْمُمِيتُ', 'The Creator of Death', 'Al-Mumīt', { s: 3, a: 156 }, 'يميت'],
  ['ٱلْحَيُّ', 'The Ever-Living', 'Al-Ḥayy', { s: 2, a: 255 }, 'الحي'],
  ['ٱلْقَيُّومُ', 'The Sustainer, The Self-Subsisting', 'Al-Qayyūm', { s: 2, a: 255 }, 'قيوم'],
  ['ٱلْوَاجِدُ', 'The Finder, The Perceiver', 'Al-Wājid', { s: 93, a: 7 }, 'وجدك'],
  ['ٱلْمَاجِدُ', 'The Illustrious, The Magnificent', 'Al-Mājid', { s: 11, a: 73 }, 'مجيد'],
  ['ٱلْوَاحِدُ', 'The One, The Indivisible', 'Al-Wāḥid', { s: 2, a: 163, p: 3 }, 'وحد'],
  ['ٱلْأَحَدُ', 'The Unique, The Only One', 'Al-Aḥad', { s: 112, a: 1 }, 'أحد'],
  ['ٱلصَّمَدُ', 'The Eternal, The Absolute', 'Aṣ-Ṣamad', { s: 112, a: 2 }, 'صمد'],
  ['ٱلْقَادِرُ', 'The Omnipotent, The All-Able', 'Al-Qādir', { s: 6, a: 65 }, 'قادر'],
  ['ٱلْمُقْتَدِرُ', 'The All-Powerful, The Dominant', 'Al-Muqtadir', { s: 54, a: 42 }, 'مقتدر'],
  ['ٱلْمُقَدِّمُ', 'The Expediter, The Promoter', 'Al-Muqaddim', { s: 15, a: 24, p: 3 }, 'مستقدم'],
  ['ٱلْمُؤَخِّرُ', 'The Delayer, The Postponer', 'Al-Muʾakhkhir', { s: 71, a: 4, p: 5 }, 'يؤخر'],
  ['ٱلْأَوَّلُ', 'The First, The Foremost', 'Al-Awwal', { s: 57, a: 3 }, 'الأول'],
  ['ٱلْآخِرُ', 'The Last, The Utmost', 'Al-Ākhir', { s: 57, a: 3 }, 'الآخر'],
  ['ٱلظَّاهِرُ', 'The Manifest, The All-Surpassing', 'Aẓ-Ẓāhir', { s: 57, a: 3, p: 4 }, 'ظهر'],
  ['ٱلْبَاطِنُ', 'The Hidden One, Knower of the Hidden', 'Al-Bāṭin', { s: 57, a: 3 }, 'الباطن'],
  ['ٱلْوَالِي', 'The Sole Governor', 'Al-Wālī', { s: 13, a: 11 }, 'وال'],
  ['ٱلْمُتَعَالِي', 'The Self-Exalted', 'Al-Mutaʿālī', { s: 13, a: 9 }, 'متعال'],
  ['ٱلْبَرُّ', 'The Source of All Goodness', 'Al-Barr', { s: 52, a: 28 }, 'البر'],
  ['ٱلتَّوَابُ', 'The Ever-Pardoning', 'At-Tawwāb', { s: 2, a: 37 }, 'تواب'],
  ['ٱلْمُنْتَقِمُ', 'The Avenger', 'Al-Muntaqim', { s: 32, a: 22 }, 'منتقمون'],
  ['ٱلْعَفُوُّ', 'The Pardoner', 'Al-ʿAfūw', { s: 4, a: 99 }, 'عفو'],
  ['ٱلرَّءُوفُ', 'The Most Kind', 'Ar-Raʾūf', { s: 2, a: 143 }, 'رءوف'],
  ['مَالِكُ ٱلْمُلْكِ', 'Master of the Dominion, Owner of the Kingdom', 'Mālik al-Mulk', { s: 3, a: 26, p: 3, n: 2 }, 'ملك'],
  ['ذُو ٱلْجَلَالِ وَٱلْإِكْرَامِ', 'Possessor of Glory and Honour', "Dhū al-Jalāli wa'l-Ikrām", { s: 55, a: 27, p: 4, n: 3 }, 'ذو'],
  ['ٱلْمُقْسِطُ', 'The Just One', 'Al-Muqsiṭ', { s: 3, a: 18 }, 'قائما'],
  ['ٱلْجَامِعُ', 'The Gatherer, the Uniter', 'Al-Jāmiʿ', { s: 3, a: 9 }, 'جامع'],
  ['ٱلْغَنِيُّ', 'The Self-Sufficient, The Wealthy', 'Al-Ghaniyy', { s: 2, a: 263 }, 'غني'],
  ['ٱلْمُغْنِيُ', 'The Enricher', 'Al-Mughnī', { s: 9, a: 28 }, 'يغن'],
  ['ٱلْمَانِعُ', 'The Withholder', 'Al-Māniʿ', { s: 67, a: 21, p: 6 }, 'امسك'],
  ['ٱلضَّارُّ', 'The Distresser', 'Aḍ-Ḍārr', { s: 6, a: 17, p: 4 }, 'ضر'],
  ['ٱلنَّافِعُ', 'The Propitious, The Benefactor', 'An-Nāfiʿ', { s: 5, a: 76, p: 12 }, 'نفع'],
  ['ٱلنُّورُ', 'The Light', 'An-Nūr', { s: 24, a: 35 }, 'نور'],
  ['ٱلْهَادِي', 'The Guide', 'Al-Hādī', { s: 22, a: 54 }, 'هاد'],
  ['ٱلْبَدِيعُ', 'The Incomparable Originator', 'Al-Badīʿ', { s: 2, a: 117 }, 'بديع'],
  ['ٱلْبَاقِي', 'The Ever-Lasting', 'Al-Bāqī', { s: 55, a: 27 }, 'يبقى'],
  ['ٱلْوَارِثُ', 'The Inheritor', 'Al-Wāriṯ', { s: 15, a: 23, p: 6 }, 'ورث'],
  ['ٱلرَّشِيدُ', 'The Guide to the Right Path', 'Ar-Rashīd', { s: 11, a: 87 }, 'رشيد'],
  ['ٱلصَّبُورُ', 'The Patient', 'Aṣ-Ṣabūr', { s: 2, a: 153, p: 10 }, 'صبر'],
];

function fold(text) {
  return text
    .normalize('NFC')
    .replace(/[\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0626/g, '\u064a')
    .replace(/\u0649/g, '\u064a');
}
function surface(word) {
  return word.ar.map((seg) => seg.t).join('');
}
function loadSurah(s) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/quran/surahs', `${String(s).padStart(3, '0')}.json`), 'utf8'));
}

function findHit(verse, needle) {
  const ayah = loadSurah(verse.s).find((item) => item.a === verse.a);
  if (!ayah) throw new Error(`Missing ${verse.s}:${verse.a}`);
  if (verse.p) {
    const word = ayah.w.find((item) => item.p === verse.p) ?? ayah.w[0];
    return { s: verse.s, a: verse.a, p: word.p, n: verse.n, surface: surface(word), matched: true };
  }
  const want = fold(needle);
  const scored = ayah.w
    .map((word) => {
      const text = fold(surface(word));
      let score = 0;
      if (text.includes(want)) score = want.length + 10;
      else if (want.includes(text) && text.length >= 3) score = text.length;
      return { word, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score);
  const hit = scored[0]?.word ?? ayah.w[0];
  return { s: verse.s, a: verse.a, p: hit.p, n: verse.n, surface: surface(hit), matched: Boolean(scored[0]) };
}

const words = NAMES.map(([arabic, english, transliteration, verse, needle], index) => {
  const example = findHit(verse, needle);
  const id = `asma-${String(index + 1).padStart(2, '0')}`;
  return {
    id,
    arabic,
    english,
    transliteration,
    exampleVerse: { s: verse.s, a: verse.a },
    example: example.n ? { s: example.s, a: example.a, p: example.p, n: example.n } : { s: example.s, a: example.a, p: example.p },
    hit: example.surface,
    matched: example.matched,
  };
});

const unmatched = words.filter((word) => !word.matched);
const stageLevels = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/quran/stage-levels.json'), 'utf8'));
const startLevel = stageLevels.metadata.stage1LastLevel + 1;
const perLevel = 10;
const levels = [];
for (let i = 0; i < words.length; i += perLevel) {
  const chunk = words.slice(i, i + perLevel);
  const studyWords = chunk.map(({ example, hit, matched, ...word }) => word);
  if (levels.length === 0) {
    studyWords.unshift({
      id: 'asma-000',
      kind: 'grammar',
      arabic: 'الْأَسْمَاءُ الْحُسْنَىٰ',
      english: 'The most beautiful names',
      note: 'Memorize the 99 names. When the Quran uses the name itself, that verse is the example. Some traditional names are not in the Quran as a name; those cards use a verse where Allah is described with the same meaning.',
      exampleOf: 'asma-01',
    });
  }
  levels.push({
    number: startLevel + levels.length,
    id: `asma-${levels.length + 1}`,
    title: `99 Names ${levels.length + 1}`,
    words: studyWords,
  });
}

const out = {
  metadata: {
    source: 'Traditional Asma ul-Husna list, with Quran examples',
    firstLevel: startLevel,
    lastLevel: startLevel + levels.length - 1,
    wordCount: words.length,
  },
  levels,
};

fs.writeFileSync(path.join(ROOT, 'src/data/asma-ul-husna.json'), `${JSON.stringify(out, null, 2)}\n`);

const overridesPath = path.join(ROOT, 'src/data/quran/vocab-example-overrides.json');
const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
for (const word of words) overrides[word.id] = [word.example];
fs.writeFileSync(overridesPath, `${JSON.stringify(overrides, null, 2)}\n`);

const examplesPath = path.join(ROOT, 'src/data/quran/vocab-examples.json');
const examples = JSON.parse(fs.readFileSync(examplesPath, 'utf8'));
for (const word of words) examples[word.id] = [word.example];
fs.writeFileSync(examplesPath, JSON.stringify(examples));

console.log(`Wrote ${levels.length} levels (${words.length} names), ${startLevel}–${out.metadata.lastLevel}.`);
if (unmatched.length) {
  console.log('Unmatched needles (fell back to first word):');
  for (const word of unmatched) console.log(' ', word.id, word.arabic, `${word.example.s}:${word.example.a}`, word.hit);
}
