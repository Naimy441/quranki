import React from 'react';
import { Composition, Still } from 'remotion';

import { FPS, TOTAL_SECONDS } from './scenes';
import { Thumbnail, ThumbnailB, ThumbnailC } from './Thumbnail';
import { QurankiVideo } from './Video';

export const Root: React.FC = () => (
  <>
    <Composition id="Quranki" component={QurankiVideo} durationInFrames={TOTAL_SECONDS * FPS} fps={FPS} width={1920} height={1080} />
    <Still id="Thumbnail" component={Thumbnail} width={1280} height={720} />
    <Still id="ThumbnailB" component={ThumbnailB} width={1280} height={720} />
    <Still id="ThumbnailC" component={ThumbnailC} width={1280} height={720} />
  </>
);
