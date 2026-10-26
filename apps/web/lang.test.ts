import { describe, expect, it } from "vitest";
import { langCookie, pickLang } from "./lang";

describe("pickLang", () => {
  it("shows Spanish to visitors whose browser prefers Spanish, from any country", () => {
    expect(pickLang(undefined, "es-ES,es;q=0.9,en;q=0.8")).toBe("es");
    expect(pickLang(undefined, "es-MX")).toBe("es");
    expect(pickLang(undefined, "ca-ES,ca;q=0.9,es;q=0.8,en;q=0.7")).toBe("es");
  });

  it("keeps English when the browser ranks English above Spanish, whatever the header order", () => {
    expect(pickLang(undefined, "en-US,en;q=0.9,es;q=0.8")).toBe("en");
    expect(pickLang(undefined, "es;q=0.5,en-GB;q=0.9")).toBe("en");
  });

  it("falls back to English for languages the site does not speak and for crawlers without the header", () => {
    expect(pickLang(undefined, "fr-FR,fr;q=0.9")).toBe("en");
    expect(pickLang(undefined, null)).toBe("en");
  });

  it("respects the language the visitor chose with the switch over what the browser says", () => {
    expect(pickLang("en", "es-ES,es;q=0.9")).toBe("en");
    expect(pickLang("es", "en-US")).toBe("es");
  });

  it("ignores a tampered cookie instead of trusting it", () => {
    expect(pickLang("fr", "es-ES")).toBe("es");
  });
});

describe("langCookie", () => {
  it("remembers the switch on every page for a year, so the redirect never fights the visitor's choice", () => {
    expect(langCookie("en")).toBe("lang=en; path=/; max-age=31536000; samesite=lax");
  });
});
