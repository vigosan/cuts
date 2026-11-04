import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Home } from "./components/Home";
import { content } from "./content";
import type { Stats } from "./stats";

afterEach(() => vi.unstubAllGlobals());

describe("home", () => {
  it("tells the story with the pictures and the iPhone before the long feature list, which reads as specs for those already interested", async () => {
    vi.stubGlobal("fetch", async () => new Response("[]"));
    const html = renderToStaticMarkup(await Home({ c: content.es }));
    const features = html.indexOf('data-testid="feature-group"');
    expect(html.indexOf('id="iphone"')).toBeLessThan(features);
    expect(html.indexOf(content.es.home.framingTitle)).toBeLessThan(features);
    expect(features).toBeLessThan(html.indexOf(content.es.home.privacyTitle));
  });

  it("counts downloads like the stats page, so the home never shows a bigger number than the stats it links to", async () => {
    const stats: Stats = { days: [{ date: "2026-11-04", mac: 21, windows: 12, linux: 11 }], macUpdates: [] };
    vi.stubGlobal("fetch", async () => Response.json(stats));
    const html = renderToStaticMarkup(await Home({ c: content.es }));
    expect(html).toContain("44 descargas");
  });
});
