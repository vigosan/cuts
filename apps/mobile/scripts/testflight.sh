#!/bin/sh
set -eu

ROOT=$(cd "$(dirname "$0")/.." && pwd)
KEY_ID=PN375CPCF7
ISSUER=908e2185-1894-45a4-bb19-6d51d07389e3
KEY="$HOME/.appstoreconnect/private_keys/AuthKey_$KEY_ID.p8"
BUILD="$ROOT/build"
AUTH="-allowProvisioningUpdates -authenticationKeyPath $KEY -authenticationKeyID $KEY_ID -authenticationKeyIssuerID $ISSUER"

[ -f "$KEY" ] || { echo "Missing $KEY. Restore it from 1Password (see docs/release/iphone-testflight.md)." >&2; exit 1; }

cd "$ROOT"
rm -rf "$BUILD"
npx expo prebuild -p ios --clean
xcodebuild archive -workspace ios/Cuts.xcworkspace -scheme Cuts -configuration Release -destination generic/platform=iOS \
  -archivePath "$BUILD/Cuts.xcarchive" CURRENT_PROJECT_VERSION="$(date +%Y%m%d%H%M)" \
  DEVELOPMENT_TEAM=TKAZA7ZPZ2 CODE_SIGN_STYLE=Automatic $AUTH
xcodebuild -exportArchive -archivePath "$BUILD/Cuts.xcarchive" -exportPath "$BUILD/export" \
  -exportOptionsPlist "$ROOT/scripts/ExportOptions.plist"
xcrun altool --upload-app -f "$BUILD/export/Cuts.ipa" -t ios --apple-id 6826686848 --apiKey "$KEY_ID" --apiIssuer "$ISSUER"
