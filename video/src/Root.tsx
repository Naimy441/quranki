import React from 'react';
import { Composition, Still } from 'remotion';

import { FPS, TOTAL_SECONDS } from './scenes';
import { Thumbnail, ThumbnailB, ThumbnailC } from './Thumbnail';
import { FATIHA_FRAMES, FatihaVideo } from './clips/Fatiha';
import { FatihaThumbnail, FatihaThumbnailB } from './clips/FatihaThumbnail';
import { RAHMA_FRAMES, RahmaShort } from './clips/Rahma';
import { TOPTEN_FRAMES, TopTenShort } from './clips/TopTen';
import { QurankiVideo } from './Video';

export const Root: React.FC = () => (
  <>
    <Composition id="Quranki" component={QurankiVideo} durationInFrames={TOTAL_SECONDS * FPS} fps={FPS} width={1920} height={1080} />
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
    <Still id="ThumbnailB" component={ThumbnailB} width={1280} height={720} />
    <Still id="ThumbnailC" component={ThumbnailC} width={1280} height={720} />
    <Composition id="ShortTopTen" component={TopTenShort} durationInFrames={TOPTEN_FRAMES} fps={FPS} width={1080} height={1920} />
    <Composition id="ShortRahma" component={RahmaShort} durationInFrames={RAHMA_FRAMES} fps={FPS} width={1080} height={1920} />
    <Composition id="Fatiha" component={FatihaVideo} durationInFrames={FATIHA_FRAMES} fps={FPS} width={1920} height={1080} />
    <Still id="FatihaThumbnail" component={FatihaThumbnail} width={1280} height={720} />
    <Still id="FatihaThumbnailB" component={FatihaThumbnailB} width={1280} height={720} />
  </>
);
