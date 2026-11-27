import { readdirSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Download, PhoneDownload } from "./components/Download";
import { Home } from "./components/Home";
import { Ffmpeg, Privacy, Support } from "./components/Legal";
import { Page } from "./components/Page";
import { Root } from "./components/Root";
import { content, LANGS } from "./content";
import type { Stats } from "./stats";

afterEach(() => vi.unstubAllGlobals());

vi.mock("geist/font/mono", () => ({ GeistMono: { variable: "geist-mono" } }));
vi.mock("geist/font/sans", () => ({ GeistSans: { variable: "geist-sans" } }));

const css = readFileSync("app/globals.css", "utf8");
const TOKENS = ["canvas", "ink", "body", "muted", "faint", "line", "line-strong", "wash", "press", "ring"];
const COMPONENTS = readdirSync("components").filter((name) => name.endsWith(".tsx"));

const pressables = (html: string) => html.match(/<(a|button)\b[^>]*>/g) ?? [];

const shell = (lang: (typeof LANGS)[number]) => [
  renderToStaticMarkup(<Page c={content[lang]} current="home">{null}</Page>),
  renderToStaticMarkup(<Privacy c={content[lang]} />),
  renderToStaticMarkup(<Support c={content[lang]} />),
  renderToStaticMarkup(<Ffmpeg c={content[lang]} />),
];

const darkBlock = css.slice(css.indexOf('[data-theme="dark"] {'));

describe("look shared with vicent.io", () => {
  it("names every gray by its role, so the whole page is restyled from one place", () => {
    for (const token of TOKENS) expect(css, token).toMatch(new RegExp(`--color-${token}:`));
  });

  it("remaps every role in the dark theme, so no light-only gray is left glaring on a dark page", () => {
    for (const token of TOKENS) expect(darkBlock, token).toMatch(new RegExp(`--color-${token}:`));
  });

  it("sets the page in Geist Mono alone, the type of vicent.io, with no sans-serif loaded", () => {
    const html = renderToStaticMarkup(<Root lang="en">{null}</Root>);
    expect(html).toMatch(/<body class="[^"]*\bfont-mono\b/);
    expect(html).toContain("geist-mono");
    expect(html).not.toContain("geist-sans");
    expect(css).not.toContain("--font-sans");
  });

  it("never switches a block back to a sans-serif, which would fall back to the system font", () => {
    const html = renderToStaticMarkup(<Page c={content.en} current="home">{null}</Page>);
    expect(html).not.toContain("font-sans");
    expect(readFileSync("components/Analytics.tsx", "utf8")).not.toContain("font-sans");
  });

  it("keeps only the scroll motion that explains something: the light page wiping over the dark one, not decoration", () => {
    expect([...css.matchAll(/@keyframes ([\w-]+)/g)].map((m) => m[1])).toEqual(["wipe"]);
  });

  it("takes every gray from a role token, so switching to dark is one remap and no hard-coded gray is missed", () => {
    for (const name of COMPONENTS) {
      const source = readFileSync(`components/${name}`, "utf8");
      expect(source, name).not.toMatch(/-(gray|neutral)-\d/);
      expect(source, name).not.toMatch(/\bshadow-/);
    }
  });

  it("gives every link and button the shared link states, so hover, press and focus feel the same everywhere as on vicent.io", () => {
    for (const lang of LANGS) {
      for (const html of shell(lang)) {
        for (const tag of pressables(html)) expect(tag, lang).toMatch(/class="[^"]*\blink\b/);
      }
    }
  });

  it("gives the home page's downloads, stats link and App Store badge the same link states as the rest of the site", async () => {
    const stats: Stats = { days: [{ date: "2026-11-04", mac: 21, windows: 12 }], versions: [], usage: [] };
    vi.stubGlobal("fetch", async () => Response.json(stats));
    for (const lang of LANGS) {
      const pages = [
        renderToStaticMarkup(await Home({ c: content[lang] })),
        renderToStaticMarkup(<Download home={content[lang].home} brew />),
        renderToStaticMarkup(<PhoneDownload home={content[lang].home} />),
      ];
      expect(pages[0], lang).toContain('data-testid="hero-stats-link"');
      for (const html of pages) {
        for (const tag of pressables(html)) expect(tag, lang).toMatch(/class="[^"]*\blink\b/);
      }
    }
  });

  it("names the product and says what it does at the top of every page, as vicent.io does with its owner", () => {
    for (const lang of LANGS) {
      for (const html of shell(lang)) {
        const header = html.slice(html.indexOf("<header"), html.indexOf("</header>"));
        expect(header, lang).toContain(">Cuts<");
        expect(header, lang).toContain(content[lang].home.tagline);
      }
    }
  });

  it("keeps the tagline as the home page's only main heading, so search engines read the same headline as before", () => {
    const html = renderToStaticMarkup(<Page c={content.en} current="home">{null}</Page>);
    expect(html.match(/<h1\b[^>]*>([^<]*)<\/h1>/g)).toEqual([expect.stringContaining(content.en.home.tagline)]);
    expect(renderToStaticMarkup(<Privacy c={content.en} />).match(/<h1\b/g)).toHaveLength(1);
  });
});
