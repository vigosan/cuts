import { GeistSans } from "geist/font/sans";
import type { Lang } from "@/content";
import { THEME_SCRIPT } from "@/theme";

import "@/app/globals.css";

export function Root({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${GeistSans.variable} bg-white dark:bg-neutral-950`}>{children}</body>
    </html>
  );
}
