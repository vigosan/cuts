import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { content, type Lang } from "@/content";
import { THEME_SCRIPT } from "@/theme";
import { Analytics } from "./Analytics";

import "@/app/globals.css";

export function Root({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className={`${GeistSans.variable} ${GeistMono.variable} bg-white dark:bg-neutral-950`}>
        {children}
        <Analytics labels={content[lang].consent} />
      </body>
    </html>
  );
}
