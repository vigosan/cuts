#!/bin/sh
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/fixtures"
FFMPEG=${FFMPEG:-ffmpeg}
mkdir -p "$OUT"

KICK='0.8*sin(2*PI*55*t)*exp(-20*mod(t,0.48387))+0.2*sin(2*PI*110*t)'
PAD='0.05*sin(2*PI*220*t)'
SET="if(between(t,120,150)+between(t,360,390),$PAD,$KICK)"

[ -f "$OUT/set.mp4" ] || "$FFMPEG" -hide_banner -loglevel error -y \
  -f lavfi -i "testsrc2=size=640x360:rate=30:duration=600" \
  -f lavfi -i "aevalsrc='$SET|$SET':s=44100:d=600" \
  -c:v libx264 -preset veryfast -c:a aac -b:a 192k -shortest "$OUT/set.mp4"

[ -f "$OUT/silent.mp4" ] || "$FFMPEG" -hide_banner -loglevel error -y \
  -f lavfi -i "testsrc2=size=640x360:rate=30:duration=5" -c:v libx264 -preset veryfast "$OUT/silent.mp4"

[ -f "$OUT/rotated.mp4" ] || "$FFMPEG" -hide_banner -loglevel error -y \
  -f lavfi -i "testsrc2=size=640x360:rate=30:duration=20" \
  -f lavfi -i "aevalsrc='$KICK|$KICK':s=44100:d=20" \
  -c:v libx264 -preset veryfast -c:a aac -shortest "$OUT/rotated-raw.mp4"
[ -f "$OUT/rotated.mp4" ] || { "$FFMPEG" -hide_banner -loglevel error -y -display_rotation 90 -i "$OUT/rotated-raw.mp4" -c copy "$OUT/rotated.mp4"; rm "$OUT/rotated-raw.mp4"; }

[ -f "$OUT/hdr.mov" ] || "$FFMPEG" -hide_banner -loglevel error -y \
  -f lavfi -i "testsrc2=size=640x360:rate=30:duration=5" \
  -vf "format=yuv420p10le" -c:v libx265 -tag:v hvc1 -x265-params log-level=error \
  -color_primaries bt2020 -color_trc arib-std-b67 -colorspace bt2020nc "$OUT/hdr.mov"

node --no-warnings "$ROOT/scripts/reference-peaks.ts" "$OUT/set.mp4" > "$OUT/set-reference-peaks.json"
swift build -c release --package-path "$ROOT/modules/cuts-media/ios/CutsMedia" --product cuts-media-cli >/dev/null
"$ROOT/modules/cuts-media/ios/CutsMedia/.build/release/cuts-media-cli" peaks "$OUT/set.mp4" > "$OUT/set-swift-peaks.json"
