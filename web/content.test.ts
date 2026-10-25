import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { content, DARK_SCREENSHOTS, DOWNLOADS, FFMPEG_FILES, LANGS, SCREENSHOTS, VERSION } from "./content";

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

  it("has the screenshots shown to visitors in dark mode, in both languages, so dark mode never shows a broken image", () => {
    for (const lang of LANGS) {
      for (const name of Object.values(DARK_SCREENSHOTS)) expect(existsSync(`public/screenshots/${lang}-${name}.png`), `${lang}-${name}`).toBe(true);
    }
  });

  it("has the share card each language points to, so a link pasted in a chat shows a preview", () => {
    for (const lang of LANGS) expect(existsSync(`public${content[lang].meta.image}`), lang).toBe(true);
  });

  it("shows the app version next to the download in both languages, so visitors know which release they get", () => {
    for (const lang of LANGS) expect(content[lang].home.version).toContain(VERSION);
  });

  it("shows the drop suggestions, framing and dark mode screenshots too", () => {
    expect(SCREENSHOTS).toEqual(["overview", "drops", "timeline", "framing", "dark"]);
  });

  it("publishes the source, build details and licenses of every bundled FFmpeg, as the LGPL and BSD licenses require", () => {
    for (const href of Object.values(FFMPEG_FILES)) expect(existsSync(`public${href}`), href).toBe(true);
    expect(Object.keys(content.en.ffmpeg.links)).toEqual(Object.keys(FFMPEG_FILES));
  });

  it("downloads the installers the release workflow publishes, so the button never leads to a 404", () => {
    const workflow = readFileSync("../.github/workflows/release.yml", "utf8");
    for (const url of Object.values(DOWNLOADS)) {
      expect(url).toMatch(/^https:\/\/github\.com\/vigosan\/cuts-releases\/releases\/latest\/download\//);
      expect(workflow).toContain(url.split("/").pop());
    }
  });
});
