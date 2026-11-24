import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Home } from "./components/Home";
import { content, DROPS_VIDEO } from "./content";
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

  it("shows the audio session right after the drops, with its video, because it is a second way into the app and not one more spec", async () => {
    vi.stubGlobal("fetch", async () => new Response("[]"));
    const html = renderToStaticMarkup(await Home({ c: content.es }));
    const audio = html.indexOf(content.es.home.audioTitle);
    expect(audio).toBeGreaterThan(html.indexOf(content.es.home.dropsTitle));
    expect(audio).toBeLessThan(html.indexOf(content.es.home.timelineTitle));
    expect(html).toContain("/screenshots/es-audio.mp4");
  });

  it("shows the stats once, under the hero download and above the first video, so the count is seen before scrolling and not repeated", async () => {
    const stats: Stats = { days: [{ date: "2026-11-04", mac: 21, windows: 12 }], versions: [], usage: [] };
    vi.stubGlobal("fetch", async () => Response.json(stats));
    const html = renderToStaticMarkup(await Home({ c: content.es }));
    expect(html.match(/data-testid="hero-stats-total"[^>]*>33</)).not.toBeNull();
    expect(html.indexOf('data-testid="hero-stats"')).toBeGreaterThan(html.indexOf('data-testid="download"'));
    expect(html.indexOf('data-testid="hero-stats"')).toBeLessThan(html.indexOf(DROPS_VIDEO.video));
    expect(html).not.toContain(`33 ${content.es.home.downloads.other}`);
  });

  it("leaves the stats out when they cannot be loaded, rather than showing an empty pill", async () => {
    vi.stubGlobal("fetch", async () => new Response("[]"));
    const html = renderToStaticMarkup(await Home({ c: content.es }));
    expect(html).not.toContain('data-testid="hero-stats"');
  });
});
