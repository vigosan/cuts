import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type Day,
  fetchStats,
  installsInLast,
  lastTwelveMonths,
  macUpdates,
  recordSnapshot,
  releaseTotals,
  type StatsRelease,
  weeklyMacInstalls,
} from "./stats";

const asset = (name: string, download_count: number) => ({ name, download_count });

function release(tag: string, published_at: string, assets: { name: string; download_count: number }[], prerelease = false): StatsRelease {
  return { tag_name: tag, published_at, prerelease, assets };
}

describe("releaseTotals", () => {
  it("takes the dmg blockmap off the installer, since crawlers fetch every file once and no person or updater ever asks for that one", () => {
    const r = release("v1.6.0", "2026-10-30T00:00:00Z", [asset("Cuts-mac.dmg", 10), asset("Cuts-mac.dmg.blockmap", 2)]);
    expect(releaseTotals(r).mac).toBe(8);
  });

  it("never lets a busier blockmap push an installer below zero", () => {
    const r = release("v1.6.0", "2026-10-30T00:00:00Z", [asset("Cuts-mac.dmg", 1), asset("Cuts-mac.dmg.blockmap", 3)]);
    expect(releaseTotals(r).mac).toBe(0);
  });

  it("takes the release's bot count off the Windows and Linux installers, which have no bot-only twin because the updater reads the exe blockmap", () => {
    const r = release("v1.6.0", "2026-10-30T00:00:00Z", [
      asset("Cuts-mac.dmg.blockmap", 2),
      asset("Cuts-windows.exe", 12),
      asset("Cuts-windows.exe.blockmap", 9),
      asset("Cuts-linux.AppImage", 5),
    ]);
    expect(releaseTotals(r)).toMatchObject({ windows: 10, linux: 3 });
  });

  it("counts the early releases whole, since they shipped before there was a blockmap to measure bots with", () => {
    const r = release("v1.0.0", "2026-10-25T00:00:00Z", [asset("Cuts-mac.dmg", 4), asset("Cuts-windows.exe", 4)]);
    expect(releaseTotals(r)).toMatchObject({ mac: 4, windows: 4 });
  });

  it("leaves out the update feeds and archives the app polls on its own", () => {
    const r = release("v1.6.0", "2026-10-30T00:00:00Z", [asset("latest-mac.yml", 500), asset("latest.yml", 300), asset("Cuts-mac.zip", 40)]);
    expect(releaseTotals(r)).toMatchObject({ mac: 0, windows: 0, linux: 0 });
  });
});

describe("macUpdates", () => {
  it("counts the zip of the newest stable releases, newest first, without bots, since only the Mac updater fetches it and that is the closest thing to active use without telemetry", () => {
    const releases = [
      release("v1.6.0", "2026-10-30T00:00:00Z", [asset("Cuts-mac.zip", 9), asset("Cuts-mac.dmg.blockmap", 1)]),
      release("v1.7.0-beta.0", "2026-10-31T00:00:00Z", [asset("Cuts-mac.zip", 2)], true),
      release("v1.5.0", "2026-10-28T00:00:00Z", [asset("Cuts-mac.zip", 5)]),
    ];
    expect(macUpdates(releases, 8)).toEqual([
      { version: "v1.6.0", count: 8 },
      { version: "v1.5.0", count: 5 },
    ]);
  });

  it("skips the releases without a zip, which no Mac could update to and would read as nobody using them", () => {
    const releases = [
      release("v1.2.0", "2026-10-26T00:00:00Z", [asset("Cuts-mac.zip", 3)]),
      release("v1.1.0", "2026-10-25T21:00:00Z", [asset("Cuts-mac.dmg", 3)]),
    ];
    expect(macUpdates(releases, 8).map((u) => u.version)).toEqual(["v1.2.0"]);
  });

  it("keeps only as many versions as asked for", () => {
    const releases = ["1", "2", "3"].map((n) => release(`v1.${n}.0`, `2026-10-0${n}T00:00:00Z`, [asset("Cuts-mac.zip", 1)]));
    expect(macUpdates(releases, 2).map((u) => u.version)).toEqual(["v1.3.0", "v1.2.0"]);
  });
});

describe("recordSnapshot", () => {
  const releases = [
    release("v1.0.0", "2026-10-01T00:00:00Z", [asset("Cuts-mac.dmg", 4)]),
    release("v1.1.0", "2026-10-03T00:00:00Z", [asset("Cuts-mac.dmg", 6), asset("Cuts-windows.exe", 2)]),
  ];

  it("rebuilds the days before the first snapshot from each release window, since GitHub keeps only today's totals and the web always serves the newest installer", () => {
    const { days } = recordSnapshot(null, releases, "2026-10-04");
    expect(days).toEqual([
      { date: "2026-10-01", mac: 2, windows: 0, linux: 0, estimated: true },
      { date: "2026-10-02", mac: 4, windows: 0, linux: 0, estimated: true },
      { date: "2026-10-03", mac: 7, windows: 1, linux: 0, estimated: true },
      { date: "2026-10-04", mac: 10, windows: 2, linux: 0 },
    ]);
  });

  it("appends to an existing history instead of rebuilding it, so measured days are never rewritten by an estimate", () => {
    const previous = { days: [{ date: "2026-10-03", mac: 9, windows: 1, linux: 0 }], macUpdates: [] };
    expect(recordSnapshot(previous, releases, "2026-10-04").days).toEqual([
      { date: "2026-10-03", mac: 9, windows: 1, linux: 0 },
      { date: "2026-10-04", mac: 10, windows: 2, linux: 0 },
    ]);
  });

  it("replaces the entry of a day that runs more than once, since the workflow runs every hour", () => {
    const previous = {
      days: [
        { date: "2026-10-03", mac: 9, windows: 1, linux: 0 },
        { date: "2026-10-04", mac: 9, windows: 1, linux: 0 },
      ],
      macUpdates: [],
    };
    const { days } = recordSnapshot(previous, releases, "2026-10-04");
    expect(days).toHaveLength(2);
    expect(days.at(-1)?.mac).toBe(10);
  });

  it("skips drafts, which have no publication date and nobody can download", () => {
    const withDraft = [...releases, { tag_name: "v9.0.0", published_at: null, assets: [asset("Cuts-mac.dmg", 3)] }];
    expect(recordSnapshot(null, withDraft, "2026-10-04").days.at(-1)?.mac).toBe(10);
  });
});

const day = (date: string, mac: number): Day => ({ date, mac, windows: 0, linux: 0 });

describe("installsInLast", () => {
  it("counts the Mac installs of the last days asked for", () => {
    const days = [day("2026-10-20", 100), day("2026-10-23", 110), day("2026-10-27", 130)];
    expect(installsInLast(days, 7)).toBe(30);
    expect(installsInLast(days, 4)).toBe(20);
  });

  it("counts from the first day when the history is shorter than asked", () => {
    expect(installsInLast([day("2026-10-25", 100), day("2026-10-27", 104)], 7)).toBe(4);
  });
});

describe("weeklyMacInstalls", () => {
  it("turns the cumulative curve into new installs per week starting on Monday, since a cumulative curve flattens a change of pace into a gentle bend", () => {
    const days = [day("2026-10-05", 10), day("2026-10-11", 14), day("2026-10-12", 15), day("2026-10-18", 25)];
    expect(weeklyMacInstalls(days)).toEqual([
      { week: "2026-10-05", count: 14 },
      { week: "2026-10-12", count: 11 },
    ]);
  });

  it("carries a week with no snapshot as zero instead of dropping it", () => {
    const days = [day("2026-10-05", 10), day("2026-10-19", 12)];
    expect(weeklyMacInstalls(days).map((w) => w.count)).toEqual([10, 0, 2]);
  });
});

describe("lastTwelveMonths", () => {
  it("keeps the days from the same date a year before the latest one, so month labels never collide as the history grows", () => {
    const days = [day("2025-10-29", 1), day("2025-10-30", 2), day("2026-03-01", 50), day("2026-10-30", 273)];
    expect(lastTwelveMonths(days).map((d) => d.date)).toEqual(["2025-10-30", "2026-03-01", "2026-10-30"]);
  });

  it("keeps a history shorter than a year whole", () => {
    const days = [day("2026-06-02", 4), day("2026-10-30", 273)];
    expect(lastTwelveMonths(days)).toEqual(days);
  });
});

describe("fetchStats", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reads the history the workflow stores on the releases repo, so the page updates without a redeploy", async () => {
    const stats = { days: [day("2026-10-30", 3)], macUpdates: [] };
    const fetch = vi.fn(async () => Response.json(stats));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchStats()).toEqual(stats);
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("vigosan/cuts-releases/stats/stats.json"), expect.anything());
  });

  it("logs why the history could not be read, so a missing page can be traced in the build log", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await fetchStats()).toBeNull();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("404"));
  });

  it("treats an empty history as missing, since there is nothing to draw", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ days: [], macUpdates: [] })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await fetchStats()).toBeNull();
  });
});
