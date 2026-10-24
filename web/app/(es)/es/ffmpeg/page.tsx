import { Ffmpeg } from "@/components/Legal";
import { metadataFor } from "@/components/metadata";
import { content } from "@/content";

export const metadata = metadataFor(content.es, "ffmpeg", content.es.ffmpeg.title);

export default function Page() {
  return <Ffmpeg c={content.es} />;
}
