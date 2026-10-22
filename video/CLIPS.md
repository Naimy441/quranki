# Shorts and Al-Fatiha video

Three videos built with the same Remotion setup as the demo, narrated by ElevenLabs Jon. Recitation is Sheikh Mahmoud Khalil al-Husary (murattal), and single recited words come from Quran.com's word-by-word audio. Counts come from the Quranic Arabic Corpus, glosses from the app's word-by-word data, and translations from Sahih International.

| File | Format | Length |
|---|---|---|
| `out/clips/short-top-ten.mp4` | Short, 1080x1920 | 0:54 |
| `out/clips/short-womb-mercy.mp4` | Short, 1080x1920 | 0:58 |
| `out/clips/fatiha-word-by-word.mp4` | Long form, 1920x1080 | 8:48 |
| `out/clips/fatiha-thumbnail.png`, `fatiha-thumbnail-b.png` | Thumbnails (A/B) | |

## Rebuilding

```sh
npx tsx scripts/clips-data.ts                              # Al-Fatiha word data from the app's corpus files
npx tsx --env-file=.env scripts/clips-voiceover.ts         # Jon's lines + timelines (or name tracks: topten rahma fatiha)
npx remotion render src/index.ts ShortTopTen out/clips/short-top-ten.mp4 --crf 16   # also ShortRahma, Fatiha
npx remotion still src/index.ts FatihaThumbnail out/clips/fatiha-thumbnail.png      # also FatihaThumbnailB
```

Narration, sound, and pacing live in `src/clips/tracks.ts`. Each segment plays its audio (a recitation or one recited word), then Jon's line, and the visuals hang off segment ids, so editing a line re-times everything after it. Normalize to -16 LUFS with the same `ffmpeg loudnorm` command as the demo.

---

## Short 1: The 10 words that make up 25% of the Quran

**Title:** These 10 Words Are 25% of the Quran

Alternates:
- 10 Words = A Quarter of the Quran (#1 Isn't Allah)
- The Most Common Word in the Quran Isn't What You Think

**Description:**
```
The Quran has 77,399 words. Just 10 of them make up a quarter of the whole text. Learn these and one in every four words you read is already familiar.

10. kāna - he was (1,358)
9. ʿalā - on, upon (1,445)
8. alladhī - who, which (1,464)
7. qāla - he said (1,618)
6. inna - indeed (1,682)
5. fī - in (1,701)
4. lā - no, not (1,738)
3. mā - what (2,565)
2. Allah (2,699)
1. min - from (3,226)

Quranki teaches the Quran's words in exactly this order, with spaced repetition: https://quranki.org

Counts from the Quranic Arabic Corpus.
#Quran #QuranicArabic #LearnArabic #Shorts
```

## Short 2: Womb and mercy share one root

**Title:** In Arabic, "Womb" and "Mercy" Share One Root

Alternates:
- The Word for Womb Comes From Mercy
- 3 Letters, 339 Words: The Root of Mercy in the Quran

**Description:**
```
Raḥmah (mercy), ar-Raḥmān, ar-Raḥīm, and al-arḥām (the wombs) are all built from the same three letters: ر ح م. Words from this root appear 339 times in the Quran.

"It is He who forms you in the wombs however He wills." (Al Imran 3:6, Sahih International)

Every time you say Bismillah ir-Rahman ir-Raheem, you use this root twice. Learn one root and you start recognizing words all over the Quran.

Learn the Quran's vocabulary with Quranki: https://quranki.org

Recitation: Sheikh Mahmoud Khalil al-Husary. Counts from the Quranic Arabic Corpus.
#Quran #ArabicRoots #QuranicArabic #Shorts
```

## Long form: Al-Fatiha word by word

**Title (A, pairs with `fatiha-thumbnail.png`):** Understand Al-Fatiha Word by Word (You've Said It 90,000 Times)

**Title (B, pairs with `fatiha-thumbnail-b.png`):** Surah Al-Fatiha Word by Word: Understand What You Recite in Salah

Others worth testing:
- Learn the Meaning of Every Word in Al-Fatiha in 9 Minutes
- What Are You Actually Saying in Salah? Al-Fatiha Word by Word

**Description:**
```
If you've prayed for 15 years, you've recited Al-Fatiha more than 90,000 times. This video goes through all 29 of its words, one at a time: what each one means, the prefixes and suffixes inside it, its root, and how often it appears in the Quran.

The 23 distinct words in Al-Fatiha appear 9,783 times across the Quran, about one in every eight words you'll read in it. Learning them is the best first step toward understanding the Quran in Arabic.

Chapters
0:00 You've recited it 90,000 times
0:37 Al-Fatiha, word by word
0:41 Ayah 1: Bismillah ir-Rahman ir-Raheem
1:41 Ayah 2: Al-hamdu lillahi rabbil 'alameen
2:42 Ayah 3: Ar-Rahman ir-Raheem
3:05 Ayah 4: Maliki yawm id-deen
3:53 Ayah 5: Iyyaka na'budu wa iyyaka nasta'een
4:52 Ayah 6: Ihdinas-siratal mustaqeem
5:33 Ayah 7: Siratal ladheena an'amta 'alayhim
7:12 The whole surah, with every meaning
8:10 What to learn next

Keep going with Quranki. It teaches the Quran's words in the order the Quran uses them, with spaced repetition so they stick, and a reader that hides the meanings of words you already know.
Web: https://quranki.org
iPhone: https://apps.apple.com/us/app/quranki/id6805386348
Android: https://play.google.com/store/apps/details?id=com.quranki.app

Recitation: Sheikh Mahmoud Khalil al-Husary. Word-by-word audio: Quran.com. Translation: Sahih International. Word counts and roots: Quranic Arabic Corpus.

#AlFatiha #QuranicArabic #Quran
```

**Tags:** al fatiha word by word, surah fatiha meaning, al fatiha meaning, understand salah, what to say in salah meaning, quranic arabic, learn quranic arabic, quran word by word, surah al fatiha tafsir, arabic for beginners quran, iyyaka nabudu meaning, bismillah meaning, quranki

**Pinned comment:**
```
Which surah should we go through word by word next? Al-Ikhlas, Al-Asr, Ayat al-Kursi, or something else?
```

## Notes before uploading

- Quran recitation can trigger Content ID claims on YouTube. They are usually non-monetizing, so check after upload.
- Upload the Shorts a few days apart, after the long form is live. Then set each Short's related video to the Al-Fatiha video so viewers can tap through to it.
- Have someone who reads Arabic watch the Jon narration once. The Arabic is read from phonetic spellings and has not been checked by ear.
