import { GeistSans } from "geist/font/sans";
import type { Lang } from "@/content";

import "@/app/globals.css";

export function Root({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <html lang={lang}>
      <body className={`${GeistSans.variable} bg-white dark:bg-neutral-950`}>{children}</body>
    </html>
  );
}
