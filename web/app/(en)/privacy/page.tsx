import { Privacy } from "@/components/Legal";
import { metadataFor } from "@/components/metadata";
import { content } from "@/content";

export const metadata = metadataFor(content.en, "privacy", content.en.privacy.title);

export default function Page() {
  return <Privacy c={content.en} />;
}
