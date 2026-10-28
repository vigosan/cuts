#!/bin/sh
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
WEB="$ROOT/../web/public/screenshots"
STORE="$ROOT/../../docs/release/screenshots"
WORK=$(mktemp -d)
PORT=9341
trap 'pkill -f "remote-debugging-port=$PORT" || true; rm -rf "$WORK"' EXIT

cd "$ROOT"
npx electron-vite build >/dev/null

with_app() {
  lang=$1
  script=$2
  shift 2
  rm -rf "$WORK/userdata"
  npx electron . --lang="$lang" --user-data-dir="$WORK/userdata" --remote-debugging-port=$PORT >/dev/null 2>&1 &
  until curl -s "http://127.0.0.1:$PORT/json" | grep -q webSocketDebuggerUrl; do sleep 1; done
  ws=$(curl -s "http://127.0.0.1:$PORT/json" | grep webSocketDebuggerUrl | sed 's/.*"\(ws[^"]*\)".*/\1/')
  node "$ROOT/scripts/$script" "$ws" "$@"
  pkill -f "remote-debugging-port=$PORT"
  while pgrep -f "remote-debugging-port=$PORT" >/dev/null; do sleep 1; done
}

record_drops() {
  lang=$1
  frames=$2
  scheme=$3
  for attempt in 1 2 3; do
    rm -rf "$frames"
    with_app "$lang" record-drops.mjs "$frames" "$scheme"
    if [ "$(python3 -c 'import json, sys; print(len(json.load(open(sys.argv[1]))))' "$frames/frames.json")" -ge 30 ]; then return; fi
  done
  echo "The drops recording for $lang $scheme kept coming out empty" >&2
  exit 1
}

for scheme in light dark; do
  suffix=$([ "$scheme" = dark ] && echo -dark || true)
  mkdir -p "$WORK/$scheme"
  for lang in en es; do
    with_app "$lang" store-screenshots.mjs "$WORK/$scheme" "$lang" "$scheme"
    record_drops "$lang" "$WORK/drops-$lang$suffix" "$scheme"
    "$ROOT/scripts/encode-drops.sh" "$WORK/drops-$lang$suffix" "$lang" "$suffix"
  done
done

for lang in en es; do
  for name in 1-overview 2-zoom 3-dark 4-framing; do cp "$WORK/light/$lang-$name.png" "$STORE/$lang-$name.png"; done
  cp "$WORK/light/$lang-timeline.png" "$WEB/$lang-timeline.png"
  cp "$WORK/dark/$lang-timeline.png" "$WEB/$lang-timeline-dark.png"
  sips -z 1000 1600 "$WORK/light/$lang-4-framing.png" --out "$WEB/$lang-framing.png" >/dev/null
  sips -z 1000 1600 "$WORK/dark/$lang-4-framing.png" --out "$WEB/$lang-framing-dark.png" >/dev/null
  sips -z 1000 1600 "$WORK/light/$lang-3-dark.png" --out "$WEB/$lang-dark.png" >/dev/null
  sips -z 1000 1600 "$WORK/dark/$lang-3-dark.png" --out "$WEB/$lang-light.png" >/dev/null
done

sips -g pixelWidth -g pixelHeight "$WEB/en-timeline.png" | awk '/pixel/ { printf "%s ", $2 } END { print "<- timeline size used in apps/web/components/Home.tsx" }'
