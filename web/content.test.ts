import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { content, LANGS, SCREENSHOTS } from "./content";

const keys = (value: unknown): string[] =>
  value && typeof value === "object"
    ? Object.entries(value).flatMap(([k, v]) => [k, ...keys(v).map((sub) => `${k}.${sub}`)])
    : [];

describe("site content", () => {
  it("has the same sections in English and Spanish, so no page is left half translated", () => {
    expect(keys(content.es)).toEqual(keys(content.en));
  });

  it("links every route to a page that exists, so the App Store privacy and support URLs never 404", () => {
    for (const lang of LANGS) {
      for (const path of Object.values(content[lang].routes)) {
        const page = path === "/" ? "app/(en)/page.tsx" : `app/${path.startsWith("/es") ? "(es)" : "(en)"}${path}/page.tsx`;
        expect(existsSync(page), page).toBe(true);
      }
    }
  });

  it("keeps the public URLs that the app menu and App Store Connect point to", () => {
    expect(content.en.routes.privacy).toBe("/privacy");
    expect(content.en.routes.support).toBe("/support");
  });

  it("has every screenshot the home page shows, in both languages", () => {
    for (const lang of LANGS) {
      for (const name of SCREENSHOTS) expect(existsSync(`public/screenshots/${lang}-${name}.png`), `${lang}-${name}`).toBe(true);
    }
  });
});
