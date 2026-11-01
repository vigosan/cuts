import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Page } from "./components/Page";
import { StatsView } from "./components/Stats";
import { content, LANGS } from "./content";
import type { Stats } from "./stats";

const stats: Stats = {
  days: [
    { date: "2026-10-25", mac: 5, windows: 4, linux: 3, estimated: true },
    { date: "2026-10-31", mac: 21, windows: 11, linux: 11, estimated: true },
    { date: "2026-11-01", mac: 22, windows: 12, linux: 11 },
  ],
  macUpdates: [
    { version: "v1.6.0", count: 1 },
    { version: "v1.5.0", count: 3 },
  ],
};

const text = (html: string, testid: string) => {
  const match = html.match(new RegExp(`data-testid="${testid}"[^>]*>([^<]*)<`));
  expect(match, `${testid} not found`).not.toBeNull();
  return match?.[1];
};

const view = (s: Stats, lang: "en" | "es" = "es") => renderToStaticMarkup(<StatsView c={content[lang]} stats={s} />);

describe("stats page", () => {
  it("heads with the three systems added up on the latest day", () => {
    expect(text(view(stats), "stats-total")).toBe("45");
  });

  it("groups thousands in every figure, since Spanish leaves four-digit numbers ungrouped and they read as a year", () => {
    const big = { ...stats, days: [{ date: "2026-11-01", mac: 1200, windows: 0, linux: 0 }] };
    expect(text(view(big), "stats-mac")).toBe("1.200");
  });

  it("says from which day the history stops being a reconstruction, so nobody reads the estimate as measured", () => {
    expect(text(view(stats), "stats-measured-since")).toContain("1 de noviembre");
    expect(text(view(stats, "en"), "stats-measured-since")).toContain("November 1");
  });

  it("lists the Mac updates per version, newest first", () => {
    const html = view(stats);
    expect(html.indexOf("v1.6.0")).toBeLessThan(html.indexOf("v1.5.0"));
  });

  it("links the stats page from the footer of every page in both languages", () => {
    for (const lang of LANGS) {
      const html = renderToStaticMarkup(
        <Page c={content[lang]} current="home">
          {null}
        </Page>,
      );
      expect(html, lang).toContain(`href="${content[lang].routes.stats}"`);
    }
  });
});
