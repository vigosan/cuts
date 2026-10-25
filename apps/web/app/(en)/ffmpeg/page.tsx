import { Ffmpeg } from "@/components/Legal";
import { metadataFor } from "@/components/metadata";
import { content } from "@/content";

export const metadata = metadataFor(content.en, "ffmpeg", content.en.ffmpeg.title);

export default function Page() {
  return <Ffmpeg c={content.en} />;
}
