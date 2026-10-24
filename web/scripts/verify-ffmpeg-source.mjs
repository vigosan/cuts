import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const VERSION = "9.0.2";
const SHA256 = "8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e";
const source = readFileSync(new URL(`../public/ffmpeg/ffmpeg-${VERSION}.tar.xz`, import.meta.url));

if (createHash("sha256").update(source).digest("hex") !== SHA256) {
  throw new Error(`public/ffmpeg/ffmpeg-${VERSION}.tar.xz is not the official FFmpeg ${VERSION} source`);
}
