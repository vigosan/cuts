import type { Metadata } from "next";
import { content, SITE_URL, type Content } from "@/content";

export function metadataFor(c: Content, route: keyof Content["routes"], title?: string): Metadata {
  return {
    metadataBase: new URL(SITE_URL),
    title: title ? `${title} · Cuts` : c.meta.title,
    description: c.meta.description,
    icons: { icon: "/icon.png", apple: "/icon.png" },
    alternates: {
      canonical: c.routes[route],
      languages: { en: content.en.routes[route], es: content.es.routes[route] },
    },
    openGraph: {
      title: c.meta.title,
      description: c.meta.description,
      url: c.routes[route],
      siteName: "Cuts",
      type: "website",
      locale: c.lang === "en" ? "en_US" : "es_ES",
      images: [{ url: c.meta.image, width: 1200, height: 630, alt: c.meta.title }],
    },
    twitter: { card: "summary_large_image" },
  };
}
