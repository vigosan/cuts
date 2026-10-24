import { Home } from "@/components/Home";
import { metadataFor } from "@/components/metadata";
import { content } from "@/content";

export const metadata = metadataFor(content.es, "home");

export default function Page() {
  return <Home c={content.es} />;
}
