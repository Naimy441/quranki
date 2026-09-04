/**
 * Thematic labels for leftover Stage 3–4 cards. Reuses Stage 2 category names
 * (Faith, Denial, The Last Day, …) with extra gloss/POS rules for QAC leftovers
 * whose English is too messy for the curated classifier alone.
 */
const { THEMES, classify, packEven, partTitles } = require('./regroup-post-thematic-levels.js');

const PINNED = {
  أَيُّوب: 'prophets',
  جِبْرِيل: 'prophets',
  مِيكَىٰل: 'prophets',
  هَٰرُوت: 'denial',
  مَٰرُوت: 'denial',
  ٱللَّٰت: 'denial',
  ٱلْعُزَّىٰ: 'denial',
  جَالُوت: 'struggle',
  طَالُوت: 'struggle',
  بَابِل: 'places',
  أَحْقَاف: 'places',
  عَرَفَٰت: 'places',
  قَٰرُون: 'people',
  إِلْيَاس: 'prophets',
  عِمْرَٰن: 'prophets',
  أَحْمَد: 'prophets',
  إِرَم: 'places',
  يُونُس: 'prophets',
  إِدْرِيس: 'prophets',
  لُقْمَٰن: 'prophets',
  صَيِّب: 'nature',
  رَعْد: 'nature',
  سَّلْوَىٰ: 'nature',
  بَقْل: 'nature',
  قِثَّآئ: 'nature',
  فُوم: 'nature',
  عَدَس: 'nature',
  بَصَل: 'nature',
  بَقَر: 'nature',
  بَعُوضَة: 'nature',
  قِرَدَة: 'nature',
  أَصَٰبِع: 'body',
  غِشَٰوَة: 'body',
  مَٰلِك: 'attributes',
  بَدِيع: 'attributes',
  تِلَاوَت: 'religion',
  ٱعْتَمَرَ: 'worship',
  إِى: 'questions',
};

function hay(word, glosses = []) {
  return [word.english, word.variant, ...glosses].filter(Boolean).join(' ').toLowerCase();
}

function has(en, ...patterns) {
  return patterns.some((pattern) => (pattern instanceof RegExp ? pattern.test(en) : en.includes(pattern)));
}

function hasWord(en, ...words) {
  return words.some((item) => new RegExp(`(?:^|[^a-z])${item.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-z])`, 'i').test(en));
}

function leftoverTheme(en) {
  if (
    hasWord(
      en,
      'jibreel',
      'meekael',
      'harut',
      'marut',
      'ayyub',
      'job',
      'luqman',
      'qarun',
      'imran',
      'ahmad',
      'elijah',
      'dhul-qarnayn',
      'uzayr',
      'idrīs',
      'idris',
      'al-yasa',
      'yunus',
      'ilyas',
    )
  ) {
    return 'prophets';
  }
  if (
    hasWord(en, 'lat', 'uzza', 'manat', 'taghut', 'idol', 'idols', 'sabians') ||
    has(en, 'false deities', 'associates partners')
  ) {
    return 'denial';
  }
  if (
    hasWord(
      en,
      'thunder',
      'rainstorm',
      'rain',
      'rained',
      'quails',
      'herbs',
      'cucumbers',
      'garlic',
      'lentils',
      'onions',
      'mosquito',
      'apes',
      'cows',
      'cow',
      'camels',
      'camel',
      'cattle',
      'sheep',
      'goat',
      'goats',
      'dates',
      'date-seed',
      'date-palm',
      'flood',
      'smoke',
      'flame',
      'clouds',
      'cloud',
      'rock',
      'rocks',
      'spring',
      'springs',
      'dust',
      'mud',
      'foliage',
      'wood',
      'trees',
      'tree',
      'fruit',
      'fruits',
      'grain',
      'seed',
      'seeds',
      'plant',
      'plants',
      'vegetation',
      'olive',
      'olives',
      'grapes',
      'fish',
      'bird',
      'birds',
      'beast',
      'beasts',
      'animal',
      'animals',
      'horse',
      'horses',
      'donkey',
      'donkeys',
      'dog',
      'dogs',
      'lion',
      'wolf',
      'spider',
      'ant',
      'ants',
      'bee',
      'bees',
      'fly',
      'locust',
      'locusts',
      'pearls',
      'coral',
      'iron',
      'silver',
      'gold',
      'clay',
      'stone',
      'stones',
      'mountain',
      'mountains',
      'sea',
      'river',
      'rivers',
      'wind',
      'winds',
      'lightning',
      'shade',
      'shadow',
      'heat',
      'cold',
      'barren',
      'gushed',
      'gushing',
      'pouring',
      'poured',
      'gardens',
      'garden',
      'ships',
      'ship',
      'trunk',
      'root',
      'roots',
      'grass',
      'branches',
      'whirlwind',
      'horizon',
      'flocks',
      'polluted',
    ) || has(en, 'she-camel', 'date palm', 'burning flame', 'black mud', 'wild animal', 'wild beasts')
  ) {
    return 'nature';
  }
  if (
    hasWord(
      en,
      'finger',
      'fingers',
      'veil',
      'hair',
      'beard',
      'neck',
      'necks',
      'hand',
      'hands',
      'foot',
      'feet',
      'face',
      'faces',
      'eye',
      'eyes',
      'ear',
      'ears',
      'mouth',
      'tooth',
      'teeth',
      'tongue',
      'heart',
      'skin',
      'skins',
      'blood',
      'bone',
      'bones',
      'flesh',
      'belly',
      'womb',
      'breast',
      'breasts',
      'wounds',
      'wound',
      'semen',
      'clot',
      'embryo',
      'leg',
      'bosom',
      'healing',
      'menstruation',
    ) || has(en, 'embryonic lump')
  ) {
    return 'body';
  }
  if (
    hasWord(
      en,
      'mother',
      'mothers',
      'father',
      'fathers',
      'aunt',
      'aunts',
      'uncle',
      'uncles',
      'sister',
      'sisters',
      'brother',
      'brothers',
      'daughter',
      'daughters',
      'son',
      'sons',
      'wife',
      'wives',
      'husband',
      'widow',
      'widows',
      'orphan',
      'orphans',
      'paternal',
      'maternal',
      'nursing',
      'suckle',
      'suckling',
      'bondwoman',
      'virgin',
      'virgins',
      'infant',
      'infants',
      'child',
      'children',
      'wedding',
      'marriage',
      'divorce',
      'dowry',
      'weaning',
      'pregnant',
    ) || has(en, 'step daughter', 'female infant', 'nursing mother')
  ) {
    return 'family';
  }
  if (
    hasWord(
      en,
      'babylon',
      'egypt',
      'sinai',
      'arafat',
      'canopy',
      'foundations',
      'chamber',
      'chambers',
      'city',
      'cities',
      'town',
      'towns',
      'village',
      'entrance',
      'gate',
      'door',
      'palace',
      'prison',
      'market',
      'markets',
      'shore',
      'valley',
      'mount',
      'height',
      'settlement',
      'dwelling',
      'dwellings',
      'house',
      'houses',
      'tent',
      'tents',
      'bridge',
      'road',
      'path',
      'seat',
      'thrones',
      'pillar',
      'pillars',
      'palace',
      'palaces',
      'roof',
      'refuge',
      'encampment',
      'station',
    ) || has(en, 'open space', 'elevated chambers', 'overturned cities', 'mount sinai')
  ) {
    return 'places';
  }
  if (
    hasWord(
      en,
      'yesterday',
      'morning',
      'mornings',
      'evening',
      'night',
      'dawn',
      'noon',
      'tomorrow',
      'hour',
      'hours',
      'month',
      'months',
      'year',
      'years',
      'today',
      'time',
      'times',
      'appointed',
      'interval',
      'succession',
      'third',
      'fourth',
      'fifth',
      'sixth',
      'eighth',
      'eight',
      'nine',
      'ten',
      'eleven',
      'twelve',
      'twenty',
      'thirty',
      'forty',
      'fifty',
      'sixty',
      'seventy',
      'eighty',
      'ninety',
      'hundred',
      'thousand',
      'sunrise',
      'daybreak',
      'ages',
    ) || has(en, 'fixed times', 'prolonged time', 'one after another')
  ) {
    return 'time';
  }
  if (
    hasWord(
      en,
      'umrah',
      'hajj',
      'fast',
      'fasting',
      'fasts',
      'prayer',
      'pray',
      'prostrat',
      'bow',
      'worship',
      'worshippers',
      'glorify',
      'glorified',
      'wash',
      'bathe',
      'purify',
      'purified',
      'repent',
      'repentance',
      'sacrifice',
      'sacrificial',
      'vow',
      'vows',
      'rite',
      'rites',
      'qibla',
      'mosque',
      'mosques',
      'ihram',
      'talbiyah',
      'expiation',
    ) || has(en, 'performs umrah', 'seek help', 'hold fast')
  ) {
    return 'worship';
  }
  if (
    hasWord(
      en,
      'recitation',
      'surah',
      'scripture',
      'scriptures',
      'torah',
      'gospel',
      'psalms',
      'tablet',
      'tablets',
      'rabbis',
      'rabbi',
      'sacred',
      'holy',
      'religion',
      'islam',
      'muslim',
      'arabic',
      'confirmation',
      'revelation',
    ) || has(en, 'religious scholars', 'right path')
  ) {
    return 'religion';
  }
  if (
    hasWord(
      en,
      'owner',
      'originator',
      'creator',
      'sustainer',
      'provider',
      'protector',
      'watcher',
      'witness',
      'reckoner',
      'glorious',
      'majestic',
      'sublime',
    ) || has(en, 'most high', 'all-knower', 'free of need', 'possessor of')
  ) {
    return 'attributes';
  }
  if (
    hasWord(
      en,
      'caller',
      'call',
      'called',
      'recite',
      'speak',
      'speech',
      'word',
      'saying',
      'news',
      'tidings',
      'excuse',
      'excuses',
      'dispute',
      'disputed',
      'argue',
      'shout',
      'shouts',
      'rumor',
      'rumors',
      'consultation',
      'counsel',
      'inscription',
      'written',
      'write',
      'swear',
      'oath',
      'oaths',
      'greet',
      'greeting',
      'ask',
      'question',
      'enjoin',
      'proclaim',
      'whisper',
      'secret',
      'secrets',
      'openly',
      'publicly',
      'secretly',
      'announcement',
      'eloquent',
    ) || has(en, 'glad tidings', 'spread rumors', 'written down')
  ) {
    return 'speech';
  }
  if (
    hasWord(
      en,
      'mocker',
      'mockers',
      'mock',
      'mocked',
      'ridicule',
      'arrogant',
      'rebellious',
      'disobedient',
      'disobedience',
      'deviation',
      'deviate',
      'foolishness',
      'fool',
      'fools',
      'reject',
      'rejected',
      'deny',
      'denied',
      'liar',
      'lie',
      'doubt',
      'astray',
      'ungrateful',
      'stubborn',
      'arrogance',
      'haughtiness',
    ) || has(en, 'turn away', 'turned away', 'associates partners')
  ) {
    return 'denial';
  }
  if (
    hasWord(
      en,
      'thief',
      'thieves',
      'steal',
      'stole',
      'treachery',
      'betray',
      'sin',
      'sins',
      'sinful',
      'unjust',
      'injustice',
      'oppress',
      'evil',
      'harm',
      'plot',
      'scheme',
      'corruption',
      'corrupt',
      'enmity',
      'wicked',
      'crime',
      'crimes',
      'blame',
      'aggression',
      'transgress',
      'usury',
      'miserly',
      'greed',
      'greedy',
      'deceive',
      'deceived',
      'distort',
      'slander',
      'seduce',
      'deprived',
      'disgraced',
      'deceiver',
      'misleader',
      'fabrication',
      'atrocious',
    )
  ) {
    return 'wrongdoing';
  }
  if (
    hasWord(
      en,
      'hell',
      'blaze',
      'fuel',
      'recompense',
      'reward',
      'punishment',
      'punish',
      'destruction',
      'destroy',
      'destroyed',
      'perish',
      'loss',
      'calamity',
      'blast',
      'trumpet',
      'grave',
      'graves',
      'death',
      'dead',
      'resurrection',
      'hereafter',
      'intercession',
      'forgiveness',
      'chains',
      'fetters',
      'drowned',
      'trial',
      'promise',
      'threat',
      'loser',
      'ruin',
      'punished',
      'overwhelming',
    ) || has(en, 'burning fire', 'deafening blast', 'mutual loss', 'place of return', 'inevitable reality')
  ) {
    return 'hereafter';
  }
  if (
    hasWord(
      en,
      'believer',
      'faith',
      'guided',
      'guide',
      'righteous',
      'sincere',
      'steadfast',
      'success',
      'successful',
      'trust',
      'truthful',
      'upright',
      'reformers',
      'trusts',
    ) || has(en, 'guided one', 'guided ones', 'put trust', 'god-conscious')
  ) {
    return 'believers';
  }
  if (
    hasWord(en, 'deed', 'deeds', 'charity', 'spending', 'strive', 'striving', 'effort', 'volunteer', 'volunteers', 'reformation') ||
    has(en, 'good deed', 'ones who strive')
  ) {
    return 'deeds';
  }
  if (
    hasWord(en, 'blessed', 'bless', 'blessings', 'honor', 'honored', 'favor', 'gift', 'abundance', 'benefit', 'benefits', 'hospitality') ||
    has(en, 'bestower of honor', 'to honor', 'to prefer')
  ) {
    return 'blessings';
  }
  if (
    hasWord(
      en,
      'cups',
      'cup',
      'hunger',
      'poverty',
      'misery',
      'livelihood',
      'merchandise',
      'trade',
      'caravan',
      'keys',
      'payment',
      'price',
      'treasure',
      'treasures',
      'garment',
      'garments',
      'shirt',
      'ornament',
      'ornaments',
      'couch',
      'couches',
      'wine',
      'drink',
      'food',
      'meat',
      'bread',
      'milk',
      'honey',
      'oil',
      'rope',
      'hardship',
      'play',
      'amusement',
      'eating',
      'eat',
      'feeding',
      'taste',
      'lamp',
      'pens',
      'silk',
      'load',
      'jugs',
    ) || has(en, 'table spread', 'spoils of war', 'full coats', 'games of chance')
  ) {
    return 'world';
  }
  if (
    hasWord(
      en,
      'fear',
      'afraid',
      'hope',
      'desire',
      'desires',
      'humble',
      'humility',
      'affection',
      'love',
      'angry',
      'anger',
      'despair',
      'slumber',
      'asleep',
      'pity',
      'compassion',
      'patience',
      'patient',
      'grief',
      'regret',
      'joy',
      'happy',
      'pleasing',
      'envy',
      'jealous',
      'anxious',
      'peace',
      'shyness',
      'beloved',
    ) || has(en, 'secret lovers')
  ) {
    return 'heart';
  }
  if (
    hasWord(
      en,
      'captive',
      'captives',
      'prisoner',
      'prisoners',
      'follower',
      'followers',
      'group',
      'groups',
      'assembly',
      'helper',
      'helpers',
      'king',
      'kings',
      'tribe',
      'tribes',
      'people',
      'person',
      'man',
      'men',
      'women',
      'woman',
      'friend',
      'companion',
      'slave',
      'slaves',
      'poor',
      'needy',
      'leader',
      'leaders',
      'guest',
      'guests',
      'neighbor',
      'youths',
      'keepers',
      'gatherers',
    ) || has(en, 'human being', 'separate groups', 'non-arabs', 'bedouin')
  ) {
    return 'people';
  }
  if (
    hasWord(
      en,
      'war',
      'battle',
      'army',
      'soldiers',
      'armor',
      'sword',
      'swords',
      'arrow',
      'arrows',
      'guard',
      'guards',
      'spoils',
      'reinforce',
      'victory',
      'defeat',
      'enemy',
      'enemies',
      'fight',
      'fought',
      'arms',
    ) || has(en, 'coats of mail', 'going to reinforce', 'jalut', 'talut')
  ) {
    return 'struggle';
  }
  if (
    hasWord(
      en,
      'forbidden',
      'lawful',
      'unlawful',
      'ransom',
      'pledge',
      'judge',
      'judgment',
      'decide',
      'witness',
      'testimony',
      'scale',
      'scales',
      'right',
      'rights',
      'justice',
      'just',
      'test',
      'tested',
      'measure',
    ) || has(en, 'those who decide', 'one to decide')
  ) {
    return 'judgment';
  }
  if (
    hasWord(en, 'know', 'knowledge', 'known', 'informed', 'understand', 'think', 'reflect', 'see', 'look', 'learn', 'teach', 'hidden', 'unseen', 'dream', 'vision', 'ignorant', 'witnessed', 'absent', 'waiting') ||
    has(en, 'well informed', 'some information', 'make you know')
  ) {
    return 'knowing';
  }
  if (
    has(
      en,
      /^to (go|come|return|walk|travel|flee|enter|leave|follow|reach|ascend|descend|sit|stand|wait|remain|dwell|pass|turn|move|depart|hasten|settle|approach|meet|send|raise|fall|slip|pour|gush|drive|escape)/,
      'gushed forth',
      'poured forth',
      'bring forth',
      'come out',
      'come near',
      'going to',
      'sent down',
      'raised up',
      'stay behind',
      'drive away',
      'slipping away',
      'taking it away',
      'being sent',
    ) || hasWord(en, 'return', 'escape', 'approach', 'approaching', 'meet', 'journey', 'flight', 'sitting', 'stretch', 'going')
  ) {
    return 'motion';
  }
  if (
    has(en, /^to (give|take|grant|provide|feed|buy|sell|pay|accept|offer|spend|inherit)/, 'ones who give', 'give willingly', 'give less') ||
    hasWord(en, 'give', 'gave', 'giving', 'take', 'took', 'payment', 'loan', 'spend')
  ) {
    return 'giving';
  }
  if (
    hasWord(
      en,
      'yellow',
      'bright',
      'small',
      'lofty',
      'moderate',
      'bitter',
      'high',
      'low',
      'full',
      'firm',
      'thick',
      'pure',
      'black',
      'fresh',
      'middle',
      'perfect',
      'great',
      'greater',
      'heavy',
      'light',
      'easy',
      'hard',
      'weak',
      'strong',
      'new',
      'old',
      'clear',
      'green',
      'white',
      'red',
      'long',
      'short',
      'near',
      'far',
      'many',
      'few',
      'single',
      'double',
      'spacious',
      'mightier',
      'diverse',
      'immediate',
      'harder',
      'easier',
      'visible',
      'foreign',
    )
  ) {
    return 'adjectives';
  }
  return null;
}

function classifyLeftover(word, extras = {}) {
  const pinned = PINNED[word.arabic];
  if (pinned) return pinned;
  const glosses = extras.glosses ?? [];
  const text = hay(word, glosses);
  const extra = leftoverTheme(text);
  if (extra) return extra;
  const direct = classify(word);
  if (direct !== 'words' && direct !== 'verbs') return direct;
  for (const gloss of glosses) {
    const next = classify({ arabic: word.arabic, english: gloss });
    if (next !== 'words' && next !== 'verbs') return next;
  }
  if (extras.pos === 'V' || direct === 'verbs') return 'verbs';
  return 'words';
}

function existingPartsFromLevels(levels) {
  const parts = Object.fromEntries(THEMES.map((theme) => [theme.key, 0]));
  for (const theme of THEMES) {
    const escaped = theme.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^${escaped}(?: (\\d+))?$`);
    for (const level of levels) {
      const match = level.title.match(re);
      if (!match) continue;
      parts[theme.key] = Math.max(parts[theme.key], match[1] ? Number(match[1]) : 1);
    }
  }
  return parts;
}

function packThemed(cards, startLevel, existingParts, wordsPerLevel) {
  const buckets = new Map(THEMES.map((theme) => [theme.key, []]));
  for (const card of cards) {
    const key = classifyLeftover(card, card.themeExtras ?? {});
    (buckets.get(key) ?? buckets.get('words')).push(card);
  }

  const levels = [];
  let number = startLevel;
  const nextParts = { ...existingParts };
  const summary = [];
  for (const theme of THEMES) {
    const items = buckets.get(theme.key);
    if (items.length === 0) continue;
    items.sort((a, b) => a.id - b.id);
    const packed = packEven(items, wordsPerLevel);
    const titles = partTitles(theme.title, packed.length, nextParts[theme.key] ?? 0);
    nextParts[theme.key] = (nextParts[theme.key] ?? 0) + packed.length;
    summary.push({ title: theme.title, cards: items.length, titles });
    for (let i = 0; i < packed.length; i += 1) {
      levels.push({
        number,
        id: String(number),
        title: titles[i],
        words: packed[i].map((card) => ({
          id: `qac-${card.id}`,
          arabic: card.arabic,
          english: card.english,
          lemmaIds: [card.id],
          exampleVerse: { s: card.example.s, a: card.example.a },
        })),
      });
      number += 1;
    }
  }
  return { levels, nextParts, summary, lastLevel: number - 1 };
}

module.exports = {
  THEMES,
  classifyLeftover,
  existingPartsFromLevels,
  packThemed,
  packEven,
  partTitles,
};
