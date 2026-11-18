import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type Day,
  fetchStats,
  installsInLast,
  recordSnapshot,
  releaseTotals,
  type StatsRelease,
  usage,
  versions,
  weeklyInstalls,
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

  it("takes the exe blockmap off the Windows installer, since the installer is also the update and every update fetches that file while a new install never does", () => {
    const r = release("v1.6.0", "2026-10-30T00:00:00Z", [asset("Cuts-mac.dmg.blockmap", 2), asset("Cuts-windows.exe", 12), asset("Cuts-windows.exe.blockmap", 9)]);
    expect(releaseTotals(r).windows).toBe(3);
  });

  it("leaves Linux out, where automatic fetches outnumber people and nothing tells them apart", () => {
    const r = release("v1.6.0", "2026-10-30T00:00:00Z", [asset("Cuts-linux.AppImage", 5)]);
    expect(releaseTotals(r)).toEqual({ mac: 0, windows: 0 });
  });

  it("counts the early releases whole, since they shipped before there was a blockmap to measure bots with", () => {
    const r = release("v1.0.0", "2026-10-25T00:00:00Z", [asset("Cuts-mac.dmg", 4), asset("Cuts-windows.exe", 4)]);
    expect(releaseTotals(r)).toMatchObject({ mac: 4, windows: 4 });
  });

  it("leaves out the update feeds and archives the app polls on its own", () => {
    const r = release("v1.6.0", "2026-10-30T00:00:00Z", [asset("latest-mac.yml", 500), asset("latest.yml", 300), asset("Cuts-mac.zip", 40)]);
    expect(releaseTotals(r)).toEqual({ mac: 0, windows: 0 });
  });
});

describe("versions", () => {
  const releases = [
    release("v1.6.0", "2026-10-30T00:00:00Z", [
      asset("Cuts-mac.dmg", 5),
      asset("Cuts-mac.dmg.blockmap", 1),
      asset("Cuts-mac.zip", 9),
      asset("Cuts-windows.exe", 10),
      asset("Cuts-windows.exe.blockmap", 7),
    ]),
    release("v1.7.0-beta.0", "2026-10-30T12:00:00Z", [asset("Cuts-mac.zip", 2)], true),
    release("v1.5.0", "2026-10-28T00:00:00Z", [asset("Cuts-mac.zip", 5), asset("Cuts-mac.dmg", 2)]),
  ];

  it("gives each stable version the computers that updated to it and the new installs it brought, newest first, so updates and new people are never added together", () => {
    expect(versions(releases, 8, "2026-10-30T05:00:00Z")).toEqual([
      { version: "v1.6.0", hours: 5, mac: 8, windows: 6, installs: 7 },
      { version: "v1.5.0", hours: 48, mac: 5, windows: 0, installs: 2 },
    ]);
  });

  it("says how long each version was the newest one, since a version replaced after two hours reaches fewer computers than one that lasts a week", () => {
    expect(versions(releases, 8, "2026-10-31T00:30:00Z").map((v) => v.hours)).toEqual([25, 48]);
  });

  it("keeps only as many versions as asked for", () => {
    expect(versions(releases, 1, "2026-10-30T05:00:00Z").map((v) => v.version)).toEqual(["v1.6.0"]);
  });
});

describe("usage", () => {
  it("takes for each week the version most computers updated to, since adding versions up would count the same computer once per release", () => {
    const releases = [
      release("v1.5.0", "2026-10-26T00:00:00Z", [asset("Cuts-mac.zip", 5), asset("Cuts-windows.exe.blockmap", 2)]),
      release("v1.6.0", "2026-10-30T00:00:00Z", [asset("Cuts-mac.zip", 3), asset("Cuts-windows.exe.blockmap", 4)]),
      release("v1.7.0", "2026-11-02T00:00:00Z", [asset("Cuts-mac.zip", 7)]),
    ];
    expect(usage(releases)).toEqual([
      { week: "2026-10-26", mac: 5, windows: 4 },
      { week: "2026-11-02", mac: 7, windows: 0 },
    ]);
  });
});

describe("recordSnapshot", () => {
  const releases = [
    release("v1.0.0", "2026-10-01T00:00:00Z", [asset("Cuts-mac.dmg", 4)]),
    release("v1.1.0", "2026-10-03T00:00:00Z", [asset("Cuts-mac.dmg", 6), asset("Cuts-windows.exe", 2)]),
  ];

  it("rebuilds the days before the first snapshot from each release window, since GitHub keeps only today's totals and the web always serves the newest installer", () => {
    const { days } = recordSnapshot(null, releases, "2026-10-04T10:00:00Z");
    expect(days).toEqual([
      { date: "2026-10-01", mac: 2, windows: 0, estimated: true },
      { date: "2026-10-02", mac: 4, windows: 0, estimated: true },
      { date: "2026-10-03", mac: 7, windows: 1, estimated: true },
      { date: "2026-10-04", mac: 10, windows: 2 },
    ]);
  });

  it("appends to an existing history instead of rebuilding it, so measured days are never rewritten by an estimate", () => {
    const previous = { days: [{ date: "2026-10-03", mac: 9, windows: 1 }], versions: [], usage: [] };
    expect(recordSnapshot(previous, releases, "2026-10-04T10:00:00Z").days).toEqual([
      { date: "2026-10-03", mac: 9, windows: 1 },
      { date: "2026-10-04", mac: 10, windows: 2 },
    ]);
  });

  it("rebuilds a history stored while Windows still counted updates, which carries a Linux figure and cannot be continued with installs alone", () => {
    const previous = { days: [{ date: "2026-10-03", mac: 9, windows: 40, linux: 3 }], macUpdates: [] } as never;
    const { days } = recordSnapshot(previous, releases, "2026-10-04T10:00:00Z");
    expect(days.at(-2)).toEqual({ date: "2026-10-03", mac: 7, windows: 1, estimated: true });
  });

  it("replaces the entry of a day that runs more than once, since the workflow runs every hour", () => {
    const previous = {
      days: [
        { date: "2026-10-03", mac: 9, windows: 1 },
        { date: "2026-10-04", mac: 9, windows: 1 },
      ],
      versions: [],
      usage: [],
    };
    const { days } = recordSnapshot(previous, releases, "2026-10-04T10:00:00Z");
    expect(days).toHaveLength(2);
    expect(days.at(-1)?.mac).toBe(10);
  });

  it("stores the versions and the weekly usage next to the days, so the page draws them without asking GitHub", () => {
    const stats = recordSnapshot(null, releases, "2026-10-04T10:00:00Z");
    expect(stats.versions.map((v) => v.version)).toEqual(["v1.1.0", "v1.0.0"]);
    expect(stats.usage.map((w) => w.week)).toEqual(["2026-09-28"]);
  });

  it("skips drafts, which have no publication date and nobody can download", () => {
    const withDraft = [...releases, { tag_name: "v9.0.0", published_at: null, assets: [asset("Cuts-mac.dmg", 3)] }];
    expect(recordSnapshot(null, withDraft, "2026-10-04T10:00:00Z").days.at(-1)?.mac).toBe(10);
  });
});

const day = (date: string, mac: number, windows = 0): Day => ({ date, mac, windows });

describe("installsInLast", () => {
  it("counts the new installs of both systems in the last days asked for", () => {
    const days = [day("2026-10-20", 100, 10), day("2026-10-23", 110, 12), day("2026-10-27", 130, 15)];
    expect(installsInLast(days, 7)).toBe(35);
    expect(installsInLast(days, 4)).toBe(23);
  });

  it("counts from the first day when the history is shorter than asked", () => {
    expect(installsInLast([day("2026-10-25", 100), day("2026-10-27", 104)], 7)).toBe(4);
  });
});

describe("weeklyInstalls", () => {
  it("turns the cumulative curve into new installs per week and system starting on Monday, since a cumulative curve flattens a change of pace into a gentle bend", () => {
    const days = [day("2026-10-05", 10, 1), day("2026-10-11", 14, 3), day("2026-10-12", 15, 3), day("2026-10-18", 25, 8)];
    expect(weeklyInstalls(days)).toEqual([
      { week: "2026-10-05", mac: 14, windows: 3 },
      { week: "2026-10-12", mac: 11, windows: 5 },
    ]);
  });

  it("carries a week with no snapshot as zero instead of dropping it", () => {
    const days = [day("2026-10-05", 10), day("2026-10-19", 12)];
    expect(weeklyInstalls(days).map((w) => w.mac)).toEqual([10, 0, 2]);
  });
});

describe("fetchStats", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("reads the history the workflow stores on the releases repo, so the page updates without a redeploy", async () => {
    const stats = { days: [day("2026-10-30", 3)], versions: [], usage: [] };
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
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ days: [], versions: [], usage: [] })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await fetchStats()).toBeNull();
  });

  it("treats a history stored before versions were kept as missing, since its Windows figure counts updates and would read as installs", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ days: [{ date: "2026-10-30", mac: 3, windows: 9, linux: 2 }], macUpdates: [] })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await fetchStats()).toBeNull();
  });
});
