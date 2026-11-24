import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroStats } from "./components/HeroStats";
import { content } from "./content";
import type { Stats } from "./stats";

const stats: Stats = {
  days: [
    { date: "2026-11-01", mac: 300, windows: 800 },
    { date: "2026-11-04", mac: 335, windows: 845 },
    { date: "2026-11-11", mac: 371, windows: 928 },
  ],
  versions: [],
  usage: [],
};

const render = (s: Stats, lang: "en" | "es" = "es") => renderToStaticMarkup(<HeroStats c={content[lang]} stats={s} />);

const text = (html: string, testid: string) => html.match(new RegExp(`data-testid="${testid}"[^>]*>([^<]*)<`))?.[1];

describe("hero stats", () => {
  it("shows the same total the stats page heads with, thousands grouped so it never reads as a year", () => {
    expect(text(render(stats), "hero-stats-total")).toBe("1.299");
    expect(text(render(stats, "en"), "hero-stats-total")).toBe("1,299");
  });

  it("counts the Mac and Windows installs of the last seven days, the page's measure of new people", () => {
    expect(text(render(stats), "hero-stats-week")).toBe("+119");
  });

  it("leaves the weekly figure out when the week brought no installs, since it would read as nobody downloads this next to the button", () => {
    const flat = { ...stats, days: stats.days.map((d) => ({ ...d, mac: 371, windows: 928 })) };
    expect(render(flat)).not.toContain("hero-stats-week");
  });

  it("links the stats page in each language, since the footer alone kept it out of sight", () => {
    expect(render(stats)).toMatch(new RegExp(`data-testid="hero-stats-link" href="${content.es.routes.stats}"`));
    expect(render(stats, "en")).toMatch(new RegExp(`data-testid="hero-stats-link" href="${content.en.routes.stats}"`));
  });
});
