import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BREW, content, DARK_SCREENSHOTS, DOWNLOADS, DROPS_VIDEO, FFMPEG_FILES, LANGS, REPO, SCREENSHOTS, VERSION } from "./content";

const keys = (value: unknown): string[] =>
  value && typeof value === "object"
    ? Object.entries(value).flatMap(([k, v]) => [k, ...keys(v).map((sub) => `${k}.${sub}`)])
    : [];

describe("site content", () => {
  it("has the same sections in English and Spanish, so no page is left half translated", () => {
    expect(keys(content.es)).toEqual(keys(content.en));
  });

  it("groups the features under a few titled tasks, so visitors can scan the list instead of reading every line", () => {
    for (const lang of LANGS) {
      const groups = content[lang].home.features;
      expect(groups.length, lang).toBeGreaterThanOrEqual(3);
      expect(groups.length, lang).toBeLessThanOrEqual(5);
      for (const group of groups) {
        expect(group.title, lang).not.toBe("");
        expect(group.items.length, `${lang} ${group.title}`).toBeGreaterThan(0);
      }
    }
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

  it("has every screenshot in its dark version, in both languages, so dark mode never shows a broken or glaring light image", () => {
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

  it("opens with the drops video instead of a still screenshot of the same screen, so the app is not shown twice in a row", () => {
    expect(SCREENSHOTS).toEqual(["timeline", "framing", "dark"]);
    expect(Object.keys(DARK_SCREENSHOTS)).toEqual(SCREENSHOTS);
  });

  it("has the drop suggestion video and its poster in both languages and themes, so the section is never empty or out of theme", () => {
    for (const lang of LANGS) {
      for (const file of Object.values(DROPS_VIDEO)) expect(existsSync(`public/screenshots/${lang}-${file}`), `${lang}-${file}`).toBe(true);
    }
  });

  it("publishes the source, build details and licenses of every bundled FFmpeg, as the LGPL and BSD licenses require", () => {
    for (const href of Object.values(FFMPEG_FILES)) expect(existsSync(`public${href}`), href).toBe(true);
    expect(Object.keys(content.en.ffmpeg.links)).toEqual(Object.keys(FFMPEG_FILES));
  });

  it("downloads the installers the release workflow publishes, so the button never leads to a 404", () => {
    const workflow = readFileSync("../../.github/workflows/release.yml", "utf8");
    for (const url of Object.values(DOWNLOADS)) {
      expect(url).toMatch(/^https:\/\/github\.com\/vigosan\/cuts-releases\/releases\/latest\/download\//);
      expect(workflow).toContain(url.split("/").pop());
    }
  });

  it("links to the public repository this site is built from, not the releases one, so visitors can read the source", () => {
    expect(REPO).toBe("https://github.com/vigosan/cuts");
  });

  it("installs with Homebrew from the tap the release workflow keeps current, so brew never installs an old version", () => {
    const workflow = readFileSync("../../.github/workflows/release.yml", "utf8");
    expect(BREW).toBe("brew install --cask vigosan/cuts/cuts");
    expect(workflow).toContain("repository: vigosan/homebrew-cuts");
  });

  it("keeps the intro under the headline to one short sentence, so the download button stays in the first screen", () => {
    for (const lang of LANGS) expect(content[lang].home.intro.split(/\s+/).length, lang).toBeLessThanOrEqual(20);
  });

  it("titles the site without long dashes, which read as machine-written in a browser tab or a shared link", () => {
    for (const lang of LANGS) expect(content[lang].meta.title, lang).not.toMatch(/[—–]/);
  });

  it("tells in the privacy policy that the app goes online to check for updates, instead of claiming it never does", () => {
    for (const lang of LANGS) {
      const text = content[lang].privacy.sections.flatMap((section) => section.body).join(" ");
      expect(text).toContain("GitHub");
      expect(text).not.toMatch(/does not connect to the internet|no se conecta a internet/);
    }
  });
});
