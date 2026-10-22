import React from 'react';
import { AbsoluteFill, Audio, Sequence, staticFile } from 'remotion';

import voiceover from './data/voiceover.json';
import { FPS, SCENES } from './scenes';
import { BlogScene, LandingScene, LearnScene, MemorizeScene, PowerScene, ProgressScene, ReaderScene, SessionScene } from './scenes/Desktop';
import { MobileScene, OutroScene } from './scenes/Mobile';
import { InsightScene, MethodScene, OpenScene, TitleScene } from './scenes/Story';
import { C, SceneFade } from './ui';

const COMPONENTS: Record<string, React.FC> = {
  open: OpenScene,
  title: TitleScene,
  insight: InsightScene,
  method: MethodScene,
  landing: LandingScene,
  learn: LearnScene,
  session: SessionScene,
  reader: ReaderScene,
  memorize: MemorizeScene,
  progress: ProgressScene,
  power: PowerScene,
  mobile: MobileScene,
  blog: BlogScene,
  outro: OutroScene,
};

/** Frames each scene lingers into the next one for a crossfade. */
const OVER = 14;

export const QurankiVideo: React.FC = () => {
  let start = 0;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {SCENES.map((scene, i) => {
        const dur = scene.seconds * FPS;
        const from = start;
        start += dur;
        const Comp = COMPONENTS[scene.id];
        const last = i === SCENES.length - 1;
        return (
          <Sequence key={scene.id} from={from} durationInFrames={dur + (last ? 0 : OVER)} name={scene.title}>
            <SceneFade dur={last ? dur + 100 : dur} over={OVER}>
              <Comp />
            </SceneFade>
          </Sequence>
        );
      })}
      {/* Narration clips, placed on their cues by scripts/voiceover.ts. */}
      {voiceover.map((line) => (
        <Sequence key={line.src} from={line.from} name={`VO ${line.text}`} layout="none">
          <Audio src={staticFile(line.src)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
