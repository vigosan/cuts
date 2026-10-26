import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { content } from "./content";
import { config, proxy } from "./proxy";

function visit(path: string, headers: Record<string, string> = {}) {
  return proxy(new NextRequest(`https://cuts.vicent.io${path}`, { headers }));
}

describe("proxy", () => {
  it("sends Spanish speakers landing on an English page to its Spanish version, so they never have to switch", () => {
    expect(visit("/", { "accept-language": "es-ES,es;q=0.9" })?.headers.get("location")).toBe("https://cuts.vicent.io/es");
    expect(visit("/privacy", { "accept-language": "es-ES" })?.headers.get("location")).toBe("https://cuts.vicent.io/es/privacidad");
  });

  it("leaves English speakers on the page they asked for", () => {
    expect(visit("/", { "accept-language": "en-US" })).toBeUndefined();
  });

  it("does not bounce a Spanish browser back to Spanish after the visitor switched to English", () => {
    expect(visit("/", { "accept-language": "es-ES", cookie: "lang=en" })).toBeUndefined();
  });

  it("runs on every English page and nothing else, so Spanish pages and assets are served untouched", () => {
    expect(config.matcher).toEqual(Object.values(content.en.routes));
  });
});
