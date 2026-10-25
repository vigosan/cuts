import { Support } from "@/components/Legal";
import { metadataFor } from "@/components/metadata";
import { content } from "@/content";

export const metadata = metadataFor(content.en, "support", content.en.support.title);

export default function Page() {
  return <Support c={content.en} />;
}
