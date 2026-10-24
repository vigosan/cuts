import type { MetadataRoute } from "next";
import { content, LANGS, SITE_URL } from "@/content";

export default function sitemap(): MetadataRoute.Sitemap {
  return LANGS.flatMap((lang) =>
    Object.values(content[lang].routes).map((path) => ({ url: `${SITE_URL}${path}`, changeFrequency: "monthly" as const })),
  );
}
