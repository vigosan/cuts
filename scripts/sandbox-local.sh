#!/bin/sh
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
OUT="$ROOT/dist-sandbox"
APP="$OUT/mas-universal/Cuts.app"
INHERIT="$ROOT/build/entitlements.mas.inherit.plist"
PARENT="$OUT/entitlements.local.plist"

cd "$ROOT"
npx electron-vite build
rm -rf "$OUT"
npx electron-builder --mac mas --universal -c.mas.identity=null -c.mas.provisioningProfile=null \
  -c.mac.identity=null -c.directories.output="$OUT" || [ -d "$APP" ]

sed "s/APPLE_TEAM_ID/LOCALTEST/" build/entitlements.mas.template.plist \
  | sed 's#</dict>#  <key>com.apple.security.network.server</key>\n  <true/>\n</dict>#' > "$PARENT"
/usr/libexec/PlistBuddy -c "Add :ElectronTeamID string LOCALTEST" "$APP/Contents/Info.plist"

find "$APP/Contents/Frameworks" \( -name "*.dylib" -o -name "*.so" \) -exec codesign -f -s - --entitlements "$INHERIT" {} \;
for item in "$APP"/Contents/Frameworks/*.framework "$APP"/Contents/Frameworks/*.app \
  "$APP"/Contents/Library/LoginItems/*.app "$APP/Contents/MacOS/ffmpeg"; do
  codesign -f -s - --entitlements "$INHERIT" "$item"
done
codesign -f -s - --entitlements "$PARENT" "$APP"
codesign --verify --deep --strict "$APP"
echo "Sandboxed test build: $APP"
echo "Run it with: \"$APP/Contents/MacOS/Cuts\" --remote-debugging-port=9222"
