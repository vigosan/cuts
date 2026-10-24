import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const VERSION = "9.0.2";
const SHA256 = "8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e";
const target = new URL(`../public/ffmpeg/ffmpeg-${VERSION}.tar.xz`, import.meta.url);

const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");

if (!existsSync(target) || sha(readFileSync(target)) !== SHA256) {
  const response = await fetch(`https://ffmpeg.org/releases/ffmpeg-${VERSION}.tar.xz`);
  if (!response.ok) throw new Error(`FFmpeg source download failed: ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  if (sha(buffer) !== SHA256) throw new Error("FFmpeg source checksum mismatch");
  writeFileSync(target, buffer);
}
