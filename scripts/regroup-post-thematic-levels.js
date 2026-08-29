#!/usr/bin/env node
/**
 * Rebuild levels 48+ into thematic groups that continue the 1–47 curriculum.
 * Does not change study-word ids (progress and ReaderWord.v stay valid).
 *
 *   node scripts/regroup-post-thematic-levels.js [--dry] [--dump=theme] [--level=title]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORDS_PATH = path.join(ROOT, 'src', 'data', 'quranic-words.json');
const COVERAGE_PATH = path.join(ROOT, 'src', 'data', 'quran', 'vocab-coverage.json');

const TARGET_PER_LEVEL = 12;

/** Curriculum order after level 47. */
const THEMES = [
  { key: 'speech', title: 'Speech' },
  { key: 'believers', title: 'Faith', existingParts: 1 },
  { key: 'religion', title: 'The Religion', existingParts: 1 },
  { key: 'deeds', title: 'Deeds', existingParts: 1 },
  { key: 'blessings', title: 'Blessings', existingParts: 1 },
  { key: 'denial', title: 'Denial' },
  { key: 'wrongdoing', title: 'Wrongdoing' },
  { key: 'hereafter', title: 'The Last Day', existingParts: 2 },
  { key: 'world', title: 'The World', existingParts: 1 },
  { key: 'worship', title: 'Worship' },
  { key: 'heart', title: 'The Heart' },
  { key: 'people', title: 'People', existingParts: 1 },
  { key: 'family', title: 'Relatives', existingParts: 1 },
  { key: 'nature', title: "Allah's Signs", existingParts: 1 },
  { key: 'judgment', title: 'Judgment' },
  { key: 'struggle', title: 'Struggle' },
  { key: 'places', title: 'Places' },
  { key: 'body', title: 'Body Parts', existingParts: 1 },
  { key: 'time', title: 'Time Words', existingParts: 1 },
  { key: 'questions', title: 'Questions', existingParts: 1 },
  { key: 'adjectives', title: 'Adjectives', existingParts: 1 },
  { key: 'prophets', title: 'Prophets', existingParts: 1 },
  { key: 'attributes', title: "Allah's Attributes", existingParts: 2 },
  { key: 'knowing', title: 'Knowing' },
  { key: 'motion', title: 'Coming and Going' },
  { key: 'giving', title: 'Giving and Taking' },
  { key: 'verbs', title: 'More Verbs' },
  { key: 'words', title: 'More Words' },
];

/** Exact arabic on the study card → theme. Used when the English gloss is messy or dual-sense. */
const PINNED = {
  'شَىْء': 'world',
  مُؤْمِن: 'believers',
  ظالِم: 'wrongdoing',
  رَحْمَة: 'blessings',
  عِلْم: 'knowing',
  قَوْل: 'speech',
  هُدَى: 'religion',
  حَيَاة: 'world',
  ذِكْر: 'speech',
  خالِد: 'hereafter',
  بُنَىّ: 'family',
  صَالِحَة: 'believers',
  صَادِق: 'believers',
  سُوء: 'wrongdoing',
  رِزْق: 'world',
  خَلْق: 'world',
  مَوْت: 'hereafter',
  وَعْد: 'hereafter',
  مُتَّقي: 'believers',
  إِيمان: 'believers',
  مُشْرِك: 'denial',
  مَيِّت: 'hereafter',
  سُبْحان: 'worship',
  مُسْلِم: 'believers',
  ضَلَال: 'denial',
  مُحْسِن: 'believers',
  مَعْرُوف: 'judgment',
  مُسْتَقِيم: 'religion',
  فاسِق: 'denial',
  بَشَر: 'people',
  كُفْر: 'denial',
  مُرْسَل: 'prophets',
  كَذِب: 'speech',
  كَاذِب: 'denial',
  خاسِر: 'hereafter',
  حُكْم: 'judgment',
  جُنْد: 'struggle',
  رِيح: 'nature',
  نَبَأ: 'speech',
  مَصِير: 'hereafter',
  سِحْر: 'denial',
  مَغْفِرَة: 'hereafter',
  غَافِل: 'heart',
  مُنَافِق: 'denial',
  كَيْد: 'wrongdoing',
  خَوْف: 'heart',
  طَعَام: 'world',
  غَنِيّ: 'attributes',
  فُلْك: 'nature',
  مِسْكِين: 'people',
  يَتِيم: 'family',
  ساجِد: 'worship',
  ظُلُمَة: 'nature',
  ذِكْرَى: 'speech',
  امْرَأَت: 'family',
  فَرِح: 'heart',
  مَأْوَى: 'hereafter',
  يَرْجُوا: 'heart',
  جِنّ: 'nature',
  دُعاء: 'worship',
  سَمْع: 'body',
  ساحِر: 'denial',
  مَنَّ: 'world',
  نَصْر: 'struggle',
  أَعْمَى: 'body',
  شَاهِد: 'judgment',
  شَهْر: 'time',
  صَابِر: 'heart',
  نَصِيب: 'judgment',
  مُفْسِد: 'wrongdoing',
  ظُلْم: 'wrongdoing',
  كَلَّمَ: 'speech',
  شَجَرَة: 'nature',
  طَيْر: 'nature',
  فَوْز: 'hereafter',
  ضُرّ: 'wrongdoing',
  زِينَة: 'world',
  تَوْراة: 'prophets',
  دَآبَّة: 'nature',
  رَأْس: 'body',
  رَيْب: 'denial',
  هَٰد: 'prophets',
  أُذُن: 'body',
  عالِم: 'attributes',
  مُنكَر: 'wrongdoing',
  آن: 'time',
  أَلْف: 'time',
  بَطْن: 'body',
  بِنْت: 'family',
  تُرَاب: 'nature',
  ثَمَرَة: 'nature',
  سُلَيْمَٰن: 'prophets',
  نَعِيم: 'hereafter',
  عَرَضَ: 'world',
  دَاوُد: 'prophets',
  فُؤَاد: 'body',
  قُرْبَى: 'family',
  مِيزَان: 'hereafter',
  أُخْت: 'family',
  إِنجِيل: 'prophets',
  هَٰرُون: 'prophets',
  مَسِيح: 'prophets',
  إِبْلِيس: 'prophets',
  اللَّهُمّ: 'worship',
  مُحَمَّد: 'prophets',
  يَحْيَى: 'prophets',
  مِصْر: 'places',
  قِبْلَة: 'worship',
  كَفّار: 'denial',
  مُنافِقَة: 'denial',
  كَافِر: 'denial',
  مَلَكَت: 'family',
  عَصَا: 'prophets',
  واحِدَة: 'time',
  أَنَّى: 'questions',
  حَسَن: 'adjectives',
  مُعْرِض: 'denial',
  مَكْر: 'wrongdoing',
  مُصَدِّق: 'believers',
  أَثَر: 'motion',
  إِنس: 'people',
  دَرَجَة: 'world',
  مَوْلَى: 'people',
  حُسْنَى: 'adjectives',
  قَآئِم: 'motion',
  آمِن: 'heart',
  مَرْجِع: 'hereafter',
  طَيِّب: 'adjectives',
  أَلْبَٰب: 'knowing',
  أَهْوَآء: 'heart',
  سُنَّة: 'religion',
  بَلاغ: 'speech',
  تَنزِيل: 'religion',
  حَرَج: 'judgment',
  مِلَّة: 'religion',
  يَسِير: 'adjectives',
  قادِر: 'attributes',
  ٱبْتِغَآء: 'deeds',
  خَاشِع: 'worship',
  صِدْق: 'speech',
  ظِلّ: 'nature',
  عَدْل: 'judgment',
  مَقَام: 'places',
  مُهِين: 'hereafter',
  مُفْلِح: 'believers',
  حافِظ: 'people',
  رِضْوان: 'hereafter',
  اثْنَيْن: 'time',
  جَمْع: 'people',
  حُسْن: 'adjectives',
  صَدَقَة: 'deeds',
  صَيْحَة: 'hereafter',
  غَالِب: 'struggle',
  وِزْر: 'judgment',
  مَوْعِد: 'time',
  مُبارَك: 'blessings',
  إِحْسَٰن: 'deeds',
  أَرْحَام: 'family',
  بَرِىٓء: 'judgment',
  مَسْكَن: 'places',
  عابِد: 'worship',
  عِزَّة: 'attributes',
  شِيعَة: 'people',
  ضِعْف: 'time',
  عِدَّة: 'time',
  كَثِيرَة: 'adjectives',
  مَعْلُوم: 'knowing',
  نَجْوَى: 'speech',
  عَرَبِيّ: 'religion',
  مُصِيبَة: 'hereafter',
  خَيْرَة: 'adjectives',
  رِسالَة: 'speech',
  عِجْل: 'nature',
  جَاهِل: 'knowing',
  سَعْى: 'deeds',
  سُورَة: 'religion',
  شَفِيع: 'hereafter',
  طُور: 'nature',
  لَهْو: 'world',
  مُسْتَقَرّ: 'places',
  مُقِيم: 'adjectives',
  رُءْيَا: 'knowing',
  حُبّ: 'heart',
  خَلِيفَة: 'people',
  فاعِل: 'deeds',
  نَبات: 'nature',
  أَسَٰطِير: 'speech',
  إِفْك: 'denial',
  تِجَٰرَة: 'world',
  جَانِب: 'places',
  رِجْز: 'hereafter',
  رَقَبَة: 'people',
  سَبَب: 'world',
  ضَلَٰلَة: 'denial',
  عُنُق: 'body',
  عِوَج: 'wrongdoing',
  غِلّ: 'struggle',
  غَلِيظ: 'adjectives',
  قَرَار: 'places',
  لَغْو: 'speech',
  لَوْن: 'nature',
  مَـَٔاب: 'hereafter',
  مُخْلَص: 'believers',
  مَوْعِظَة: 'speech',
  هُنالِك: 'places',
  إِسْلام: 'religion',
  مَوَدَّة: 'heart',
  مَنافِع: 'blessings',
  أَشُدّ: 'time',
  أَظْهَر: 'time',
  بُرْهَٰن: 'religion',
  جَدِيد: 'adjectives',
  جَنب: 'body',
  سَابِق: 'motion',
  شَجَر: 'nature',
  صَٰعِقَة: 'nature',
  صُحُف: 'religion',
  صَوْت: 'speech',
  ضَعِيف: 'adjectives',
  طَٰغُوت: 'denial',
  عَقِب: 'body',
  غَد: 'time',
  قَٰنِت: 'worship',
  قَرِين: 'people',
  لَعِب: 'world',
  مِثْقَال: 'judgment',
  مُحْصَنَة: 'family',
  مُشْفِق: 'heart',
  مُقَرَّب: 'hereafter',
  مِيقَٰت: 'time',
  نُزُل: 'blessings',
  وَصِيَّة: 'judgment',
  يَمّ: 'nature',
  أَثِيم: 'wrongdoing',
  قاعِد: 'motion',
  قَدْر: 'attributes',
  حَمْل: 'world',
  مَفْعُول: 'hereafter',
  إِخْوَة: 'family',
  أَرْبَع: 'time',
  إِصْلَٰح: 'deeds',
  بَصِيرَة: 'knowing',
  بَعْل: 'family',
  بُنْيَٰن: 'places',
  بَيْع: 'world',
  جَمِيل: 'adjectives',
  حَبْل: 'world',
  حِجَاب: 'places',
  حُجَّة: 'speech',
  ذِلَّة: 'heart',
  رِبا: 'wrongdoing',
  زُبُر: 'religion',
  زَكَرِيَّا: 'prophets',
  سِتَّة: 'time',
  سَفَر: 'motion',
  سَفِيه: 'denial',
  شِقَاق: 'wrongdoing',
  صَفّ: 'worship',
  عَٰكِف: 'worship',
  غَابِر: 'people',
  كَأَيِّن: 'questions',
  كُبْرَى: 'adjectives',
  كَبِيرَة: 'adjectives',
  مُرِيب: 'denial',
  مَطَر: 'nature',
  مُنِيب: 'worship',
  مِهَاد: 'hereafter',
  نَاقَة: 'nature',
  نِصْف: 'time',
  وَاد: 'places',
  يُسْر: 'adjectives',
  ذَرَّة: 'nature',
  مَرَدّ: 'hereafter',
  مِيعاد: 'hereafter',
  وَحْد: 'adjectives',
  رازِق: 'attributes',
  سَعَة: 'blessings',
  أَنداد: 'denial',
  أَوَّاب: 'worship',
  أَيَّان: 'questions',
  بَقَرَة: 'nature',
  بَلَآء: 'hereafter',
  بُهْتَٰن: 'wrongdoing',
  تَحِيَّة: 'speech',
  ثُلُث: 'time',
  رَاحِم: 'attributes',
  رَجِيم: 'denial',
  رُشْد: 'religion',
  سَبْت: 'time',
  ضُحى: 'time',
  عِبْرَة: 'speech',
  عَدَد: 'time',
  عُقْبَى: 'hereafter',
  غَاوِي: 'denial',
  قَبْر: 'hereafter',
  قَرْض: 'giving',
  قَمِيص: 'world',
  كَأْس: 'world',
  لُؤْلُؤ: 'nature',
  مُبَيِّنَة: 'adjectives',
  مَعْدُودَة: 'time',
  وَقْر: 'body',
  سَلَم: 'religion',
  مَرْضات: 'heart',
  مُكْرَم: 'blessings',
  نَكِير: 'denial',
  شِرْك: 'denial',
  أَرَآئِك: 'world',
  أَسَاوِر: 'world',
  أَسْبَاط: 'prophets',
  حَاكِم: 'judgment',
  حَرِيق: 'hereafter',
  حِمَار: 'nature',
  خَيْل: 'nature',
  زَيْتُون: 'nature',
  شُحّ: 'wrongdoing',
  ضَيْف: 'family',
  عُسْر: 'world',
  عَطَآء: 'giving',
  عَلَقَة: 'body',
  غُدُوّ: 'time',
  غُرْفَة: 'places',
  فَوْج: 'struggle',
  كَلْب: 'nature',
  لَوْح: 'religion',
  مُتْرَف: 'people',
  مُهْلِك: 'hereafter',
  مُوقِن: 'believers',
  نَادِم: 'heart',
  جاهِلِيَّة: 'denial',
  جُنُب: 'worship',
  حِلْيَة: 'world',
  شَعائِر: 'worship',
  شَقِيّ: 'hereafter',
  شَيْخ: 'people',
  صَعِيد: 'nature',
  عَنِيد: 'denial',
  غَيّ: 'denial',
  غُيُوب: 'knowing',
  فائِز: 'hereafter',
  فَخُور: 'denial',
  قُدُس: 'religion',
  مُتَوَكِّل: 'believers',
  مَرْء: 'people',
  مُمْتَري: 'denial',
  نَعْجَة: 'nature',
  يُنظَرُ: 'hereafter',
  اسْتَأْذَنَ: 'judgment',
  مُعْجِز: 'hereafter',
  سِرّ: 'speech',
  إِحْدَى: 'time',
  حَسْب: 'attributes',
  أَحْصَى: 'knowing',
  أَعْجَب: 'heart',
  كَي: 'questions',
  مُحْضَر: 'hereafter',
  يُولِج: 'motion',
  غُرُور: 'denial',
  آتِي: 'hereafter',
  أَنسَى: 'knowing',
  خَفَّف: 'judgment',
  خِلَٰل: 'places',
  ظَٰهِر: 'adjectives',
  فَرْج: 'body',
  مُتَّكِئ: 'world',
  تَبْدِيل: 'world',
  بُعْد: 'places',
  جَهْر: 'speech',
  حَظّ: 'judgment',
  دَام: 'time',
  دَلّ: 'knowing',
  يَعْمَه: 'denial',
  مُنتَظِر: 'motion',
  مُنظَر: 'hereafter',
  بالِغ: 'motion',
  عالِي: 'places',
  أَخْذ: 'struggle',
  أَسْفَل: 'places',
  طَرْف: 'body',
  ظَٰهَر: 'family',
  ظُلَّة: 'nature',
  ظَهِير: 'people',
  كَرَّة: 'motion',
  يَسْتَفْت: 'questions',
  مَسْئُول: 'judgment',
  مَكانَت: 'places',
  مُنذَر: 'speech',
  وُسْع: 'world',
  تَقَلُّب: 'motion',
  أَلَّف: 'heart',
  تَحْرِير: 'judgment',
  جَاثِم: 'hereafter',
  جَهَر: 'speech',
  حِجْر: 'places',
  خَالِصَة: 'religion',
  خَاوِيَة: 'hereafter',
  خَصِيم: 'judgment',
  خَطْب: 'speech',
  رَقِيب: 'attributes',
  شَطْر: 'places',
  صَاغِر: 'heart',
  صَيْد: 'nature',
  طَرَف: 'places',
  طَرِيقَة: 'religion',
  عَزْم: 'heart',
  عَقَر: 'nature',
  قَيِّم: 'religion',
  كَآفَّة: 'people',
  مَلُوم: 'wrongdoing',
  يَرْهَق: 'hereafter',
  أَكِنَّة: 'body',
  أَيْكَة: 'nature',
  بال: 'speech',
  بُرُوج: 'nature',
  تَراض: 'family',
  دابِر: 'nature',
  دَعْوَى: 'speech',
  راجِع: 'motion',
  راضِيَة: 'heart',
  شَأْن: 'world',
  ضَعْف: 'adjectives',
  طَبَق: 'time',
  طَرِيق: 'places',
  طَوْع: 'worship',
  عُقْدَة: 'speech',
  عَقِيم: 'family',
  عِين: 'body',
  كِسَف: 'nature',
  مُبْصِر: 'knowing',
  مُتَقابِل: 'places',
  مُرْسِل: 'prophets',
  مَكْنُون: 'adjectives',
  مُلاقُوا: 'hereafter',
  مَمْنُون: 'time',
  مَهِين: 'hereafter',
  نَصَب: 'world',
  هُون: 'hereafter',
  فَرَّقُ: 'judgment',
  يَقْبَلُ: 'giving',
  يَسْتَحْى: 'family',
  يُضَٰعِف: 'time',
  يَعْتَذِر: 'speech',
  يَسَّر: 'verbs',
  ثَبَّت: 'verbs',
  أُعِيد: 'verbs',
  يُؤَدّ: 'giving',
};

function hay(word) {
  return `${word.english ?? ''} ${word.variant ?? ''}`.toLowerCase();
}

function has(en, ...patterns) {
  return patterns.some((pattern) => (pattern instanceof RegExp ? pattern.test(en) : en.includes(pattern)));
}

function hasWord(en, ...words) {
  return words.some((item) => new RegExp(`(?:^|[^a-z])${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z])`, 'i').test(en));
}

function classify(word) {
  const pinned = PINNED[word.arabic];
  if (pinned) return pinned;
  const en = hay(word);

  if (
    has(
      en,
      'aaron',
      'harun',
      'sulaiman',
      'solomon',
      'dawood',
      'david',
      'yahya',
      'zakariya',
      'muhammad',
      'iblis',
      'messiah',
      'madyan',
      'haman',
      'taurat',
      'injeel',
      'gospel',
      'prophethood',
      'disciples',
      'bedouin',
      'dhul-kifl',
      'tribes',
    ) || hasWord(en, 'prophet')
  ) {
    return 'prophets';
  }
  if (
    has(
      en,
      'o allah',
      'all-strong',
      'all able',
      'all-knower',
      'oft-forgiving',
      'full of kindness',
      'irresistible',
      'reckoner',
      'most merciful',
      'exalted is he',
      'all-encompassing',
      'free of need',
    ) || hasWord(en, 'creator', 'glorious', 'dominion', 'providers', 'merciful')
  ) {
    return 'attributes';
  }
  if (
    hasWord(en, 'disbeliever', 'disbelief', 'hypocrite', 'idol', 'idols') ||
    has(
      en,
      'hypocrite women',
      'associates partners',
      'defiantly disobedient',
      'misguidance',
      'denier',
      'magician',
      'ungrateful',
      'arrogant',
      'bewitched',
      'falsif',
      'false deities',
      'accursed',
      'boaster',
      'doubters',
      'invented',
      'ignorance',
      'stubborn',
      'suspicious',
      'slander',
      'deviators',
      'unlettered',
    )
  ) {
    return 'denial';
  }
  if (
    has(en, 'prostrat', 'glory (be', 'supplication', 'direction of prayer', 'hold fast', 'been dedicated') ||
    hasWord(
      en,
      'hajj',
      'fasting',
      'pray',
      'prayer',
      'worship',
      'worshippers',
      'bow',
      'qibla',
      'rite',
      'rites',
      'purify',
      'purified',
      'purifies',
      'repentance',
      'sacrificial',
      'obedient',
      'devoted',
      'vow',
      'symbols',
      'impure',
    )
  ) {
    return 'worship';
  }
  if (
    has(en, 'remaining forever', 'destination, return', 'striking calamity', 'burning fire', 'place of return') ||
    hasWord(
      en,
      'death',
      'dead',
      'died',
      'hell',
      'blaze',
      'resurrection',
      'intercession',
      'intercessor',
      'intercedes',
      'eden',
      'delight',
      'triumph',
      'forgiveness',
      'abode',
      'grave',
      'graves',
      'trumpet',
      'destruction',
      'threat',
      'loser',
      'eternity',
      'hereafter',
      'disaster',
      'punishment',
      'punish',
      'retribution',
      'trial',
      'promise',
      'destined',
      'drowned',
    )
  ) {
    return 'hereafter';
  }
  if (
    hasWord(
      en,
      'believer',
      'muslim',
      'faith',
      'righteous',
      'truthful',
      'sincere',
      'mindful',
      'upright',
      'reformers',
      'certainty',
      'righteousness',
      'successful',
      'trust',
    ) || has(en, 'god-conscious', 'doer of good', 'guided-ones', 'chosen ones', 'put trust')
  ) {
    return 'believers';
  }
  if (
    hasWord(en, 'islam', 'religion', 'revelation', 'surah', 'scripture', 'scriptures', 'arabic', 'holy', 'peace', 'tablets') ||
    has(en, 'right path', 'right way')
  ) {
    return 'religion';
  }
  if (
    hasWord(en, 'deed', 'deeds', 'charity', 'charities', 'effort', 'doers', 'reformation') ||
    has(en, 'good deed', 'seeking')
  ) {
    return 'deeds';
  }
  if (
    hasWord(en, 'blessed', 'bless', 'benefit', 'benefits', 'gift', 'abundance', 'honored', 'hospitality', 'favor') ||
    has(en, 'to bless', 'to honor', 'to prefer', 'to favor')
  ) {
    return 'blessings';
  }
  if (
    hasWord(en, 'liar', 'lie', 'doubt', 'astray', 'ridicule', 'madman', 'christians', 'jews', 'heedlessness', 'error', 'fools') ||
    has(en, 'to reject', 'to be mocked', 'to doubt', 'to ridicule', 'deluded', 'misled', 'turn away', 'turned away')
  ) {
    return 'denial';
  }
  if (
    has(en, 'wrongdoer', 'injustice', 'corrupter', 'immorality', 'transgress', 'oppress', 'usury', 'dissension', 'wickedly') ||
    hasWord(
      en,
      'evil',
      'harm',
      'sin',
      'sins',
      'sinful',
      'sinners',
      'plot',
      'scheme',
      'adversity',
      'curse',
      'corruption',
      'enmity',
      'tyrant',
      'wicked',
      'plan',
      'betray',
      'stole',
      'steal',
      'entice',
      'defraud',
      'deprive',
      'miserly',
      'crimes',
    )
  ) {
    return 'wrongdoing';
  }
  if (
    has(en, 'glad tidings', 'falsehood', 'secret counsels', 'vain talk', 'greetings') ||
    hasWord(
      en,
      'saying',
      'word',
      'news',
      'tidings',
      'speak',
      'speech',
      'call',
      'advise',
      'dispute',
      'argue',
      'conceal',
      'narrate',
      'swear',
      'claim',
      'declare',
      'listen',
      'admonish',
      'admonition',
      'admonished',
      'answer',
      'message',
      'messages',
      'convey',
      'conveyance',
      'conveyed',
      'interpretation',
      'explanation',
      'explain',
      'reminder',
      'reminded',
      'mention',
      'story',
      'tale',
      'tales',
      'speaker',
      'words',
      'listeners',
      'voices',
      'argument',
      'lesson',
    )
  ) {
    return 'speech';
  }
  if (
    hasWord(
      en,
      'fear',
      'fearful',
      'hope',
      'patience',
      'patient',
      'grief',
      'grieve',
      'desire',
      'desires',
      'wrath',
      'rage',
      'hate',
      'hatred',
      'humble',
      'humbled',
      'grateful',
      'wish',
      'despair',
      'regret',
      'regretful',
      'averse',
      'aversion',
      'terror',
      'distress',
      'tranquility',
      'anger',
      'disgrace',
      'love',
      'envy',
      'wonder',
      'laugh',
      'weeping',
      'satisfaction',
      'humiliation',
      'secure',
      'pleasure',
    ) || has(en, 'to rejoice', 'wishful thinking')
  ) {
    return 'heart';
  }
  if (
    has(en, 'what is right', 'legal retribution', 'any will', 'any blame') ||
    hasWord(
      en,
      'judgment',
      'justice',
      'decree',
      'lawful',
      'covenant',
      'obligation',
      'debt',
      'scribe',
      'criterion',
      'limits',
      'just',
      'judges',
      'judge',
      'burden',
      'burdens',
      'innocent',
      'weight',
    )
  ) {
    return 'judgment';
  }
  if (
    hasWord(en, 'fight', 'fighting', 'fought', 'troops', 'troop', 'victory', 'victorious', 'kill', 'killing', 'struggle', 'hosts', 'emigrants', 'helpers', 'helping') ||
    has(en, 'to aid', 'to fight', 'to seize', 'to overcome', 'to opposes', 'to repel')
  ) {
    return 'struggle';
  }
  if (
    hasWord(
      en,
      'children',
      'wife',
      'wives',
      'woman',
      'women',
      'parent',
      'parents',
      'orphan',
      'sister',
      'brothers',
      'daughter',
      'marry',
      'marriage',
      'boy',
      'relatives',
      'divorce',
      'guest',
      'guests',
      'child',
      'husbands',
      'wombs',
      'chaste',
    ) || has(en, 'old woman', 'right hand possesses')
  ) {
    return 'family';
  }
  if (
    hasWord(
      en,
      'ear',
      'ears',
      'head',
      'heads',
      'belly',
      'flesh',
      'blood',
      'bone',
      'bones',
      'hearts',
      'skin',
      'skins',
      'blind',
      'blinded',
      'deaf',
      'deafness',
      'dumb',
      'disease',
      'sick',
      'body',
      'hearing',
      'necks',
      'feet',
      'heels',
      'sides',
    ) || has(en, 'semen-drop', 'backs', 'clinging substance')
  ) {
    return 'body';
  }
  if (
    hasWord(
      en,
      'wind',
      'tree',
      'trees',
      'bird',
      'cloud',
      'clouds',
      'mountain',
      'clay',
      'dust',
      'fruit',
      'fruits',
      'grain',
      'ship',
      'wave',
      'star',
      'stars',
      'lightning',
      'olive',
      'olives',
      'grapes',
      'fish',
      'creature',
      'jinn',
      'stone',
      'stones',
      'crop',
      'crops',
      'harvest',
      'iron',
      'silver',
      'cave',
      'earthquake',
      'darkness',
      'shade',
      'thunderbolt',
      'sea',
      'rain',
      'rained',
      'vegetation',
      'calf',
      'camel',
      'cow',
      'dog',
      'donkey',
      'donkeys',
      'horses',
      'pearls',
      'colors',
      'atom',
      'earth',
    ) || has(en, 'date-palm', 'firm mountains', 'she-camel', 'gush forth')
  ) {
    return 'nature';
  }
  if (
    hasWord(
      en,
      'gate',
      'door',
      'city',
      'east',
      'west',
      'egypt',
      'prison',
      'palace',
      'barrier',
      'here',
      'towards',
      'exit',
      'cradle',
      'thrones',
      'place',
      'dwellings',
      'dwelling',
      'valley',
      'building',
      'screen',
      'there',
      'mansions',
    ) || has(en, 'prayer chamber', 'dwelling place')
  ) {
    return 'places';
  }
  if (
    hasWord(en, 'human', 'group', 'party', 'poor', 'needy', 'king', 'person', 'messenger', 'warner', 'leaders', 'workers', 'inheritors', 'friend', 'companion', 'men', 'man', 'protector', 'guardians', 'sects', 'successor', 'slave', 'wealthy') ||
    has(en, 'human being', 'those who remain')
  ) {
    return 'people';
  }
  if (
    hasWord(
      en,
      'month',
      'year',
      'years',
      'generation',
      'thousand',
      'seven',
      'hundred',
      'dawn',
      'evening',
      'morning',
      'mornings',
      'suddenly',
      'four',
      'three',
      'six',
      'nine',
      'ten',
      'two',
      'half',
      'double',
      'number',
      'numbered',
      'tomorrow',
      'noon',
      'maturity',
      'appointment',
      'term',
    ) || has(en, 'time, occasion', 'old age', 'one (female)', 'set term', 'two thirds', 'two females')
  ) {
    return 'time';
  }
  if (hasWord(en, 'how', 'when', 'why') || has(en, 'how many')) {
    return 'questions';
  }
  if (
    hasWord(
      en,
      'good',
      'beautiful',
      'best',
      'easy',
      'ease',
      'many',
      'various',
      'new',
      'great',
      'greatest',
      'weak',
      'severe',
      'lasting',
      'clear',
      'similar',
      'heavy',
      'purer',
      'worst',
      'alone',
      'strongest',
      'even',
      'green',
      'firm',
    )
  ) {
    return 'adjectives';
  }
  if (
    hasWord(
      en,
      'thing',
      'creation',
      'provision',
      'life',
      'food',
      'land',
      'adornment',
      'merchandise',
      'treasure',
      'treasures',
      'manna',
      'drink',
      'wine',
      'garments',
      'measure',
      'price',
      'swine',
      'amusement',
      'play',
      'trade',
      'transaction',
      'shirt',
      'cup',
      'ornaments',
      'couches',
      'bracelets',
      'hardship',
      'rope',
    ) || has(en, 'transitory goods')
  ) {
    return 'world';
  }
  if (
    has(
      en,
      /^to (know|understand|think|reflect|see|look|perceive|learn|teach|reveal|explain|appear)/,
      'make you know',
      'understanding',
      'enlightenment',
      'enlightening',
      'ignorant',
      'unseen',
      'dream',
      'dreams',
      'vision',
      'known',
    ) || hasWord(en, 'knowledge', 'certain')
  ) {
    return 'knowing';
  }
  if (
    has(
      en,
      /^to (go|come|return|walk|travel|flee|enter|leave|follow|precede|reach|ascend|descend|sit|stand|wait|remain|dwell|pass|turn|proceed|embark|drive|move|depart|hasten|settle)/,
      'go forth',
      'go near',
      'go down',
      'turned his back',
      'come near',
      'come forth',
      'coming forth',
      'footsteps',
      'standing',
      'flight',
      'journey',
      'remain behind',
      'driving out',
      'so travel',
      'so race',
    )
  ) {
    return 'motion';
  }
  if (
    has(en, /^to (give|take|grant|provide|feed|withhold|buy|sell|loan|inherit|pay|accept|offer|bring|gave)/, 'made to inherit', 'be paid', 'remit charity', 'to ransoms', 'to earned', 'to ate', 'to watered') ||
    hasWord(en, 'loan')
  ) {
    return 'giving';
  }
  if (has(en, 'to test', 'to tried', 'to specified', 'to compel', 'to retaliate', 'to overlook', 'to bear', 'to enjoin', 'to enjoined')) {
    return 'judgment';
  }
  if (has(en, 'to strive', 'to worthless') || /(?:^|[^a-z])to do(?:$|[^a-z])/.test(en)) {
    return 'deeds';
  }
  if (has(en, 'to blow', 'to burn', 'to destroyed', 'to destroy')) {
    return 'hereafter';
  }
  if (has(en, 'to hurt', 'to break', 'to broke', 'to neglected', 'to defraud', 'sought to seduce', 'sows discord', 'to mix')) {
    return 'wrongdoing';
  }
  if (has(en, 'to deviate', 'to deluded', 'to insolent', 'to disown', 'put a seal', 'to seal')) {
    return 'denial';
  }
  if (has(en, 'to chosen', 'to chooses')) {
    return 'believers';
  }
  if (has(en, 'created me', 'to fashion', 'to originates', 'to established', 'constructed it')) {
    return 'world';
  }
  if (has(en, 'to enjoy', 'to resolve', 'to resent', 'to playing')) {
    return 'heart';
  }
  if (has(en, 'seek refuge', 'to slaughter')) {
    return 'worship';
  }
  if (has(en, 'to attribute', 'to respond', 'to disputing', 'questioning', 'named them', 'inform me', 'cause to hear')) {
    return 'speech';
  }
  if (has(en, 'to meet', 'to met', 'fell down', 'cut off', 'to cut', 'to threw', 'to cast', 'to circulate', 'to approaches', 'to moving', 'to delayed', 'repeats it', 'causes to enter', 'became divided')) {
    return 'motion';
  }
  if (has(en, 'to hidden', 'to grasp', 'to apparent', 'made you forget')) {
    return 'knowing';
  }
  if (has(en, 'to pour', 'to split', 'to lit', 'to dug', 'to swallow')) {
    return 'nature';
  }
  if (has(en, 'to suckle')) {
    return 'family';
  }
  if (has(en, 'to protect', 'to restrain', 'help themselves')) {
    return 'struggle';
  }
  if (has(en, 'to difficult')) {
    return 'adjectives';
  }
  if (/^to /.test(en.trim()) || has(en, 'turned away', 'prevented', 'made easy', 'let go', 'make firm', 'threw', 'give respite', 'supported', 'cause to', 'withdraw', 'multiplied', 'exalt', 'lay on us', 'act wickedly', 'may be cooled', 'both offered')) {
    return 'verbs';
  }
  return 'words';
}

function packEven(items, target = TARGET_PER_LEVEL) {
  const n = items.length;
  if (n === 0) return [];
  if (n <= target + 2) return [items];
  const levelCount = Math.ceil(n / target);
  const size = Math.floor(n / levelCount);
  const extra = n % levelCount;
  const out = [];
  let i = 0;
  for (let k = 0; k < levelCount; k += 1) {
    const take = size + (k < extra ? 1 : 0);
    out.push(items.slice(i, i + take));
    i += take;
  }
  return out;
}

function partTitles(base, partCount, existingParts = 0) {
  if (existingParts === 0 && partCount === 1) return [base];
  const start = existingParts + 1;
  return Array.from({ length: partCount }, (_, i) => `${base} ${start + i}`);
}

function isStudyWord(word) {
  return word.kind !== 'grammar';
}

function main() {
  const dry = process.argv.includes('--dry');
  const deck = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
  const coverage = JSON.parse(fs.readFileSync(COVERAGE_PATH, 'utf8'));
  const counts = coverage.occurrenceCounts;

  const core = deck.levels.filter((level) => level.number <= 47);
  const extras = deck.levels
    .filter((level) => level.number > 47)
    .flatMap((level) => level.words.filter(isStudyWord));

  const buckets = new Map(THEMES.map((theme) => [theme.key, []]));
  const unknown = [];
  for (const word of extras) {
    const key = classify(word);
    if (!buckets.has(key)) {
      unknown.push({ key, word });
      continue;
    }
    buckets.get(key).push(word);
  }
  if (unknown.length) {
    console.error('Unknown themes', [...new Set(unknown.map((row) => row.key))]);
    process.exit(1);
  }

  for (const words of buckets.values()) {
    words.sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0) || a.id.localeCompare(b.id));
  }

  const newLevels = [];
  let number = 48;
  console.log('Theme sizes:');
  for (const theme of THEMES) {
    const words = buckets.get(theme.key);
    const packed = packEven(words);
    const titles = partTitles(theme.title, packed.length, theme.existingParts ?? 0);
    const tokens = words.reduce((sum, word) => sum + (counts[word.id] ?? 0), 0);
    console.log(
      `  ${theme.title.padEnd(22)} ${String(words.length).padStart(4)} cards  ${String(tokens).padStart(5)} tokens  → ${titles.join(', ') || '(empty)'}`,
    );
    packed.forEach((slice, i) => {
      newLevels.push({
        number,
        id: String(number).padStart(2, '0'),
        title: titles[i],
        words: slice,
      });
      number += 1;
    });
  }

  console.log(`\n${extras.length} cards → ${newLevels.length} levels (${core.length + newLevels.length} total).`);
  const dumpKey = process.argv.find((arg) => arg.startsWith('--dump='))?.slice('--dump='.length);
  if (dumpKey) {
    const words = buckets.get(dumpKey) ?? [];
    const limit = Number(process.argv.find((arg) => arg.startsWith('--n='))?.slice('--n='.length) ?? words.length);
    for (const word of words.slice(0, limit)) {
      console.log(`${String(counts[word.id] ?? 0).padStart(4)}  ${word.arabic}  ${word.english}`);
    }
    return;
  }
  if (dry) {
    const filter = process.argv.find((arg) => arg.startsWith('--level='))?.slice('--level='.length);
    const shown = filter
      ? newLevels.filter((level) => level.title.toLowerCase().includes(filter.toLowerCase()))
      : newLevels;
    for (const level of shown) {
      console.log(`\n${level.number} ${level.title} (${level.words.length})`);
      for (const word of level.words) {
        console.log(`  ${String(counts[word.id] ?? 0).padStart(4)}  ${word.arabic}  ${word.english}`);
      }
    }
    return;
  }

  deck.levels = [...core, ...newLevels];
  deck.levelCount = deck.levels.length;
  deck.wordCount = deck.levels.reduce((sum, level) => sum + level.words.filter(isStudyWord).length, 0);
  fs.writeFileSync(WORDS_PATH, `${JSON.stringify(deck, null, 2)}\n`);
  console.log(`Wrote ${WORDS_PATH}`);
}

main();
