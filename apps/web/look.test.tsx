import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Page } from "./components/Page";
import { Root } from "./components/Root";
import { content } from "./content";

vi.mock("geist/font/mono", () => ({ GeistMono: { variable: "geist-mono" } }));
vi.mock("geist/font/sans", () => ({ GeistSans: { variable: "geist-sans" } }));

const css = readFileSync("app/globals.css", "utf8");
const TOKENS = ["canvas", "ink", "body", "muted", "faint", "line", "line-strong", "wash", "press", "ring"];
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
});
