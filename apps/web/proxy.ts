import { NextResponse, type NextRequest } from "next/server";
import { content } from "./content";
import { LANG_COOKIE, pickLang } from "./lang";

export function proxy(request: NextRequest) {
  const lang = pickLang(request.cookies.get(LANG_COOKIE)?.value, request.headers.get("accept-language"));
  if (lang === "en") return;
  const route = (Object.keys(content.en.routes) as (keyof typeof content.en.routes)[]).find(
    (key) => content.en.routes[key] === request.nextUrl.pathname,
  );
  if (!route) return;
  return NextResponse.redirect(new URL(content[lang].routes[route], request.url));
}

export const config = {
  matcher: ["/", "/privacy", "/support", "/ffmpeg"],
};
