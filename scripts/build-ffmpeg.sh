#!/bin/sh
set -eu

VERSION=9.0.2
SHA256=8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK="$ROOT/vendor/ffmpeg"
OUT="$ROOT/resources/ffmpeg"
TARBALL="$WORK/ffmpeg-$VERSION.tar.xz"

mkdir -p "$WORK" "$OUT"
[ -f "$TARBALL" ] || curl -fL --retry 3 -o "$TARBALL" "https://ffmpeg.org/releases/ffmpeg-$VERSION.tar.xz"
ACTUAL=$(shasum -a 256 "$TARBALL" | cut -d' ' -f1)
if [ "$ACTUAL" != "$SHA256" ]; then
  echo "ffmpeg-$VERSION.tar.xz checksum mismatch: $ACTUAL" >&2
  exit 1
fi

COMMON="--extra-cflags=-mmacosx-version-min=13.0 \
  --extra-ldflags=-mmacosx-version-min=13.0 \
  --enable-static --disable-shared \
  --disable-autodetect --enable-videotoolbox --enable-audiotoolbox --enable-zlib \
  --disable-network --disable-doc --disable-ffplay --disable-ffprobe \
  --disable-debug"
ARM64="--arch=arm64 $COMMON"
X86_64="--arch=x86_64 --enable-cross-compile --target-os=darwin --cc=clang --extra-cflags=-arch\ x86_64 --extra-ldflags=-arch\ x86_64 --disable-x86asm $COMMON"

build() {
  arch=$1
  shift
  source="$WORK/$arch/ffmpeg-$VERSION"
  rm -rf "$WORK/$arch"
  mkdir -p "$WORK/$arch"
  tar -xJf "$TARBALL" -C "$WORK/$arch"
  (cd "$source" && eval ./configure "$@" && make -j"$(sysctl -n hw.ncpu)")
}

build arm64 "$ARM64"
build x86_64 "$X86_64"

lipo -create "$WORK/arm64/ffmpeg-$VERSION/ffmpeg" "$WORK/x86_64/ffmpeg-$VERSION/ffmpeg" -output "$OUT/ffmpeg"
cp "$WORK/arm64/ffmpeg-$VERSION/COPYING.LGPLv2.1" "$OUT/LICENSE-FFmpeg.txt"
{
  echo "FFmpeg $VERSION, built from https://ffmpeg.org/releases/ffmpeg-$VERSION.tar.xz"
  echo "SHA-256 of the source tarball: $ACTUAL"
  echo "Universal binary (arm64 + x86_64) joined with lipo."
  echo "arm64 configure line: ./configure $ARM64" | tr -s ' '
  echo "x86_64 configure line: ./configure $X86_64" | tr -s ' '
} > "$OUT/BUILD-FFmpeg.txt"

mkdir -p "$ROOT/web/public/ffmpeg"
cp "$OUT/BUILD-FFmpeg.txt" "$OUT/LICENSE-FFmpeg.txt" "$ROOT/web/public/ffmpeg/"

lipo -info "$OUT/ffmpeg"
"$OUT/ffmpeg" -hide_banner -L | head -1
