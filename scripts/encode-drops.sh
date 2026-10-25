#!/bin/sh
set -eu

FRAMES=$1
LANG_CODE=$2
ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/web/public/screenshots"

python3 - "$FRAMES" <<'PY'
import json, sys
frames = json.load(open(f"{sys.argv[1]}/frames.json"))
with open(f"{sys.argv[1]}/list.txt", "w") as out:
    for a, b in zip(frames, frames[1:]):
        out.write(f"file '{a['name']}'\nduration {b['t'] - a['t']:.3f}\n")
    out.write(f"file '{frames[-1]['name']}'\nduration 0.5\nfile '{frames[-1]['name']}'\n")
PY
ffmpeg -hide_banner -loglevel error -y -f concat -safe 0 -i "$FRAMES/list.txt" \
  -vf "fps=30,scale=1440:-2:flags=lanczos,format=yuv420p" -c:v libx264 -preset slow -crf 26 -movflags +faststart -an \
  "$OUT/$LANG_CODE-drops.mp4"
sips -z 900 1440 -s format jpeg -s formatOptions 82 "$(ls "$FRAMES"/f*.png | tail -1)" --out "$OUT/$LANG_CODE-drops-poster.jpg" >/dev/null
