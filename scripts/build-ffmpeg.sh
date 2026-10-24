#!/bin/sh
set -eu

VERSION=9.0.2
SHA256=8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK="$ROOT/vendor/ffmpeg"
OUT="$ROOT/resources/ffmpeg"
TARBALL="$WORK/ffmpeg-$VERSION.tar.xz"
SOURCE="$WORK/ffmpeg-$VERSION"

mkdir -p "$WORK" "$OUT"
[ -f "$TARBALL" ] || curl -fL --retry 3 -o "$TARBALL" "https://ffmpeg.org/releases/ffmpeg-$VERSION.tar.xz"
ACTUAL=$(shasum -a 256 "$TARBALL" | cut -d' ' -f1)
if [ "$ACTUAL" != "$SHA256" ]; then
  echo "ffmpeg-$VERSION.tar.xz checksum mismatch: $ACTUAL" >&2
  exit 1
fi
rm -rf "$SOURCE"
tar -xJf "$TARBALL" -C "$WORK"

CONFIGURE="--prefix=$WORK/install \
  --arch=arm64 \
  --extra-cflags=-mmacosx-version-min=13.0 \
  --extra-ldflags=-mmacosx-version-min=13.0 \
  --enable-static --disable-shared \
  --disable-autodetect --enable-videotoolbox --enable-audiotoolbox \
  --disable-network --disable-doc --disable-ffplay --disable-ffprobe \
  --disable-debug"

cd "$SOURCE"
./configure $CONFIGURE
make -j"$(sysctl -n hw.ncpu)"

cp ffmpeg "$OUT/ffmpeg"
cp COPYING.LGPLv2.1 "$OUT/LICENSE-FFmpeg.txt"
{
  echo "FFmpeg $VERSION, built from https://ffmpeg.org/releases/ffmpeg-$VERSION.tar.xz"
  echo "SHA-256 of the source tarball: $ACTUAL"
  echo "Configure line: ./configure $CONFIGURE" | tr -s ' '
} > "$OUT/BUILD-FFmpeg.txt"

"$OUT/ffmpeg" -hide_banner -version | head -3
