import { GeistMono } from "geist/font/mono";
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
      <body className={`${GeistMono.variable} bg-canvas font-mono`}>
        {children}
        <Analytics labels={content[lang].consent} />
      </body>
    </html>
  );
}
