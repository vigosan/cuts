import { describe, expect, it } from "vitest";
import { formatDownloads, totalDownloads } from "./downloads";

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
