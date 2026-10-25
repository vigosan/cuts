#!/bin/sh
set -eu

TARGET=${1:-mac}
VERSION=9.0.2
SHA256=8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e
ROOT=$(cd "$(dirname "$0")/.." && pwd)
WORK="$ROOT/vendor/ffmpeg"
OUT="$ROOT/resources/ffmpeg"
TARBALL="$WORK/ffmpeg-$VERSION.tar.xz"
NASM_VERSION=3.02
NASM_SHA256=87336eba53b4acfe917424ab5d500d2b0054d9f5148d35c2273ccf2cfb712f0d
NASM_DIR="$ROOT/vendor/nasm"
OPENH264_VERSION=2.6.0
OPENH264_SHA256=558544ad358283a7ab2930d69a9ceddf913f4a51ee9bf1bfb9e377322af81a69
OPENH264_DIR="$ROOT/vendor/openh264"

case "$(uname)" in
  Darwin) JOBS=$(sysctl -n hw.ncpu) ;;
  *) JOBS=$(nproc) ;;
esac

mkdir -p "$WORK" "$OUT"
[ -f "$TARBALL" ] || curl -fL --retry 3 -o "$TARBALL" "https://ffmpeg.org/releases/ffmpeg-$VERSION.tar.xz"
ACTUAL=$(shasum -a 256 "$TARBALL" | cut -d' ' -f1)
if [ "$ACTUAL" != "$SHA256" ]; then
  echo "ffmpeg-$VERSION.tar.xz checksum mismatch: $ACTUAL" >&2
  exit 1
fi

mkdir -p "$NASM_DIR"
NASM_TARBALL="$NASM_DIR/nasm-$NASM_VERSION.tar.xz"
[ -f "$NASM_TARBALL" ] || curl -fL --retry 3 -o "$NASM_TARBALL" "https://www.nasm.us/pub/nasm/releasebuilds/$NASM_VERSION/nasm-$NASM_VERSION.tar.xz"
if [ "$(shasum -a 256 "$NASM_TARBALL" | cut -d' ' -f1)" != "$NASM_SHA256" ]; then
  echo "nasm-$NASM_VERSION.tar.xz checksum mismatch" >&2
  exit 1
fi
if [ ! -x "$NASM_DIR/bin/nasm" ]; then
  rm -rf "$NASM_DIR/nasm-$NASM_VERSION"
  tar -xJf "$NASM_TARBALL" -C "$NASM_DIR"
  (cd "$NASM_DIR/nasm-$NASM_VERSION" && ./configure --prefix="$NASM_DIR" && make -j"$JOBS" && make install)
fi
PATH="$NASM_DIR/bin:$PATH"
export PATH

COMMON="--enable-static --disable-shared \
  --disable-autodetect \
  --disable-network --disable-doc --disable-ffplay --disable-ffprobe \
  --disable-debug"

build() {
  arch=$1
  shift
  source="$WORK/$arch/ffmpeg-$VERSION"
  rm -rf "$WORK/$arch"
  mkdir -p "$WORK/$arch"
  tar -xJf "$TARBALL" -C "$WORK/$arch"
  (cd "$source" && eval ./configure "$@" && make -j"$JOBS")
}

publish() {
  build_file=$1
  cp "$WORK/$2/ffmpeg-$VERSION/COPYING.LGPLv2.1" "$OUT/LICENSE-FFmpeg.txt"
  mkdir -p "$ROOT/apps/web/public/ffmpeg"
  cp "$OUT/BUILD-FFmpeg.txt" "$ROOT/apps/web/public/ffmpeg/$build_file"
  cp "$OUT/LICENSE-FFmpeg.txt" "$ROOT/apps/web/public/ffmpeg/"
}

case "$TARGET" in
  mac)
    MAC="--extra-cflags=-mmacosx-version-min=13.0 \
      --extra-ldflags=-mmacosx-version-min=13.0 \
      $COMMON --enable-videotoolbox --enable-audiotoolbox --enable-zlib"
    ARM64="--arch=arm64 $MAC"
    X86_64="--arch=x86_64 --enable-cross-compile --target-os=darwin --cc=clang --extra-cflags=-arch\ x86_64 --extra-ldflags=-arch\ x86_64 $MAC"

    build arm64 "$ARM64"
    build x86_64 "$X86_64"

    lipo -create "$WORK/arm64/ffmpeg-$VERSION/ffmpeg" "$WORK/x86_64/ffmpeg-$VERSION/ffmpeg" -output "$OUT/ffmpeg"
    {
      echo "FFmpeg $VERSION, built from https://ffmpeg.org/releases/ffmpeg-$VERSION.tar.xz"
      echo "SHA-256 of the source tarball: $ACTUAL"
      echo "Universal binary (arm64 + x86_64) joined with lipo."
      echo "arm64 configure line: ./configure $ARM64" | tr -s ' '
      echo "x86_64 configure line: ./configure $X86_64" | tr -s ' '
    } > "$OUT/BUILD-FFmpeg.txt"
    publish BUILD-FFmpeg.txt arm64

    lipo -info "$OUT/ffmpeg"
    "$OUT/ffmpeg" -hide_banner -L | head -1
    ;;

  linux)
    mkdir -p "$OPENH264_DIR"
    OPENH264_TARBALL="$OPENH264_DIR/openh264-$OPENH264_VERSION.tar.gz"
    [ -f "$OPENH264_TARBALL" ] || curl -fL --retry 3 -o "$OPENH264_TARBALL" "https://github.com/cisco/openh264/archive/refs/tags/v$OPENH264_VERSION.tar.gz"
    if [ "$(shasum -a 256 "$OPENH264_TARBALL" | cut -d' ' -f1)" != "$OPENH264_SHA256" ]; then
      echo "openh264-$OPENH264_VERSION.tar.gz checksum mismatch" >&2
      exit 1
    fi
    rm -rf "$OPENH264_DIR/openh264-$OPENH264_VERSION" "$OPENH264_DIR/prefix"
    tar -xzf "$OPENH264_TARBALL" -C "$OPENH264_DIR"
    (cd "$OPENH264_DIR/openh264-$OPENH264_VERSION" && make -j"$JOBS" PREFIX="$OPENH264_DIR/prefix" install-static)

    LINUX="--arch=x86_64 $COMMON --enable-libopenh264 --enable-zlib \
      --pkg-config-flags=--static --extra-ldflags=-static"
    PKG_CONFIG_PATH="$OPENH264_DIR/prefix/lib/pkgconfig"
    export PKG_CONFIG_PATH
    build linux "$LINUX"

    cp "$WORK/linux/ffmpeg-$VERSION/ffmpeg" "$OUT/ffmpeg"
    cp "$OPENH264_DIR/openh264-$OPENH264_VERSION/LICENSE" "$OUT/LICENSE-OpenH264.txt"
    {
      echo "FFmpeg $VERSION, built from https://ffmpeg.org/releases/ffmpeg-$VERSION.tar.xz"
      echo "SHA-256 of the source tarball: $ACTUAL"
      echo "Static x86_64 Linux binary, linked with OpenH264 $OPENH264_VERSION (BSD 2-Clause) built from https://github.com/cisco/openh264/archive/refs/tags/v$OPENH264_VERSION.tar.gz"
      echo "SHA-256 of the OpenH264 source tarball: $OPENH264_SHA256"
      echo "configure line: ./configure $LINUX" | tr -s ' '
    } > "$OUT/BUILD-FFmpeg.txt"
    publish BUILD-FFmpeg-linux.txt linux
    cp "$OUT/LICENSE-OpenH264.txt" "$ROOT/apps/web/public/ffmpeg/"

    "$OUT/ffmpeg" -hide_banner -encoders | grep libopenh264
    ;;

  windows)
    WINDOWS="--arch=x86_64 --target-os=mingw32 --enable-cross-compile --cross-prefix=x86_64-w64-mingw32- \
      $COMMON --enable-mediafoundation --enable-d3d11va --extra-ldflags=-static"
    build windows "$WINDOWS"

    cp "$WORK/windows/ffmpeg-$VERSION/ffmpeg.exe" "$OUT/ffmpeg.exe"
    {
      echo "FFmpeg $VERSION, built from https://ffmpeg.org/releases/ffmpeg-$VERSION.tar.xz"
      echo "SHA-256 of the source tarball: $ACTUAL"
      echo "Static x86_64 Windows binary, cross-compiled with MinGW-w64."
      echo "configure line: ./configure $WINDOWS" | tr -s ' '
    } > "$OUT/BUILD-FFmpeg.txt"
    publish BUILD-FFmpeg-windows.txt windows

    file "$OUT/ffmpeg.exe"
    ;;

  *)
    echo "usage: $0 [mac|linux|windows]" >&2
    exit 1
    ;;
esac
