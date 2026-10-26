import { LANGS, type Lang } from "./content";

export const LANG_COOKIE = "lang";

function isLang(value: string | undefined): value is Lang {
  return LANGS.includes(value as Lang);
}

export function pickLang(cookie: string | undefined, acceptLanguage: string | null): Lang {
  if (isLang(cookie)) return cookie;
  const ranked = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { lang: tag.split("-")[0].toLowerCase(), q: q ? Number(q.trim().slice(2)) : 1 };
    })
    .sort((a, b) => b.q - a.q);
  return ranked.map((r) => r.lang).find(isLang) ?? "en";
}

export function langCookie(lang: Lang): string {
  return `${LANG_COOKIE}=${lang}; path=/; max-age=31536000; samesite=lax`;
}
