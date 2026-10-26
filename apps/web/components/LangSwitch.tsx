"use client";

import Link from "next/link";
import type { Lang } from "@/content";
import { langCookie } from "@/lang";

export function LangSwitch({ lang, href, className, children }: { lang: Lang; href: string; className: string; children: React.ReactNode }) {
  return (
    <Link href={href} hrefLang={lang} className={className} onClick={() => (document.cookie = langCookie(lang))}>
      {children}
    </Link>
  );
}
