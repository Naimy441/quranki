# Quranki product video

A 5:27 product demo built with [Remotion](https://www.remotion.dev). Desktop footage is real screenshots of the web app; mobile footage is the iOS app running in the simulator. Both use the same seeded demo account.

- `out/quranki-demo.mp4` is the rendered video (1920x1080, 30 fps) with ElevenLabs narration (voice: Jon).
- `SCRIPT.md` is the voiceover script with timestamps per section.
- `out/voiceover-guide.srt` has the narration as captions, timed to the generated audio.

## Rebuilding

```sh
npm install
./scripts/seed.sh                        # regenerate the demo account (dates are relative to today)
node scripts/capture.mjs http://localhost:3100   # web screenshots, with `npm run web` running
npx tsx --env-file=.env scripts/voiceover.ts   # narration clips + timeline (needs ELEVENLABS_API_KEY in .env)
npx tsx scripts/script-doc.ts            # SCRIPT.md + captions from src/scenes.ts
npx remotion studio src/index.ts         # preview and tweak
npx remotion render src/index.ts Quranki out/quranki-demo.mp4 --crf 16
# normalize the narration to -16 LUFS
ffmpeg -i out/quranki-demo.mp4 -c:v copy -af loudnorm=I=-16:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 192k -movflags +faststart out/final.mp4 && mv out/final.mp4 out/quranki-demo.mp4
```

Scene timing and narration live together in `src/scenes.ts`, so changing a line or a duration updates the video, the script, and the captions. Each sentence has a cue, the frame its visual appears; `scripts/voiceover.ts` starts the line there (or right after the previous line) and warns if a line starts late or runs past its scene. Clips are cached in `public/vo` and only regenerated when their text changes.

iOS shots (`public/shots/i-*.png`) come from the simulator. `scripts/seed-ios.py` writes the demo account into the installed app's AsyncStorage, and `scripts/isnap.sh` saves the current simulator screen.
