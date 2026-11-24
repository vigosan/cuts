import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Page } from "./components/Page";
import { StatsView } from "./components/Stats";
import { content, LANGS } from "./content";
import type { Stats } from "./stats";

const stats: Stats = {
  days: [
    { date: "2026-10-25", mac: 5, windows: 4, estimated: true },
    { date: "2026-10-31", mac: 21, windows: 11, estimated: true },
    { date: "2026-11-01", mac: 22, windows: 12 },
  ],
  versions: [
    { version: "v1.6.0", mac: 1, windows: 2, installs: 4 },
    { version: "v1.5.0", mac: 3, windows: 0, installs: 7 },
  ],
  usage: [{ week: "2026-10-26", mac: 3, windows: 2 }],
};

const text = (html: string, testid: string) => {
  const match = html.match(new RegExp(`data-testid="${testid}"[^>]*>([^<]*)<`));
  expect(match, `${testid} not found`).not.toBeNull();
  return match?.[1];
};

const view = (s: Stats, lang: "en" | "es" = "es") => renderToStaticMarkup(<StatsView c={content[lang]} stats={s} />);

describe("stats page", () => {
  it("heads with the new installs of Mac and Windows on the latest day, the one figure that means new people", () => {
    expect(text(view(stats), "stats-total")).toBe("34");
  });

  it("shows no Linux figure, which was mostly automatic fetches", () => {
    expect(view(stats)).not.toContain("stats-linux");
  });

  it("groups thousands in every figure, since Spanish leaves four-digit numbers ungrouped and they read as a year", () => {
    const big = { ...stats, days: [{ date: "2026-11-01", mac: 1200, windows: 0 }] };
    expect(text(view(big), "stats-mac")).toBe("1.200");
  });

  it("says from which day the history stops being a reconstruction, so nobody reads the estimate as measured", () => {
    expect(text(view(stats), "stats-measured-since")).toContain("1 de noviembre");
    expect(text(view(stats, "en"), "stats-measured-since")).toContain("November 1");
  });

  it("lists each version with the computers that updated and the new installs, newest first", () => {
    const html = view(stats);
    expect(html.indexOf("v1.6.0")).toBeLessThan(html.indexOf("v1.5.0"));
    expect(text(html, "stats-version-mac-v1.5.0")).toBe("3");
    expect(text(html, "stats-version-windows-v1.6.0")).toBe("2");
    expect(text(html, "stats-version-installs-v1.6.0")).toBe("+4");
  });

  it("leaves out how many hours each version was the newest, a figure that told a visitor nothing", () => {
    for (const lang of LANGS) {
      const html = view(stats, lang);
      expect(html, lang).not.toContain("stats-version-hours");
      expect(html.toLowerCase(), lang).not.toMatch(lang === "es" ? /horas/ : /hours/);
    }
  });

  it("draws the computers that use Cuts each week apart from the new installs, so the two are never read as one", () => {
    const html = view(stats);
    expect(html).toContain('data-testid="stats-usage"');
    expect(html).toContain('data-testid="stats-weekly"');
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
