import { metadataFor } from "@/components/metadata";
import { Stats } from "@/components/Stats";
import { content } from "@/content";

export const metadata = metadataFor(content.en, "stats", content.en.stats.title);

export default function Page() {
  return <Stats c={content.en} />;
}
