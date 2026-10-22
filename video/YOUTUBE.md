# YouTube upload

Video: `out/quranki-demo.mp4` - live at https://youtu.be/ShYk--jn0kU

## A/B test

YouTube Studio's Test & Compare runs up to three thumbnails (and titles) against each other and picks the one with the most watch time. Each pair below is built on one angle, so the test tells you which hook your audience responds to.

| | Thumbnail | Title | Angle |
|---|---|---|---|
| A | `out/thumbnail.png` | Understand 80% of the Quran with Just 500 Words \| Quranki | The payoff: a small goal, a big result |
| B | `out/thumbnail-b.png` | Stop Reading Translations: Understand the Quran Word by Word | The feeling: reading the Quran directly |
| C | `out/thumbnail-c.png` | These 10 Words Make Up 25% of the Quran | The surprising stat: pure curiosity |

If you test titles, keep the thumbnail fixed (A works with any of the three titles). Other titles worth trying later:
- Learn Quranic Arabic Word by Word with Spaced Repetition | Quranki Demo
- How I'd Learn to Understand the Quran in Arabic (500 Words = 80%)

Render the thumbnails with `npx remotion still src/index.ts Thumbnail out/thumbnail.png` (and `ThumbnailB`, `ThumbnailC`); they live in `src/Thumbnail.tsx`.

## Description

```
The Quran has 77,399 words, but they come from fewer than 5,000 dictionary forms. Just 10 words make up a quarter of the text, and about 500 cover 80% of every page. Quranki teaches you those words in the order the Quran actually uses them, so you can understand it directly, word by word.

Start free at https://quranki.org, with progress that syncs across web, iPhone, and Android.
iPhone: https://apps.apple.com/us/app/quranki/id6805386348
Android: https://play.google.com/store/apps/details?id=com.quranki.app

What's inside:
- Learn by frequency: the most common Quranic words first, in stages up to the 99 Names of Allah
- Review with FSRS: the spaced repetition algorithm behind modern Anki schedules every word
- Every word in context: each flashcard shows a real ayah where it appears, glossed word by word
- A Quran reader that knows you: words you've learned lose their translation, new words keep it, and every ayah shows how much you understand
- Hints, full translations, grammar, lemma, root, and frequency for any word
- Memorize (hifz): rukus unlock once you understand 70% of their words, with FSRS revision
- Progress: your coverage of the whole Quran, per surah and per ayah
- Desktop extras: command palette, pins, bookmark collections, dark and light mode

Chapters
0:00 Why most people recite without understanding
0:26 Why 500 words cover 80% of the Quran
1:00 How Quranki works
1:19 Web, iPhone, and Android
1:33 The Learn dashboard
2:00 A study session
2:36 The Quran reader
3:18 Memorize (hifz)
3:42 Progress
4:04 Built for desktop
4:22 Quranki on iPhone
4:56 Free guides
5:13 Get started

Free guides, built on real corpus data:
- Most common words in the Quran: https://quranki.org/blog/most-common-words-in-the-quran
- How many words do you need to understand the Quran: https://quranki.org/blog/how-many-words-to-understand-the-quran
- How long does it take to learn Quranic Arabic: https://quranki.org/blog/how-long-does-it-take-to-learn-quranic-arabic
- Spaced repetition for Quranic Arabic: https://quranki.org/blog/spaced-repetition-for-quranic-arabic

Word counts and frequencies come from the Quranic Arabic Corpus.

#Quran #QuranicArabic #LearnArabic
```

## Tags

quranki, quranic arabic, learn quranic arabic, understand the quran, quran word by word, quran vocabulary, most common words in the quran, learn arabic for quran, quran flashcards, spaced repetition, fsrs, anki arabic, hifz app, memorize quran, quran app, arabic vocabulary app, quran reader, quran translation word by word
