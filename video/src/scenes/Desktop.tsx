import React from 'react';
import { AbsoluteFill } from 'remotion';

import boxes from '../../public/shots/d-reader-boxes.json';
import { Background, BrowserWindow, Callout, CamKey, Chapter, Cursor, KeyHint, Layer } from '../ui';

const center = (b: { x: number; y: number; width: number; height: number }): [number, number] => [b.x + b.width / 2, b.y + b.height / 2];
const HOME: [number, number] = [720, 450];

export const LandingScene: React.FC = () => {
  const layers: Layer[] = [
    {
      src: 'd-landing-full',
      at: 0,
      height: 6346,
      scroll: [
        [0, 0],
        [75, 0],
        [140, 600],
        [195, 600],
        [260, 1440],
        [310, 1440],
        [375, 3480],
        [430, 3480],
      ],
    },
  ];
  return (
    <AbsoluteFill>
      <Background />
      <Chapter index="Web - iPhone - Android" label="quranki.org" />
      <BrowserWindow url="quranki.org" layers={layers} intro={4} />
    </AbsoluteFill>
  );
};

export const LearnScene: React.FC = () => {
  const cam: CamKey[] = [
    { at: 0, f: HOME, s: 1 },
    { at: 40, f: HOME, s: 1 },
    { at: 75, f: [610, 250], s: 1.45 },
    { at: 360, f: [610, 250], s: 1.45 },
    { at: 400, f: [1170, 200], s: 1.5 },
    { at: 520, f: [1170, 200], s: 1.5 },
    { at: 560, f: [610, 520], s: 1.25 },
    { at: 760, f: [610, 520], s: 1.25 },
    { at: 800, f: HOME, s: 1 },
  ];
  const layers: Layer[] = [
    { src: 'd-learn', at: 0 },
    { src: 'd-learn-full', at: 560, height: 1816, scroll: [[560, 0], [600, 0], [700, 360], [830, 360]] },
  ];
  return (
    <AbsoluteFill>
      <Background />
      <Chapter index="01" label="Learn" />
      <BrowserWindow url="quranki.org/learn" layers={layers} cam={cam}>
        <Callout cam={cam} box={{ x: 302, y: 104, w: 620, h: 160 }} label="44 words today" sub="30 reviews due - 14 new words" at={90} out={270} side="right" />
        <Callout cam={cam} box={{ x: 322, y: 312, w: 580, h: 54 }} label="848 mastered - 52 day streak" at={280} out={360} side="bottom" />
        <Callout cam={cam} box={{ x: 958, y: 104, w: 433, h: 188 }} label="About 15 minutes a day" sub="Study time, last 7 days" at={420} out={520} side="bottom" />
        <Callout cam={cam} box={{ x: 302, y: 54, w: 620, h: 60 }} label="Stage 2: the 99 Names of Allah" sub="Stages follow how often words appear" at={620} out={750} side="bottom" ring={false} />
      </BrowserWindow>
    </AbsoluteFill>
  );
};

export const SessionScene: React.FC = () => {
  const layers: Layer[] = [
    { src: 'd-session-0-front', at: 0 },
    { src: 'd-session-0-back', at: 190, fade: 8 },
    { src: 'd-session-1-front', at: 740, fade: 8 },
    { src: 'd-session-1-back', at: 790, fade: 8 },
    { src: 'd-session-2-front', at: 840, fade: 8 },
    { src: 'd-session-2-back', at: 885, fade: 8 },
    { src: 'd-session-3-front', at: 930, fade: 8 },
    { src: 'd-session-3-back', at: 970, fade: 8 },
    { src: 'd-session-4-front', at: 1010, fade: 8 },
    { src: 'd-session-4-back', at: 1045, fade: 8 },
  ];
  const cam: CamKey[] = [
    { at: 0, f: [720, 200], s: 1.25 },
    { at: 195, f: [720, 200], s: 1.25 },
    { at: 230, f: [720, 340], s: 1.55 },
    { at: 430, f: [720, 340], s: 1.55 },
    { at: 470, f: [720, 800], s: 1.45 },
    { at: 715, f: [720, 800], s: 1.45 },
    { at: 750, f: HOME, s: 1 },
  ];
  return (
    <AbsoluteFill>
      <Background />
      <Chapter index="02" label="Study session" />
      <BrowserWindow url="quranki.org/session/review" layers={layers} cam={cam}>
        <Callout cam={cam} box={{ x: 600, y: 60, w: 240, h: 150 }} label="Arabic first. Recall the meaning." at={20} out={180} side="bottom" ring={false} />
        <Callout cam={cam} box={{ x: 400, y: 282, w: 640, h: 170 }} label="A real ayah where the word appears" sub="Glossed word by word, with audio" at={245} out={425} side="bottom" />
        <Callout cam={cam} box={{ x: 400, y: 776, w: 640, h: 62 }} label="Each grade shows the next review" sub="Scheduled by FSRS" at={490} out={705} side="top" />
        <KeyHint
          keys={[
            { at: 190, key: 'Space', label: 'Show answer' },
            { at: 740, key: '3', label: 'Good' },
            { at: 790, key: 'Space', label: 'Show answer' },
            { at: 840, key: '3', label: 'Good' },
            { at: 885, key: 'Space', label: 'Show answer' },
            { at: 930, key: '4', label: 'Easy' },
            { at: 970, key: 'Space', label: 'Show answer' },
            { at: 1010, key: '3', label: 'Good' },
            { at: 1045, key: 'Space', label: 'Show answer' },
          ]}
        />
      </BrowserWindow>
    </AbsoluteFill>
  );
};

export const ReaderScene: React.FC = () => {
  const peek = center(boxes.peek);
  const tr = center(boxes.translate);
  const det = center(boxes.detail);
  const layers: Layer[] = [
    { src: 'd-quran-index', at: 0 },
    { src: 'd-reader-kahf', at: 200, fade: 16 },
    { src: 'd-reader-kahf-ayahs', at: 380, fade: 16 },
    { src: 'd-reader-kahf-peek', at: 782, fade: 6 },
    { src: 'd-reader-kahf-translate', at: 902, fade: 8 },
    { src: 'd-reader-word-detail', at: 1062, fade: 10 },
  ];
  const cam: CamKey[] = [
    { at: 0, f: HOME, s: 1 },
    { at: 60, f: [720, 560], s: 1.3 },
    { at: 180, f: [720, 560], s: 1.3 },
    { at: 210, f: HOME, s: 1 },
    { at: 230, f: [850, 300], s: 1.35 },
    { at: 360, f: [850, 300], s: 1.35 },
    { at: 395, f: [850, 260], s: 1.25 },
    { at: 520, f: [850, 260], s: 1.25 },
    { at: 560, f: [850, 420], s: 1.4 },
    { at: 690, f: [850, 420], s: 1.4 },
    { at: 720, f: [900, 420], s: 1.4 },
    { at: 860, f: [900, 420], s: 1.4 },
    { at: 890, f: [900, 250], s: 1.35 },
    { at: 1030, f: [900, 250], s: 1.35 },
    { at: 1070, f: [1100, 450], s: 1.08 },
  ];
  return (
    <AbsoluteFill>
      <Background />
      <Chapter index="03" label="Quran reader" />
      <BrowserWindow url="quranki.org/quran/18" layers={layers} cam={cam}>
        <Callout cam={cam} box={{ x: 380, y: 580, w: 960, h: 70 }} label="How much of each surah you understand" at={70} out={180} side="bottom" />
        <Callout cam={cam} box={{ x: 845, y: 337, w: 208, h: 32 }} label="Your understanding of this surah" at={240} out={350} side="bottom" />
        <Callout cam={cam} box={{ x: 425, y: 307, w: 847, h: 230 }} label="Known words: no translation" sub="Only new words keep their gloss" at={410} out={520} side="left" />
        <Callout cam={cam} box={{ x: 440, y: 300, w: 60, h: 40 }} label="Ayah coverage" at={570} out={680} side="right" />
        <Callout cam={cam} box={{ x: peek[0] - 140, y: 490, w: 280, h: 48 }} label="Click a known word for a hint" at={790} out={875} side="bottom" />
        <Callout cam={cam} box={{ x: 440, y: 318, w: 810, h: 40 }} label="Full translation, one click away" at={925} out={1030} side="bottom" />
        <Callout cam={cam} box={{ x: 1135, y: 60, w: 300, h: 360 }} label="Grammar, lemma, and root" sub="And how often it appears" at={1110} out={1240} side="left" ring={false} />
        <Cursor
          cam={cam}
          from={740}
          to={1150}
          path={[
            { at: 740, x: 1000, y: 700 },
            { at: 775, x: peek[0], y: peek[1], click: true },
            { at: 860, x: peek[0], y: peek[1] },
            { at: 895, x: tr[0], y: tr[1], click: true },
            { at: 1020, x: tr[0], y: tr[1] },
            { at: 1055, x: det[0], y: det[1], click: true },
            { at: 1150, x: det[0], y: det[1] },
          ]}
        />
      </BrowserWindow>
    </AbsoluteFill>
  );
};

export const MemorizeScene: React.FC = () => {
  const layers: Layer[] = [
    { src: 'd-memorize', at: 0 },
    { src: 'd-hifz-0', at: 340, fade: 16 },
    { src: 'd-hifz-1', at: 520, fade: 10 },
  ];
  const cam: CamKey[] = [
    { at: 0, f: HOME, s: 1 },
    { at: 60, f: [840, 420], s: 1.25 },
    { at: 320, f: [840, 420], s: 1.25 },
    { at: 350, f: [720, 300], s: 1.3 },
    { at: 500, f: [720, 300], s: 1.3 },
    { at: 540, f: [720, 380], s: 1.12 },
  ];
  return (
    <AbsoluteFill>
      <Background />
      <Chapter index="04" label="Memorize" />
      <BrowserWindow url="quranki.org/memorize" layers={layers} cam={cam}>
        <Callout cam={cam} box={{ x: 368, y: 120, w: 960, h: 70 }} label="Rukus unlock at 70% understood" at={125} out={235} side="bottom" ring={false} />
        <Callout cam={cam} box={{ x: 368, y: 340, w: 960, h: 370 }} label="9 rukus in revision" sub="Each one is its own FSRS card" at={245} out={330} side="top" />
        <Callout cam={cam} box={{ x: 520, y: 220, w: 400, h: 160 }} label="Start from the opening words" sub="Recite the rest from memory" at={370} out={505} side="bottom" ring={false} />
        <KeyHint keys={[{ at: 520, key: 'Space', label: 'Show ruku' }]} />
      </BrowserWindow>
    </AbsoluteFill>
  );
};

export const ProgressScene: React.FC = () => {
  const layers: Layer[] = [
    {
      src: 'd-progress-full',
      at: 0,
      height: 1962,
      scroll: [
        [0, 0],
        [300, 0],
        [360, 320],
        [520, 320],
        [600, 1062],
        [680, 1062],
      ],
    },
  ];
  const cam: CamKey[] = [
    { at: 0, f: HOME, s: 1 },
    { at: 40, f: [850, 340], s: 1.35 },
    { at: 215, f: [850, 340], s: 1.35 },
    { at: 250, f: [610, 560], s: 1.4 },
    { at: 300, f: [610, 560], s: 1.4 },
    { at: 350, f: [850, 560], s: 1.15 },
    { at: 520, f: [850, 560], s: 1.15 },
    { at: 580, f: HOME, s: 1 },
  ];
  return (
    <AbsoluteFill>
      <Background />
      <Chapter index="05" label="Progress" />
      <BrowserWindow url="quranki.org/progress" layers={layers} cam={cam}>
        <Callout cam={cam} box={{ x: 369, y: 306, w: 960, h: 105 }} label="81% of the Quran's words" sub="62,615 of 77,399 recognized" at={70} out={215} side="bottom" />
        <Callout cam={cam} box={{ x: 369, y: 444, w: 471, h: 246 }} label="How well you follow a typical ayah" at={255} out={305} side="right" />
        <Callout cam={cam} box={{ x: 369, y: 395, w: 960, h: 200 }} label="One bar for every surah" at={365} out={500} side="bottom" />
      </BrowserWindow>
    </AbsoluteFill>
  );
};

export const PowerScene: React.FC = () => {
  const layers: Layer[] = [
    { src: 'd-quran-index', at: 0 },
    { src: 'd-palette', at: 30, fade: 10 },
    { src: 'd-palette-typed', at: 95, fade: 10 },
    { src: 'd-saved', at: 250, fade: 16 },
    { src: 'd-learn', at: 390, fade: 14 },
    { src: 'd-learn-light', at: 450, fade: 22 },
  ];
  const cam: CamKey[] = [
    { at: 0, f: [720, 200], s: 1.3 },
    { at: 230, f: [720, 200], s: 1.3 },
    { at: 260, f: [560, 300], s: 1.25 },
    { at: 380, f: [560, 300], s: 1.25 },
    { at: 410, f: HOME, s: 1 },
  ];
  return (
    <AbsoluteFill>
      <Background />
      <Chapter index="06" label="Built for desktop" />
      <BrowserWindow url="quranki.org" layers={layers} cam={cam}>
        <Callout cam={cam} box={{ x: 442, y: 210, w: 558, h: 54 }} label="Jump to any ayah" sub="Command palette - Cmd K" at={120} out={235} side="bottom" />
        <Callout cam={cam} box={{ x: 210, y: 100, w: 700, h: 400 }} label="Pins and bookmark collections" at={280} out={380} side="right" ring={false} />
        <Callout cam={cam} box={{ x: 302, y: 104, w: 620, h: 280 }} label="Dark or light" at={470} out={540} side="bottom" ring={false} />
        <KeyHint keys={[{ at: 30, key: 'Cmd K', label: 'Search' }]} />
      </BrowserWindow>
    </AbsoluteFill>
  );
};

export const BlogScene: React.FC = () => {
  const layers: Layer[] = [
    { src: 'd-blog-index-full', at: 0, height: 2707, scroll: [[0, 0], [60, 0], [190, 820], [240, 820]] },
    {
      src: 'd-blog-most-common-words-in-the-quran',
      at: 250,
      fade: 18,
      height: 9364,
      scroll: [[250, 0], [300, 0], [390, 1000], [440, 1000], [520, 2450]],
    },
  ];
  return (
    <AbsoluteFill>
      <Background />
      <Chapter index="07" label="Free guides" />
      <BrowserWindow url="quranki.org/blog" layers={layers} />
    </AbsoluteFill>
  );
};
