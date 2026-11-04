"use client";

import type { Lang } from "@/content";
import { langCookie } from "@/lang";

export function LangSwitch({ lang, href, className, children }: { lang: Lang; href: string; className: string; children: React.ReactNode }) {
  return (
    <a href={href} hrefLang={lang} className={className} onClick={() => (document.cookie = langCookie(lang))}>
      {children}
    </a>
  );
}
