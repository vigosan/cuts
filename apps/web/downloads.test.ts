import { describe, expect, it } from "vitest";
import { formatDownloads } from "./downloads";

describe("formatDownloads", () => {
  it("reads naturally in each language, with thousands separators", () => {
    expect(formatDownloads(1234, "en", { one: "download", other: "downloads" })).toBe("1,234 downloads");
    expect(formatDownloads(1234, "es", { one: "descarga", other: "descargas" })).toBe("1234 descargas");
    expect(formatDownloads(12345, "es", { one: "descarga", other: "descargas" })).toBe("12.345 descargas");
    expect(formatDownloads(1, "en", { one: "download", other: "downloads" })).toBe("1 download");
  });
});
