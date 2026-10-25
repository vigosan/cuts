#!/bin/sh
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
ICONSET=$(mktemp -d)/icon.iconset
mkdir -p "$ICONSET"
for size in 16 32 128 256 512; do
  double=$((size * 2))
  npx electron "$ROOT/scripts/render-svg.cjs" "$ROOT/build/icon.svg" "$ICONSET/icon_${size}x${size}.png" "$size"
  npx electron "$ROOT/scripts/render-svg.cjs" "$ROOT/build/icon.svg" "$ICONSET/icon_${size}x${size}@2x.png" "$double"
done
iconutil -c icns "$ICONSET" -o "$ROOT/build/icon.icns"
cp "$ICONSET/icon_512x512@2x.png" "$ROOT/build/icon.png"
