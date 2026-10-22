#!/bin/sh
# Saves the simulator screen as public/shots/<name>.png and a small preview.
sleep ${2:-1.2}
xcrun simctl io ${SIM:-0D1EF2D9-9AEA-4395-AF1E-E1DE7A2B52F8} screenshot "$(dirname "$0")/../public/shots/$1.png" >/dev/null 2>&1
sips -Z 640 "$(dirname "$0")/../public/shots/$1.png" --out /private/tmp/claude-501/-Users-naim-Desktop-quranki/206f5a92-5054-4d47-a78d-946598b84c43/scratchpad/prev/$1.png >/dev/null && echo "saved $1"
