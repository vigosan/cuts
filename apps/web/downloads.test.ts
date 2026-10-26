import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchDownloads, formatDownloads, totalDownloads } from "./downloads";

const asset = (name: string, download_count: number) => ({ name, download_count });

describe("totalDownloads", () => {
  it("adds up the installers of every OS across every release, so the count never resets when a new version ships", () => {
    const releases = [
      { assets: [asset("Cuts-mac.dmg", 2), asset("Cuts-windows.exe", 3), asset("Cuts-linux.AppImage", 2)] },
      { assets: [asset("Cuts-mac.dmg", 10), asset("Cuts-windows.exe", 1)] },
    ];
    expect(totalDownloads(releases)).toBe(18);
  });

  it("ignores update manifests and blockmaps, which the app fetches on its own and would inflate the count", () => {
    const releases = [{ assets: [asset("Cuts-mac.dmg", 4), asset("latest-mac.yml", 900), asset("Cuts-mac.dmg.blockmap", 50)] }];
    expect(totalDownloads(releases)).toBe(4);
  });
});

describe("formatDownloads", () => {
  it("reads naturally in each language, with thousands separators", () => {
    expect(formatDownloads(1234, "en", { one: "download", other: "downloads" })).toBe("1,234 downloads");
    expect(formatDownloads(1234, "es", { one: "descarga", other: "descargas" })).toBe("1234 descargas");
    expect(formatDownloads(12345, "es", { one: "descarga", other: "descargas" })).toBe("12.345 descargas");
    expect(formatDownloads(1, "en", { one: "download", other: "downloads" })).toBe("1 download");
  });
});

describe("fetchDownloads", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("authenticates with GITHUB_TOKEN, since Vercel's shared IPs exhaust the 60 anonymous requests an hour and the count disappears", async () => {
    vi.stubEnv("GITHUB_TOKEN", "secret");
    const fetch = vi.fn(async () => Response.json([{ assets: [asset("Cuts-mac.dmg", 3)] }]));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchDownloads()).toBe(3);
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: { Authorization: "Bearer secret" } }));
  });

  it("still asks anonymously without a token, so a local build works without one", async () => {
    vi.stubEnv("GITHUB_TOKEN", "");
    const fetch = vi.fn(async () => Response.json([]));
    vi.stubGlobal("fetch", fetch);
    expect(await fetchDownloads()).toBe(0);
    expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: {} }));
  });

  it("logs why GitHub refused, so a hidden count can be traced in the build log", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("rate limited", { status: 403 })));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await fetchDownloads()).toBeNull();
    expect(error).toHaveBeenCalledWith(expect.stringContaining("403"));
  });
});
