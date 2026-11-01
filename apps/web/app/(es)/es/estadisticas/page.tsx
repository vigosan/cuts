import { metadataFor } from "@/components/metadata";
import { Stats } from "@/components/Stats";
import { content } from "@/content";

export const metadata = metadataFor(content.es, "stats", content.es.stats.title);

export default function Page() {
  return <Stats c={content.es} />;
}
