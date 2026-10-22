#!/bin/sh
# Regenerates the demo account relative to the current time.
cd "$(dirname "$0")/../../web" && ../video/node_modules/.bin/tsx --tsconfig tsconfig.json ../video/scripts/seed.ts
